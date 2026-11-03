
from collections import defaultdict
from datetime import date, datetime, time, timedelta
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.auth.dependencies import get_current_user
from app.models.sale import Sale
from app.models.product import Product
from app.models.return_record import ReturnRecord
from app.models.return_item import ReturnItem
from app.models.business_settings import BusinessSettings
from app.models.business_subscription import BusinessSubscription
from app.models.subscription_plan import SubscriptionPlan


router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


SUPPORTED_CURRENCIES = {
    "NGN", "USD", "GBP", "EUR", "CAD", "AUD",
    "GHS", "KES", "ZAR", "INR", "JPY", "CHF"
}


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ==========================================
# CURRENCY HELPERS
# ==========================================

def get_currency_settings(db: Session, business_id: str):
    settings = (
        db.query(BusinessSettings)
        .filter(
            BusinessSettings.business_id == business_id
        )
        .first()
    )

    if not settings:
        raise HTTPException(
            status_code=409,
            detail=(
                "Business currency settings are missing. "
                "Please configure your business currency in Settings."
            )
        )

    base_currency = str(
        settings.base_currency or ""
    ).strip().upper()

    active_currency = str(
        settings.currency or ""
    ).strip().upper()

    if base_currency not in SUPPORTED_CURRENCIES:
        raise HTTPException(
            status_code=409,
            detail="The business base currency is invalid."
        )

    if active_currency not in SUPPORTED_CURRENCIES:
        raise HTTPException(
            status_code=409,
            detail="The active business currency is invalid."
        )

    try:
        rate = Decimal(str(settings.exchange_rate))

    except (InvalidOperation, TypeError, ValueError):
        raise HTTPException(
            status_code=409,
            detail="The business exchange rate is invalid."
        )

    if not rate.is_finite() or rate <= 0:
        raise HTTPException(
            status_code=409,
            detail="The business exchange rate must be greater than zero."
        )

    if (
        base_currency == active_currency
        and rate != Decimal("1")
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "The exchange rate must be 1 when "
                "the base and active currencies are the same."
            )
        )

    return settings, base_currency, active_currency, rate


def currency_digits(currency: str):
    return 0 if currency == "JPY" else 2


def convert_to_active(amount, rate: Decimal, currency: str):
    try:
        value = Decimal(str(amount or 0))

        if not value.is_finite():
            raise ValueError

        converted = value * rate

        precision = Decimal("1").scaleb(
            -currency_digits(currency)
        )

        rounded = converted.quantize(
            precision,
            rounding=ROUND_HALF_UP
        )

        return float(rounded)

    except (InvalidOperation, TypeError, ValueError, ArithmeticError):
        raise HTTPException(
            status_code=500,
            detail="Unable to convert dashboard amounts."
        )


# ==========================================
# GENERAL HELPERS
# ==========================================

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

    product = product_by_id.get(
        product_key(line.get("product_id"))
    )

    return as_float(product.cost) if product else 0.0


# ==========================================
# SUBSCRIPTION ACCESS
# ==========================================

def has_reports_access(db: Session, business_id: str) -> bool:
    """
    Advanced charts and insights require an active,
    unexpired subscription whose plan enables reports.

    Basic dashboard metrics remain available regardless.
    """

    subscription = (
        db.query(BusinessSubscription)
        .filter(
            BusinessSubscription.business_id == business_id
        )
        .first()
    )

    if not subscription or subscription.status != "active":
        return False

    now = datetime.utcnow()

    if not subscription.expires_at or subscription.expires_at <= now:
        subscription.status = "expired"
        db.commit()
        return False

    plan = (
        db.query(SubscriptionPlan)
        .filter(
            SubscriptionPlan.id == subscription.plan_id
        )
        .first()
    )

    return bool(
        plan and plan.reports_enabled
    )


# ==========================================
# DASHBOARD SUMMARY
# ==========================================

