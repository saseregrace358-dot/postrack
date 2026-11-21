
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from io import BytesIO, StringIO
import csv

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer,
    PageBreak,
    KeepTogether,
)

from app.database import SessionLocal
from app.auth.dependencies import get_current_user

from app.models.product import Product
from app.models.sale import Sale
from app.models.employee import Employee
from app.models.business_settings import BusinessSettings

from app.services.subscription_service import check_subscription_feature
from app.routes.dashboard import get_dashboard_summary


router = APIRouter(
    prefix="/export",
    tags=["Export"],
)


# ==========================================
# DATABASE
# ==========================================

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# ==========================================
# ACCESS CONTROL
# ==========================================

def check_export_access(user, db):
    business_id = user.get("business_id")

    if not business_id:
        raise HTTPException(
            status_code=403,
            detail="Your account is not linked to a business.",
        )

    check_subscription_feature(
        db,
        business_id,
        "export",
    )

    return business_id


# ==========================================
# CURRENCY
# ==========================================

def get_business_currency(db, business_id):
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
            detail="Business currency settings are missing.",
        )

    currency = str(
        settings.currency or ""
    ).strip().upper()

    supported = {
        "NGN", "USD", "GBP", "EUR", "CAD", "AUD",
        "GHS", "KES", "ZAR", "INR", "JPY", "CHF",
    }

    if currency not in supported:
        raise HTTPException(
            status_code=409,
            detail="The business currency is invalid.",
        )

    return currency


def format_money(value, currency):
    try:
        amount = Decimal(str(value or 0))

        if not amount.is_finite():
            amount = Decimal("0")

        digits = 0 if currency == "JPY" else 2

        return (
            f"{currency} "
            f"{amount:,.{digits}f}"
        )

    except (InvalidOperation, TypeError, ValueError):
        return f"{currency} 0"


def safe_value(value):
    if value is None:
        return ""

    if isinstance(value, (datetime, date)):
        return value.isoformat()

    return str(value)


# ==========================================
# CSV RESPONSE
# ==========================================

def create_csv_response(rows, filename):
    stream = StringIO()

    if rows:
        writer = csv.DictWriter(
            stream,
            fieldnames=list(rows[0].keys()),
            extrasaction="ignore",
        )

        writer.writeheader()
        writer.writerows(rows)

    else:
        writer = csv.writer(stream)
        writer.writerow(["No records found"])

    output = BytesIO(
        stream.getvalue().encode("utf-8-sig")
    )

    output.seek(0)

    return StreamingResponse(
        output,
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{filename}"'
            )
        },
    )


# ==========================================
# PDF HELPERS
# ==========================================

def get_pdf_styles():
    styles = getSampleStyleSheet()

    styles.add(
        ParagraphStyle(
            name="ReportTitle",
            parent=styles["Title"],
            fontSize=19,
            leading=24,
            textColor=colors.HexColor("#173B70"),
            alignment=TA_CENTER,
            spaceAfter=8,
        )
    )

    styles.add(
        ParagraphStyle(
            name="SectionTitle",
            parent=styles["Heading2"],
            fontSize=12,
            leading=16,
            textColor=colors.HexColor("#173B70"),
            spaceBefore=12,
            spaceAfter=7,
        )
    )

    styles.add(
        ParagraphStyle(
            name="SmallCell",
            parent=styles["BodyText"],
            fontSize=7,
            leading=9,
            wordWrap="CJK",
        )
    )

    styles.add(
        ParagraphStyle(
            name="SmallCellHeader",
            parent=styles["BodyText"],
            fontSize=7,
            leading=9,
            textColor=colors.white,
            fontName="Helvetica-Bold",
        )
    )

    return styles


