
from collections import defaultdict
from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.auth.dependencies import get_current_user
from app.models.sale import Sale
from app.models.product import Product
from app.models.return_record import ReturnRecord
from app.models.return_item import ReturnItem


router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def as_float(value):
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def as_int(value):
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def product_key(product_id):
    return str(product_id) if product_id is not None else None


def sale_lines(items):
    return items if isinstance(items, list) else []


def get_line_cost(line, product_by_id):
    """
    Prefer the cost saved with the original sale.
    Fall back to the current product cost for legacy sales.
    """
    if line.get("cost") is not None:
        return as_float(line["cost"])

    product = product_by_id.get(product_key(line.get("product_id")))
    return as_float(product.cost) if product else 0.0


@router.get("/summary")
def get_dashboard_summary(
    selected_date: date = Query(default_factory=date.today),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    business_id = user["business_id"]

    selected_start = datetime.combine(selected_date, time.min)
    selected_end = selected_start + timedelta(days=1)

    # Load ALL sales for this business.
    # Total revenue, profit, and order count are cumulative.
    sales = (
        db.query(Sale)
        .filter(Sale.business_id == business_id)
        .order_by(Sale.date.asc())
        .all()
    )

    # Load ALL returns for this business.
    # Returns are attributed to the date they were recorded.
    all_returns = (
        db.query(ReturnRecord)
        .filter(ReturnRecord.business_id == business_id)
        .order_by(ReturnRecord.created_at.asc())
        .all()
    )

    # Rejected returns must not affect financial metrics.
    returns = [
        record
        for record in all_returns
        if (record.refund_status or "").strip().upper() != "REJECTED"
    ]

    products = (
        db.query(Product)
        .filter(Product.business_id == business_id)
        .all()
    )

    product_by_id = {
        product_key(product.id): product
        for product in products
    }

    sale_by_id = {sale.id: sale for sale in sales}

    return_ids = [record.id for record in returns]
    return_items = []

    if return_ids:
        return_items = (
            db.query(ReturnItem)
            .filter(ReturnItem.return_id.in_(return_ids))
            .all()
        )

    items_by_return = defaultdict(list)

    for item in return_items:
        items_by_return[item.return_id].append(item)

    # Preserve original item costs from each sale.
    original_cost_by_sale_product = {}

    for sale in sales:
        for line in sale_lines(sale.items):
            if not isinstance(line, dict):
                continue

            key = (
                sale.id,
                product_key(line.get("product_id")),
            )

            if key not in original_cost_by_sale_product:
                original_cost_by_sale_product[key] = get_line_cost(
                    line,
                    product_by_id,
                )

    # Return accumulators.
    returned_quantity_by_product = defaultdict(int)
    damaged_by_product = defaultdict(
        lambda: {"quantity": 0, "value": 0.0}
    )


    # Daily and monthly figures are independent of cumulative profit.
    daily_gross = defaultdict(float)
    daily_net = defaultdict(float)
    monthly_gross = defaultdict(float)
    monthly_net = defaultdict(float)

    # Cumulative financial totals.
    gross_sales = 0.0
    net_revenue = 0.0
    total_profit = 0.0
    total_refunds = 0.0
    pending_refund_amount = 0.0
    pending_other_returns = 0
    damaged_return_value = 0.0

    order_count = 0
    selected_day_order_count = 0

    # Per-product totals.
    product_sales = defaultdict(
        lambda: {
            "name": "Unknown product",
            "quantity": 0,
            "revenue": 0.0,
            "profit": 0.0,
        }
    )

    # ---------------------------------------------------------
    # 1. Calculate cumulative sales and profit from ALL sales.
    # ---------------------------------------------------------
    for sale in sales:
        if not sale.date:
            continue

        sale_day = sale.date.date()
        day_key = sale_day.isoformat()
        month_key = sale_day.strftime("%Y-%m")

        subtotal = as_float(sale.subtotal)

        gross_sales += subtotal
        net_revenue += subtotal
        order_count += 1

        daily_gross[day_key] += subtotal
        daily_net[day_key] += subtotal
        monthly_gross[month_key] += subtotal
        monthly_net[month_key] += subtotal

        # Only this count depends on the selected date.
        if selected_start <= sale.date < selected_end:
            selected_day_order_count += 1

        for line in sale_lines(sale.items):
            if not isinstance(line, dict):
                continue

            product_id = line.get("product_id")
            key = product_key(product_id)

            quantity = as_int(line.get("quantity"))
            unit_price = as_float(line.get("price"))

            if quantity <= 0:
                continue

            product = product_by_id.get(key)

            name = (
                line.get("name")
                or (product.name if product else None)
                or "Unknown product"
            )

            unit_cost = get_line_cost(line, product_by_id)

            line_revenue = unit_price * quantity
            line_profit = (unit_price - unit_cost) * quantity

            total_profit += line_profit

            entry = product_sales[key]
            entry["name"] = name
            entry["quantity"] += quantity
            entry["revenue"] += line_revenue
            entry["profit"] += line_profit

    # ---------------------------------------------------------
    # 2. Apply ALL valid returns to cumulative financial totals.
    #    Daily/monthly sales are adjusted on the return date.
    # ---------------------------------------------------------
    for record in returns:
        refund_amount = as_float(record.refund_amount)
        total_refunds += refund_amount

        status = (record.refund_status or "").strip().upper()
        reason = (record.reason or "").strip().lower()

        if status == "PENDING":
            pending_refund_amount += refund_amount

            if reason != "damaged":
                pending_other_returns += 1

        return_date = (
            record.created_at.date()
            if record.created_at
            else None
        )

        original_sale = sale_by_id.get(record.sale_id)

        for item in items_by_return.get(record.id, []):
            quantity = as_int(item.quantity)

            if quantity <= 0:
                continue

            key = product_key(item.product_id)
            item_value = as_float(item.unit_price) * quantity

            condition = (
                (item.item_condition or "").strip().lower()
            )

            returned_quantity_by_product[key] += quantity

            if condition == "damaged":
                damaged_return_value += item_value

                damaged_entry = damaged_by_product[key]
                damaged_entry["quantity"] += quantity
                damaged_entry["value"] += item_value

            # Sales/revenue exclude tax, so subtract merchandise value.
            net_revenue -= item_value

            # Each day stands alone. A return on a no-sales day can
            # produce negative daily net sales; it is not carried into
            # the next day's daily sales.
            if return_date:
                day_key = return_date.isoformat()
                month_key = return_date.strftime("%Y-%m")

                daily_net[day_key] -= item_value
                monthly_net[month_key] -= item_value

            # Reverse the returned item's original merchandise revenue
            # from cumulative profit.
            total_profit -= item_value

            original_cost = 0.0

            if original_sale:
                original_cost = original_cost_by_sale_product.get(
                    (original_sale.id, key),
                    0.0,
                )

            # Resellable stock only recovers its original cost when it
            # has actually been restocked.
            if condition == "resellable" and bool(item.restocked):
                total_profit += original_cost * quantity

            # Update product-level metrics.
            product_entry = product_sales.get(key)

            if product_entry:
                product_entry["revenue"] -= item_value
                product_entry["profit"] -= item_value

                if condition == "resellable" and bool(item.restocked):
                    product_entry["profit"] += original_cost * quantity

        # ---------------------------------------------------------
    # Peak sales hour for the selected date.
    # ---------------------------------------------------------
    hourly_sales = defaultdict(float)

    for sale in sales:
        if not sale.date:
            continue

        if sale.date.date() != selected_date:
            continue

        hourly_sales[sale.date.hour] += as_float(sale.subtotal)

    peak_hour = (
        max(hourly_sales, key=hourly_sales.get)
        if hourly_sales and max(hourly_sales.values()) > 0
        else None
    )

    if peak_hour is None:
        peak_hour_label = "—"
    else:
        next_hour = (peak_hour + 1) % 24

        start_label = datetime.strptime(
            f"{peak_hour:02d}", "%H"
        ).strftime("%I:%M %p").lstrip("0")

        end_label = datetime.strptime(
            f"{next_hour:02d}", "%H"
        ).strftime("%I:%M %p").lstrip("0")

        peak_hour_label = f"{start_label} – {end_label}"

    # ---------------------------------------------------------
    # 3. Selected-day metrics.
    # ---------------------------------------------------------
    selected_day_sales = daily_net.get(
        selected_date.isoformat(),
        0.0,
    )

    average_order_value = (
        gross_sales / order_count
        if order_count
        else 0.0
    )

    # ---------------------------------------------------------
    # 4. Seven-day chart ending on selected_date.
    # ---------------------------------------------------------
    weekly_data = []

    for offset in range(6, -1, -1):
        chart_date = selected_date - timedelta(days=offset)
        key = chart_date.isoformat()

        weekly_data.append({
            "date": key,
            "day": chart_date.strftime("%a"),
            "sales": round(daily_net[key], 2),
            "revenue": round(daily_net[key], 2),
        })

    # ---------------------------------------------------------
    # 5. Six-month chart ending in selected_date's month.
    # ---------------------------------------------------------
    monthly_trend = []
    month_cursor = selected_date.replace(day=1)

    for offset in range(5, -1, -1):
        month_index = month_cursor.month - 1 - offset
        year = month_cursor.year + (month_index // 12)
        month = (month_index % 12) + 1

        month_date = date(year, month, 1)
        key = month_date.strftime("%Y-%m")

        monthly_trend.append({
            "month": month_date.strftime("%b"),
            "monthKey": key,
            "sales": round(monthly_net[key], 2),
            "revenue": round(monthly_net[key], 2),
        })

    # ---------------------------------------------------------
    # 6. Top products, adjusted for returns.
    # ---------------------------------------------------------
    top_products = []

    for key, entry in product_sales.items():
        sold_quantity = entry["quantity"]
        returned_quantity = returned_quantity_by_product.get(key, 0)

        top_products.append({
            "product_id": (
                int(key) if key and key.isdigit() else key
            ),
            "name": entry["name"],
            "quantity": max(0, sold_quantity - returned_quantity),
            "revenue": round(entry["revenue"], 2),
            "profit": round(entry["profit"], 2),
        })

    top_products.sort(
        key=lambda item: (item["quantity"], item["revenue"]),
        reverse=True,
    )

    # ---------------------------------------------------------
    # 7. Damaged returned products.
    # ---------------------------------------------------------
    damaged_products = []

    for key, entry in damaged_by_product.items():
        product = product_by_id.get(key)

        damaged_products.append({
            "product_id": (
                int(key) if key and key.isdigit() else key
            ),
            "name": product.name if product else "Unknown product",
            "quantity": entry["quantity"],
            "value": round(entry["value"], 2),
        })

    damaged_products.sort(
        key=lambda item: item["value"],
        reverse=True,
    )

    # ---------------------------------------------------------
    # 8. Response: preserve the existing frontend field names.
    # ---------------------------------------------------------
    return {
        "selected_date": selected_date.isoformat(),
        "metrics": {
            "totalRevenue": round(net_revenue, 2),
            "daySales": round(selected_day_sales, 2),
            "totalProfit": round(total_profit, 2),
            "averageOrderValue": round(average_order_value, 2),
            "pendingOtherReturns": pending_other_returns,
            "pendingRefundAmount": round(pending_refund_amount, 2),
            "damagedReturnedGoods": round(damaged_return_value, 2),
            "totalRefunds": round(total_refunds, 2),
            "totalOrders": order_count,
            "selectedDayOrders": selected_day_order_count,
        },
        "weeklyData": weekly_data,
        "monthlyTrend": monthly_trend,
        "damagedProducts": damaged_products[:6],
        "topProducts": top_products[:10],
        "peakHour": peak_hour_label,
    }