@router.get("/summary")
def get_dashboard_summary(
    selected_date: date = Query(default_factory=date.today),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    business_id = user.get("business_id")

    if not business_id:
        raise HTTPException(
            status_code=403,
            detail="Your account is not linked to a business."
        )

    # ======================================
    # LOAD CURRENCY SETTINGS
    # ======================================

    settings, base_currency, active_currency, exchange_rate = (
        get_currency_settings(db, business_id)
    )

    reports_enabled = has_reports_access(
        db,
        business_id
    )

    selected_start = datetime.combine(
        selected_date,
        time.min
    )

    selected_end = selected_start + timedelta(days=1)

    # ======================================
    # LOAD SALES
    # ======================================

    sales = (
        db.query(Sale)
        .filter(
            Sale.business_id == business_id
        )
        .order_by(Sale.date.asc())
        .all()
    )

    # ======================================
    # LOAD RETURNS
    # ======================================

    all_returns = (
        db.query(ReturnRecord)
        .filter(
            ReturnRecord.business_id == business_id
        )
        .order_by(ReturnRecord.created_at.asc())
        .all()
    )

    # Rejected returns must not affect financial metrics.
    returns = [
        record
        for record in all_returns
        if (
            record.refund_status or ""
        ).strip().upper() != "REJECTED"
    ]

    # ======================================
    # VALIDATE HISTORICAL CURRENCIES
    # ======================================

    for sale in sales:
        if sale.base_currency != base_currency:
            raise HTTPException(
                status_code=409,
                detail=(
                    f"Sale {sale.order_id} has a different base currency. "
                    "Please review its currency history."
                )
            )

    for record in returns:
        if record.base_currency != base_currency:
            raise HTTPException(
                status_code=409,
                detail=(
                    f"Return record {record.id} has a different base currency. "
                    "Please review its currency history."
                )
            )

    # ======================================
    # LOAD PRODUCTS
    # ======================================

    products = (
        db.query(Product)
        .filter(
            Product.business_id == business_id
        )
        .all()
    )

    product_by_id = {
        product_key(product.id): product
        for product in products
    }

    sale_by_id = {
        sale.id: sale
        for sale in sales
    }

    # ======================================
    # LOAD RETURN ITEMS
    # ======================================

    return_ids = [
        record.id for record in returns
    ]

    return_items = []

    if return_ids:
        return_items = (
            db.query(ReturnItem)
            .filter(
                ReturnItem.return_id.in_(return_ids)
            )
            .all()
        )

    items_by_return = defaultdict(list)

    for item in return_items:
        items_by_return[item.return_id].append(item)

    # ======================================
    # PRESERVE ORIGINAL SALE COSTS
    # ======================================

    original_cost_by_sale_product = {}

    for sale in sales:
        for line in sale_lines(sale.items):

            if not isinstance(line, dict):
                continue

            key = (
                sale.id,
                product_key(line.get("product_id"))
            )

            if key not in original_cost_by_sale_product:
                original_cost_by_sale_product[key] = (
                    get_line_cost(
                        line,
                        product_by_id
                    )
                )

    # ======================================
    # INITIALIZE ACCUMULATORS
    # ======================================

    returned_quantity_by_product = defaultdict(int)

    damaged_by_product = defaultdict(
        lambda: {
            "quantity": 0,
            "value": 0.0
        }
    )

    daily_net = defaultdict(float)
    monthly_net = defaultdict(float)

    net_revenue = 0.0
    total_profit = 0.0
    total_refunds = 0.0
    pending_refund_amount = 0.0
    pending_other_returns = 0
    damaged_return_value = 0.0

    order_count = 0
    selected_day_order_count = 0

    product_sales = defaultdict(
        lambda: {
            "name": "Unknown product",
            "quantity": 0,
            "revenue": 0.0,
            "profit": 0.0,
        }
    )

    # ==========================================
    # 1. SALES AND PROFIT
    # ==========================================

    for sale in sales:

        if not sale.date:
            continue

        sale_day = sale.date.date()

        day_key = sale_day.isoformat()
        month_key = sale_day.strftime("%Y-%m")

        # All stored sale amounts are in base currency.
        subtotal = as_float(sale.subtotal)

        net_revenue += subtotal
        order_count += 1

        daily_net[day_key] += subtotal
        monthly_net[month_key] += subtotal

        if selected_start <= sale.date < selected_end:
            selected_day_order_count += 1

        for line in sale_lines(sale.items):

            if not isinstance(line, dict):
                continue

            product_id = line.get("product_id")
            key = product_key(product_id)

            quantity = as_int(
                line.get("quantity")
            )

            unit_price = as_float(
                line.get("price")
            )

            if quantity <= 0:
                continue

            product = product_by_id.get(key)

            name = (
                line.get("name")
                or (product.name if product else None)
                or "Unknown product"
            )

            unit_cost = get_line_cost(
                line,
                product_by_id
            )

            line_revenue = unit_price * quantity

            line_profit = (
                unit_price - unit_cost
            ) * quantity

            total_profit += line_profit

            entry = product_sales[key]

            entry["name"] = name
            entry["quantity"] += quantity
            entry["revenue"] += line_revenue
            entry["profit"] += line_profit

    # ==========================================
    # 2. APPLY RETURNS
    # ==========================================

    for record in returns:

        refund_amount = as_float(
            record.refund_amount
        )

        total_refunds += refund_amount

        status = (
            record.refund_status or ""
        ).strip().upper()

        reason = (
            record.reason or ""
        ).strip().lower()

        if status == "PENDING":

            pending_refund_amount += refund_amount

            if reason != "damaged":
                pending_other_returns += 1

        return_date = (
            record.created_at.date()
            if record.created_at
            else None
        )

        original_sale = sale_by_id.get(
            record.sale_id
        )

        for item in items_by_return.get(record.id, []):

            quantity = as_int(item.quantity)

            if quantity <= 0:
                continue

            key = product_key(item.product_id)

            # Return item prices are stored in base currency.
            item_value = (
                as_float(item.unit_price) * quantity
            )

            condition = (
                item.item_condition or ""
            ).strip().lower()

            returned_quantity_by_product[key] += quantity

            if condition == "damaged":

                damaged_return_value += item_value

                damaged_entry = damaged_by_product[key]

                damaged_entry["quantity"] += quantity
                damaged_entry["value"] += item_value

            # Sales exclude tax; subtract returned merchandise value.
            net_revenue -= item_value

            # Returns affect daily/monthly figures on their return date.
            if return_date:

                day_key = return_date.isoformat()
                month_key = return_date.strftime("%Y-%m")

                daily_net[day_key] -= item_value
                monthly_net[month_key] -= item_value

            # Reverse returned merchandise revenue from profit.
            total_profit -= item_value

            original_cost = 0.0

            if original_sale:

                original_cost = original_cost_by_sale_product.get(
                    (
                        original_sale.id,
                        key
                    ),
                    0.0
                )

            # Recover original cost only for restocked resellable goods.
            if (
                condition == "resellable"
                and bool(item.restocked)
            ):
                total_profit += original_cost * quantity

            product_entry = product_sales.get(key)

            if product_entry:

                product_entry["revenue"] -= item_value
                product_entry["profit"] -= item_value

                if (
                    condition == "resellable"
                    and bool(item.restocked)
                ):
                    product_entry["profit"] += (
                        original_cost * quantity
                    )

    # ==========================================
    # 3. SELECTED-DAY METRICS
    # ==========================================

    selected_day_sales = daily_net.get(
        selected_date.isoformat(),
        0.0
    )

    average_order_value = (
        sum(
            as_float(sale.subtotal)
            for sale in sales
            if sale.date
        ) / order_count
        if order_count
        else 0.0
    )

    # Convert financial metrics into active currency.
    metrics = {
        "totalRevenue": convert_to_active(
            net_revenue,
            exchange_rate,
            active_currency
        ),

        "daySales": convert_to_active(
            selected_day_sales,
            exchange_rate,
            active_currency
        ),

        "totalProfit": convert_to_active(
            total_profit,
            exchange_rate,
            active_currency
        ),

        "averageOrderValue": convert_to_active(
            average_order_value,
            exchange_rate,
            active_currency
        ),

        "pendingOtherReturns": pending_other_returns,

        "pendingRefundAmount": convert_to_active(
            pending_refund_amount,
            exchange_rate,
            active_currency
        ),

        "damagedReturnedGoods": convert_to_active(
            damaged_return_value,
            exchange_rate,
            active_currency
        ),

        "totalRefunds": convert_to_active(
            total_refunds,
            exchange_rate,
            active_currency
        ),

        "totalOrders": order_count,
        "selectedDayOrders": selected_day_order_count,
    }

    # ==========================================
    # BASIC DASHBOARD RESPONSE
    # ==========================================

    if not reports_enabled:

        return {
            "selected_date": selected_date.isoformat(),
            "currency": active_currency,
            "base_currency": base_currency,
            "reports_enabled": False,
            "metrics": metrics,
            "weeklyData": [],
            "monthlyTrend": [],
            "damagedProducts": [],
            "topProducts": [],
            "peakHour": None,
        }

    # ==========================================
    # 4. PEAK SALES HOUR
    # ==========================================

    hourly_sales = defaultdict(float)

    for sale in sales:

        if sale.date and sale.date.date() == selected_date:

            hourly_sales[sale.date.hour] += as_float(
                sale.subtotal
            )

    peak_hour = (
        max(
            hourly_sales,
            key=hourly_sales.get
        )
        if (
            hourly_sales
            and max(hourly_sales.values()) > 0
        )
        else None
    )

    if peak_hour is None:

        peak_hour_label = "—"

    else:

        next_hour = (peak_hour + 1) % 24

        start_label = datetime.strptime(
            f"{peak_hour:02d}",
            "%H"
        ).strftime("%I:%M %p").lstrip("0")

        end_label = datetime.strptime(
            f"{next_hour:02d}",
            "%H"
        ).strftime("%I:%M %p").lstrip("0")

        peak_hour_label = (
            f"{start_label} – {end_label}"
        )

    # ==========================================
    # 5. SEVEN-DAY SALES CHART
    # ==========================================

    weekly_data = []

    for offset in range(6, -1, -1):

        chart_date = selected_date - timedelta(
            days=offset
        )

        key = chart_date.isoformat()

        converted_sales = convert_to_active(
            daily_net[key],
            exchange_rate,
            active_currency
        )

        weekly_data.append({
            "date": key,
            "day": chart_date.strftime("%a"),
            "sales": converted_sales,
            "revenue": converted_sales,
        })

    # ==========================================
    # 6. SIX-MONTH SALES CHART
    # ==========================================

    monthly_trend = []

    month_cursor = selected_date.replace(day=1)

    for offset in range(5, -1, -1):

        month_index = month_cursor.month - 1 - offset

        year = month_cursor.year + (
            month_index // 12
        )

        month = (month_index % 12) + 1

        month_date = date(
            year,
            month,
            1
        )

        key = month_date.strftime("%Y-%m")

        converted_sales = convert_to_active(
            monthly_net[key],
            exchange_rate,
            active_currency
        )

        monthly_trend.append({
            "month": month_date.strftime("%b"),
            "monthKey": key,
            "sales": converted_sales,
            "revenue": converted_sales,
        })

    # ==========================================
    # 7. TOP PRODUCTS
    # ==========================================

    top_products = []

    for key, entry in product_sales.items():

        sold_quantity = entry["quantity"]

        returned_quantity = (
            returned_quantity_by_product.get(key, 0)
        )

        top_products.append({

            "product_id": (
                int(key)
                if key and key.isdigit()
                else key
            ),

            "name": entry["name"],

            "quantity": max(
                0,
                sold_quantity - returned_quantity
            ),

            "revenue": convert_to_active(
                entry["revenue"],
                exchange_rate,
                active_currency
            ),

            "profit": convert_to_active(
                entry["profit"],
                exchange_rate,
                active_currency
            ),
        })

    top_products.sort(
        key=lambda item: (
            item["quantity"],
            item["revenue"]
        ),
        reverse=True
    )

    # ==========================================
    # 8. DAMAGED RETURNED PRODUCTS
    # ==========================================

    damaged_products = []

    for key, entry in damaged_by_product.items():

        product = product_by_id.get(key)

        damaged_products.append({

            "product_id": (
                int(key)
                if key and key.isdigit()
                else key
            ),

            "name": (
                product.name
                if product
                else "Unknown product"
            ),

            "quantity": entry["quantity"],

            "value": convert_to_active(
                entry["value"],
                exchange_rate,
                active_currency
            ),
        })

    damaged_products.sort(
        key=lambda item: item["value"],
        reverse=True
    )

    # ==========================================
    # 9. ADVANCED DASHBOARD RESPONSE
    # ==========================================

    return {
        "selected_date": selected_date.isoformat(),
        "currency": active_currency,
        "base_currency": base_currency,
        "reports_enabled": True,
        "metrics": metrics,
        "weeklyData": weekly_data,
        "monthlyTrend": monthly_trend,
        "damagedProducts": damaged_products[:6],
        "topProducts": top_products[:10],
        "peakHour": peak_hour_label,
    }