def make_pdf_table(
    headers,
    rows,
    widths=None,
    repeat_rows=1,
):
    styles = get_pdf_styles()

    table_data = [
        [
            Paragraph(
                str(header),
                styles["SmallCellHeader"],
            )
            for header in headers
        ]
    ]

    for row in rows:
        table_data.append(
            [
                Paragraph(
                    safe_value(value),
                    styles["SmallCell"],
                )
                for value in row
            ]
        )

    if len(table_data) == 1:
        table_data.append(
            [
                Paragraph(
                    "No records found",
                    styles["SmallCell"],
                )
            ] + [
                Paragraph("", styles["SmallCell"])
                for _ in range(len(headers) - 1)
            ]
        )

    table = Table(
        table_data,
        colWidths=widths,
        repeatRows=repeat_rows,
        hAlign="LEFT",
    )

    table.setStyle(
        TableStyle([
            (
                "BACKGROUND",
                (0, 0),
                (-1, 0),
                colors.HexColor("#173B70"),
            ),
            (
                "TEXTCOLOR",
                (0, 0),
                (-1, 0),
                colors.white,
            ),
            (
                "GRID",
                (0, 0),
                (-1, -1),
                0.35,
                colors.HexColor("#D5DCE5"),
            ),
            (
                "ROWBACKGROUNDS",
                (0, 1),
                (-1, -1),
                [
                    colors.white,
                    colors.HexColor("#F4F7FB"),
                ],
            ),
            (
                "VALIGN",
                (0, 0),
                (-1, -1),
                "MIDDLE",
            ),
            (
                "LEFTPADDING",
                (0, 0),
                (-1, -1),
                5,
            ),
            (
                "RIGHTPADDING",
                (0, 0),
                (-1, -1),
                5,
            ),
            (
                "TOPPADDING",
                (0, 0),
                (-1, -1),
                6,
            ),
            (
                "BOTTOMPADDING",
                (0, 0),
                (-1, -1),
                6,
            ),
        ])
    )

    return table


def create_pdf_response(
    story,
    filename,
    landscape_page=False,
):
    buffer = BytesIO()

    page_size = (
        landscape(A4)
        if landscape_page
        else A4
    )

    doc = SimpleDocTemplate(
        buffer,
        pagesize=page_size,
        rightMargin=12 * mm,
        leftMargin=12 * mm,
        topMargin=14 * mm,
        bottomMargin=14 * mm,
        title=filename.replace(".pdf", ""),
    )

    doc.build(story)

    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{filename}"'
            )
        },
    )


def report_header(title, subtitle=None):
    styles = get_pdf_styles()

    story = [
        Paragraph(title, styles["ReportTitle"]),
    ]

    if subtitle:
        story.append(
            Paragraph(
                subtitle,
                styles["BodyText"],
            )
        )

    story.append(Spacer(1, 10))

    return story


# ==========================================
# PRODUCTS CSV
# ==========================================

