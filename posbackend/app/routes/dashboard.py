
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


def parse_datetime(value):
    if not value:
        return None

    if isinstance(value, datetime):
        return value

    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(
                tzinfo=None
            )
        except ValueError:
            return None

    return None


def parse_sale_items(items):
    return items if isinstance(items, list) else []


@router.get("/summary")
def get_dashboard_summary(
    selected_date: date = Query(default_factory=date.today),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    business_id = user["business_id"]

    # Use an exclusive end boundary so all times on the selected date
    # are included. Database datetimes are treated as UTC-naive here.
    selected_start = datetime.combine(selected_date, time.min)
    selected_end = selected_start + timedelta(days=1)

    # Only load records belonging to this business and recorded
    # on or before the selected date.
    sales = (
        db.query(Sale)
        .filter(
            Sale.business_id == business_id,
            Sale.date < selected_end,
        )
        .order_by(Sale.date.asc())
        .all()
    )

    returns = (
        db.query(ReturnRecord)
        .filter(
            ReturnRecord.business_id == business_id,
            ReturnRecord.created_at < selected_end,
        )
        .order_by(ReturnRecord.created_at.asc())
        .all()
    )

    products = (
        db.query(Product)
        .filter(Product.business_id == business_id)
        .all()
    )

    product_by_id = {product.id: product for product in products}

    # Fetch all return items in one query rather than querying once
    # for every return record.
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

    # Build a lookup of returned quantities by product.
    returned_quantity_by_product = defaultdict(int)
    damaged_by_product = defaultdict(
        lambda: {"quantity": 0, "value": 0.0}
    )

    total_refunds = 0.0
    pending_refund_amount = 0.0
    pending_other_returns = 0
    damaged_return_value = 0.0

    for record in returns:
        refund_amount = as_float(record.refund_amount)
        total_refunds += refund_amount

        if (record.refund_status or "").upper() == "PENDING":
            pending_refund_amount += refund_amount

            reason = (record.reason or "").strip().lower()
            if reason != "damaged":
                pending_other_returns += 1

        for item in items_by_return.get(record.id, []):
            quantity = as_int(item.quantity)
            product_id = item.product_id

            returned_quantity_by_product[product_id] += quantity

            condition = (item.item_condition or "").strip().lower()
            item_value = as_float(item.unit_price) * quantity

            if condition == "damaged":
                damaged_return_value += item_value

                entry = damaged_by_product[product_id]
                entry["quantity"] += quantity
                entry["value"] += item_value

    # Metrics and chart accumulators.
    gross_sales_subtotal = 0.0
    net_revenue = 0.0
    total_profit = 0.0
    selected_day_sales = 0.0
    selected_day_order_count = 0
    order_count = 0

    daily_gross = defaultdict(float)
    daily_net = defaultdict(float)
    monthly_gross = defaultdict(float)
    monthly_net = defaultdict(float)

    product_sales = defaultdict(
        lambda: {"name": "Unknown product", "quantity": 0, "revenue": 0.0}
    )

    # Profit uses saved cost snapshots where available. Older sales
    # fall back to the current inventory cost.
    for sale in sales:
        sale_date = sale.date.date() if sale.date else None
        if not sale_date:
            continue

        subtotal = as_float(sale.subtotal)
        tax = as_float(sale.tax)
        sale_total = as_float(sale.total)

        # Revenue excludes sales tax. Tax collected is not business revenue.
        gross_sales_subtotal += subtotal
        net_revenue += subtotal
        order_count += 1

        day_key = sale_date.isoformat()
        month_key = sale_date.strftime("%Y-%m")

        daily_gross[day_key] += subtotal
        daily_net[day_key] += subtotal
        monthly_gross[month_key] += subtotal
        monthly_net[month_key] += subtotal

        if selected_start <= sale.date < selected_end:
            selected_day_sales += subtotal
            selected_day_order_count += 1

        for line in parse_sale_items(sale.items):
            if not isinstance(line, dict):
                continue

            product_id = line.get("product_id")
            quantity = as_int(line.get("quantity"))
            unit_price = as_float(line.get("price"))

            if quantity <= 0:
                continue

            product = product_by_id.get(product_id)

            # New sale records will contain the cost snapshot.
            # Legacy records use current inventory cost as an estimate.
            if line.get("cost") is not None:
                unit_cost = as_float(line.get("cost"))
            else:
                unit_cost = as_float(product.cost) if product else 0.0

            line_revenue = unit_price * quantity
            total_profit += line_revenue - (unit_cost * quantity)

            name = (
                line.get("name")
                or (product.name if product else None)
                or "Unknown product"
            )

            product_sales[product_id]["name"] = name
            product_sales[product_id]["quantity"] += quantity
            product_sales[product_id]["revenue"] += line_revenue

    # Deduct the returned merchandise value from revenue. The return
    # item unit price excludes the allocated sales tax.
    for record in returns:
        return_date = record.created_at.date() if record.created_at else None
        if not return_date:
            continue

        for item in items_by_return.get(record.id, []):
            quantity = as_int(item.quantity)
            item_value = as_float(item.unit_price) * quantity

            net_revenue -= item_value
            total_profit -= item_value

            day_key = return_date.isoformat()
            month_key = return_date.strftime("%Y-%m")

            daily_net[day_key] -= item_value
            monthly_net[month_key] -= item_value

            # Resellable returned goods go back into stock, so reverse
            # their original cost of goods sold. Damaged items do not.
            if (item.item_condition or "").strip().lower() == "resellable":
                product = product_by_id.get(item.product_id)

                original_sale = next(
                    (s for s in sales if s.id == record.sale_id),
                    None,
                )

                original_cost = 0.0
                if original_sale:
                    for line in parse_sale_items(original_sale.items):
                        if str(line.get("product_id")) == str(item.product_id):
                            original_cost = as_float(
                                line.get("cost")
                                if line.get("cost") is not None
                                else (product.cost if product else 0)
                            )
                            break

                total_profit += original_cost * quantity

    # Average order value uses net merchandise revenue and sales
    # through the selected date, excluding sales tax.
    selected_day_sales = daily_net.get(
    selected_date.isoformat(),
    0.0,
)
    average_order_value = (
        net_revenue / order_count if order_count else 0.0
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
    for product_id, entry in product_sales.items():
        sold = entry["quantity"]
        returned = returned_quantity_by_product.get(product_id, 0)
        net_quantity = max(0, sold - returned)

        top_products.append({
            "product_id": product_id,
            "name": entry["name"],
            "quantity": net_quantity,
            "revenue": round(entry["revenue"], 2),
        })

    top_products.sort(
        key=lambda item: (item["quantity"], item["revenue"]),
        reverse=True,
    )

    damaged_products = []
    for product_id, entry in damaged_by_product.items():
        product = product_by_id.get(product_id)

        damaged_products.append({
            "product_id": product_id,
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
