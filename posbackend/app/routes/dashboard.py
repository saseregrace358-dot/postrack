
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
    """Use the saved cost snapshot; estimate only for legacy sales."""
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

    # Include only sales recorded before the end of the selected date.
    sales = (
        db.query(Sale)
        .filter(
            Sale.business_id == business_id,
            Sale.date < selected_end,
        )
        .order_by(Sale.date.asc())
        .all()
    )

    # Returns are reported on the date they were recorded, not the
    # original sale date. Exclude records explicitly rejected.
    all_returns = (
        db.query(ReturnRecord)
        .filter(
            ReturnRecord.business_id == business_id,
            ReturnRecord.created_at < selected_end,
        )
        .order_by(ReturnRecord.created_at.asc())
        .all()
    )

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

    # Build the original cost lookup from each sale's saved item snapshot.
    original_cost_by_sale_product = {}

    for sale in sales:
        for line in sale_lines(sale.items):
            if not isinstance(line, dict):
                continue

            key = (
                sale.id,
                product_key(line.get("product_id")),
            )

            # Keep the first matching saved cost for this sale/product.
            if key not in original_cost_by_sale_product:
                original_cost_by_sale_product[key] = get_line_cost(
                    line, product_by_id
                )

    # Return-related accumulators.
    returned_quantity_by_product = defaultdict(int)
    damaged_by_product = defaultdict(
        lambda: {"quantity": 0, "value": 0.0}
    )

    # Daily and monthly sales are net of merchandise value returned
    # on that same day/month. Product sales exclude sales tax.
    daily_gross = defaultdict(float)
    daily_net = defaultdict(float)
    monthly_gross = defaultdict(float)
    monthly_net = defaultdict(float)

    # Financial totals through the selected date.
    gross_sales = 0.0
    net_revenue = 0.0
    total_profit = 0.0
    total_refunds = 0.0
    pending_refund_amount = 0.0
    pending_other_returns = 0
    damaged_return_value = 0.0
    order_count = 0
    selected_day_order_count = 0

    # Per-product sales accumulators.
    product_sales = defaultdict(
        lambda: {
            "name": "Unknown product",
            "quantity": 0,
            "revenue": 0.0,
            "profit": 0.0,
        }
    )

    # First calculate sales and profit from the sale records.
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

    # Apply each return once. Merchandise value is deducted from sales
    # on the return date. Actual refund totals are tracked separately
    # using ReturnRecord.refund_amount, which may include tax.
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

            # Revenue excludes sales tax, so deduct the returned
            # merchandise value, not the tax-inclusive refund amount.
            net_revenue -= item_value

            if return_date:
                day_key = return_date.isoformat()
                month_key = return_date.strftime("%Y-%m")

                daily_net[day_key] -= item_value
                monthly_net[month_key] -= item_value

            # Reverse the sale's merchandise profit for returned items.
            total_profit -= item_value

            # If the item is resellable and restocked, reverse its
            # original cost of goods sold. Damaged goods get no recovery.
            if condition == "resellable":
                original_sale = sale_by_id.get(record.sale_id)

                original_cost = 0.0
                if original_sale:
                    original_cost = original_cost_by_sale_product.get(
                        (original_sale.id, key), 0.0
                    )

                total_profit += original_cost * quantity

            # Adjust product-level revenue/profit for this return.
            product_entry = product_sales.get(key)
            if product_entry:
                product_entry["revenue"] -= item_value
                product_entry["profit"] -= item_value

                if condition == "resellable":
                    original_sale = sale_by_id.get(record.sale_id)
                    original_cost = (
                        original_cost_by_sale_product.get(
                            (original_sale.id, key), 0.0
                        )
                        if original_sale
                        else 0.0
                    )
                    product_entry["profit"] += original_cost * quantity

    # Net sales for the selected date include refunds recorded that day.
    selected_day_sales = daily_net.get(selected_date.isoformat(), 0.0)

    average_order_value = (
        gross_sales / order_count if order_count else 0.0
    )

    # Seven calendar days ending on the selected date.
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

    # Six months ending with the selected date's month.
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
    }