@router.get("/products/csv")
def export_products_csv(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    business_id = check_export_access(user, db)
    currency = get_business_currency(db, business_id)

    products = (
        db.query(Product)
        .filter(
            Product.business_id == business_id
        )
        .order_by(Product.name.asc())
        .all()
    )

    rows = [
        {
            "Product ID": safe_value(product.id),
            "Name": safe_value(product.name),
            "Price": safe_value(product.price),
            "Currency": currency,
            "Cost": safe_value(product.cost),
            "Stock": safe_value(product.stock),
            "Category": safe_value(product.category),
        }
        for product in products
    ]

    return create_csv_response(
        rows,
        "products.csv",
    )


# ==========================================
# PRODUCTS PDF
# ==========================================

@router.get("/products/pdf")
def export_products_pdf(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    business_id = check_export_access(user, db)
    currency = get_business_currency(db, business_id)

    products = (
        db.query(Product)
        .filter(
            Product.business_id == business_id
        )
        .order_by(Product.name.asc())
        .all()
    )

    total_products = len(products)

    total_stock = sum(
        int(product.stock or 0)
        for product in products
    )

    inventory_value = sum(
        Decimal(str(product.price or 0))
        * Decimal(str(product.stock or 0))
        for product in products
    )

    low_stock = sum(
        1
        for product in products
        if 0 < (product.stock or 0) <= 5
    )

    out_of_stock = sum(
        1
        for product in products
        if (product.stock or 0) == 0
    )

    story = report_header(
        "DGTrack Products Report",
        f"Business currency: {currency}",
    )

    styles = get_pdf_styles()

    story.append(
        Paragraph(
            "Inventory Summary",
            styles["SectionTitle"],
        )
    )

    summary_rows = [
        ["Total Products", str(total_products)],
        ["Total Stock Units", str(total_stock)],
        ["Inventory Value", format_money(inventory_value, currency)],
        ["Low Stock Products", str(low_stock)],
        ["Out of Stock Products", str(out_of_stock)],
    ]

    story.append(
        make_pdf_table(
            ["Metric", "Value"],
            summary_rows,
            widths=[75 * mm, 75 * mm],
        )
    )

    story.append(
        Paragraph(
            "Product Details",
            styles["SectionTitle"],
        )
    )

    rows = [
        [
            product.name,
            format_money(product.price, currency),
            format_money(product.cost, currency),
            product.stock,
            product.category or "",
        ]
        for product in products
    ]

    story.append(
        make_pdf_table(
            ["Product", "Selling Price", "Cost", "Stock", "Category"],
            rows,
            widths=[
                65 * mm,
                30 * mm,
                30 * mm,
                20 * mm,
                40 * mm,
            ],
        )
    )

    return create_pdf_response(
        story,
        "products.pdf",
        landscape_page=True,
    )


# ==========================================
# SALES CSV
# ==========================================

@router.get("/sales/csv")
def export_sales_csv(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    business_id = check_export_access(user, db)

    sales = (
        db.query(Sale)
        .filter(
            Sale.business_id == business_id
        )
        .order_by(Sale.date.desc())
        .all()
    )

    rows = [
        {
            "Order ID": safe_value(sale.order_id),
            "Cashier": safe_value(sale.created_by_name),
            "Subtotal": safe_value(sale.subtotal),
            "Tax": safe_value(sale.tax),
            "Total": safe_value(sale.total),
            "Amount Paid": safe_value(sale.amountPaid),
            "Balance": safe_value(sale.balance),
            "Payment Method": safe_value(sale.paymentMethod),
            "Status": safe_value(sale.status),
            "Currency": safe_value(sale.currency_at_sale),
            "Date": safe_value(sale.date),
        }
        for sale in sales
    ]

    return create_csv_response(
        rows,
        "sales.csv",
    )


# ==========================================
# SALES PDF
# ==========================================

@router.get("/sales/pdf")
def export_sales_pdf(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    business_id = check_export_access(user, db)

    sales = (
        db.query(Sale)
        .filter(
            Sale.business_id == business_id
        )
        .order_by(Sale.date.desc())
        .all()
    )

    story = report_header(
        "DGTrack Sales Report",
        f"Generated: {datetime.now().strftime('%d %B %Y, %I:%M %p')}",
    )

    styles = get_pdf_styles()

    total_sales = len(sales)

    total_revenue = sum(
        Decimal(str(sale.total or 0))
        for sale in sales
    )

    total_paid = sum(
        Decimal(str(sale.amountPaid or 0))
        for sale in sales
    )

    total_balance = sum(
        Decimal(str(sale.balance or 0))
        for sale in sales
    )

    story.append(
        Paragraph(
            "Sales Summary",
            styles["SectionTitle"],
        )
    )

    summary_rows = [
        ["Total Orders", str(total_sales)],
        ["Total Sales Amount", str(total_revenue)],
        ["Total Amount Paid", str(total_paid)],
        ["Total Outstanding Balance", str(total_balance)],
    ]

    story.append(
        make_pdf_table(
            ["Metric", "Value"],
            summary_rows,
            widths=[80 * mm, 80 * mm],
        )
    )

    story.append(
        Paragraph(
            "Sales Transactions",
            styles["SectionTitle"],
        )
    )

    rows = [
        [
            sale.order_id,
            sale.created_by_name or "",
            sale.total,
            sale.amountPaid,
            sale.balance,
            sale.currency_at_sale or "",
            sale.status or "",
            safe_value(sale.date),
        ]
        for sale in sales
    ]

    story.append(
        make_pdf_table(
            [
                "Order ID",
                "Cashier",
                "Total",
                "Paid",
                "Balance",
                "Currency",
                "Status",
                "Date",
            ],
            rows,
            widths=[
                34 * mm,
                32 * mm,
                23 * mm,
                23 * mm,
                23 * mm,
                20 * mm,
                22 * mm,
                35 * mm,
            ],
        )
    )

    return create_pdf_response(
        story,
        "sales.pdf",
        landscape_page=True,
    )


# ==========================================
# STAFF CSV
# ==========================================

@router.get("/staff/csv")
def export_staff_csv(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    business_id = check_export_access(user, db)

    employees = (
        db.query(Employee)
        .filter(
            Employee.business_id == business_id
        )
        .order_by(Employee.full_name.asc())
        .all()
    )

    rows = [
        {
            "Employee ID": safe_value(employee.id),
            "Full Name": safe_value(employee.full_name),
            "Email": safe_value(employee.email),
            "Permissions": safe_value(employee.permissions),
        }
        for employee in employees
    ]

    return create_csv_response(
        rows,
        "staff.csv",
    )


# ==========================================
# STAFF PDF
# ==========================================

@router.get("/staff/pdf")
def export_staff_pdf(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    business_id = check_export_access(user, db)

    employees = (
        db.query(Employee)
        .filter(
            Employee.business_id == business_id
        )
        .order_by(Employee.full_name.asc())
        .all()
    )

    story = report_header(
        "DGTrack Staff Report",
        f"Total employees: {len(employees)}",
    )

    rows = [
        [
            employee.id,
            employee.full_name,
            employee.email,
            str(employee.permissions or ""),
        ]
        for employee in employees
    ]

    story.append(
        make_pdf_table(
            [
                "Employee ID",
                "Full Name",
                "Email",
                "Permissions",
            ],
            rows,
            widths=[
                35 * mm,
                45 * mm,
                65 * mm,
                55 * mm,
            ],
        )
    )

    return create_pdf_response(
        story,
        "staff.pdf",
        landscape_page=True,
    )


# ==========================================
# DASHBOARD PDF
# ==========================================

@router.get("/dashboard/pdf")
def export_dashboard_pdf(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    business_id = check_export_access(user, db)

    # Reuse the existing dashboard endpoint's calculations.
    # This avoids maintaining a separate financial calculation.
    dashboard = get_dashboard_summary(
        selected_date=date.today(),
        db=db,
        user=user,
    )

    currency = dashboard["currency"]
    metrics = dashboard["metrics"]

    reports_enabled = dashboard["reports_enabled"]

    story = report_header(
        "DGTrack Dashboard Report",
        (
            f"Selected date: {dashboard['selected_date']} "
            f"| Currency: {currency}"
        ),
    )

    styles = get_pdf_styles()

    # --------------------------------------
    # DASHBOARD METRIC CARDS
    # --------------------------------------

    story.append(
        Paragraph(
            "Business Performance",
            styles["SectionTitle"],
        )
    )

    metric_rows = [
        ["Metric", "Value"],
        [
            "Total Revenue",
            format_money(metrics["totalRevenue"], currency),
        ],
        [
            "Sales for Selected Date",
            format_money(metrics["daySales"], currency),
        ],
        [
            "Total Profit",
            format_money(metrics["totalProfit"], currency),
        ],
        [
            "Average Order Value",
            format_money(metrics["averageOrderValue"], currency),
        ],
        [
            "Total Orders",
            str(metrics["totalOrders"]),
        ],
        [
            "Orders on Selected Date",
            str(metrics["selectedDayOrders"]),
        ],
        [
            "Pending Other Returns",
            str(metrics["pendingOtherReturns"]),
        ],
        [
            "Pending Refund Amount",
            format_money(metrics["pendingRefundAmount"], currency),
        ],
        [
            "Damaged Returned Goods",
            format_money(metrics["damagedReturnedGoods"], currency),
        ],
        [
            "Total Refunds",
            format_money(metrics["totalRefunds"], currency),
        ],
    ]

    story.append(
        make_pdf_table(
            metric_rows[0],
            metric_rows[1:],
            widths=[90 * mm, 75 * mm],
        )
    )

    # --------------------------------------
    # ADVANCED REPORTS
    # --------------------------------------

    if not reports_enabled:
        story.append(Spacer(1, 12))

        story.append(
            Paragraph(
                "Advanced reports and insights are not enabled "
                "for the current subscription. This report contains "
                "the basic dashboard metrics only.",
                styles["BodyText"],
            )
        )

        return create_pdf_response(
            story,
            "dashboard.pdf",
        )

    # --------------------------------------
    # SALES INSIGHTS
    # --------------------------------------

    story.append(
        Paragraph(
            "Sales Insights",
            styles["SectionTitle"],
        )
    )

    story.append(
        make_pdf_table(
            ["Insight", "Value"],
            [
                [
                    "Peak Sales Hour",
                    dashboard.get("peakHour") or "—",
                ],
            ],
            widths=[75 * mm, 75 * mm],
        )
    )

    # --------------------------------------
    # WEEKLY SALES
    # --------------------------------------

    story.append(
        Paragraph(
            "Sales by Day",
            styles["SectionTitle"],
        )
    )

    weekly_rows = [
        [
            item["date"],
            item["day"],
            format_money(item["sales"], currency),
        ]
        for item in dashboard.get("weeklyData", [])
    ]

    story.append(
        make_pdf_table(
            ["Date", "Day", "Sales"],
            weekly_rows,
            widths=[
                55 * mm,
                45 * mm,
                60 * mm,
            ],
        )
    )

    # --------------------------------------
    # MONTHLY SALES
    # --------------------------------------

    story.append(
        Paragraph(
            "Monthly Sales Trend",
            styles["SectionTitle"],
        )
    )

    monthly_rows = [
        [
            item["month"],
            item["monthKey"],
            format_money(item["sales"], currency),
        ]
        for item in dashboard.get("monthlyTrend", [])
    ]

    story.append(
        make_pdf_table(
            ["Month", "Month Key", "Sales"],
            monthly_rows,
            widths=[
                50 * mm,
                55 * mm,
                60 * mm,
            ],
        )
    )

    # --------------------------------------
    # TOP SELLING PRODUCTS
    # --------------------------------------

    story.append(
        Paragraph(
            "Top Selling Products",
            styles["SectionTitle"],
        )
    )

    top_product_rows = [
        [
            item["name"],
            item["quantity"],
            format_money(item["revenue"], currency),
            format_money(item["profit"], currency),
        ]
        for item in dashboard.get("topProducts", [])
    ]

    story.append(
        make_pdf_table(
            [
                "Product",
                "Quantity Sold",
                "Revenue",
                "Profit",
            ],
            top_product_rows,
            widths=[
                65 * mm,
                30 * mm,
                40 * mm,
                40 * mm,
            ],
        )
    )

    # --------------------------------------
    # DAMAGED RETURNED PRODUCTS
    # --------------------------------------

    story.append(
        Paragraph(
            "Damaged Returned Goods",
            styles["SectionTitle"],
        )
    )

    damaged_rows = [
        [
            item["name"],
            item["quantity"],
            format_money(item["value"], currency),
        ]
        for item in dashboard.get("damagedProducts", [])
    ]

    story.append(
        make_pdf_table(
            [
                "Product",
                "Quantity",
                "Value",
            ],
            damaged_rows,
            widths=[
                70 * mm,
                35 * mm,
                60 * mm,
            ],
        )
    )

    return create_pdf_response(
        story,
        "dashboard.pdf",
        landscape_page=True,
    )
