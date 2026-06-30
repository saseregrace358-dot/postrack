from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from io import BytesIO
import pandas as pd

from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet

from app.database import SessionLocal
from app.models.product import Product
from app.models.sale import Sale
from app.auth.dependencies import get_current_user

router = APIRouter(
    prefix="/export",
    tags=["Export"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ==========================
# PRODUCTS CSV
# ==========================

@router.get("/products/csv")
def export_products_csv(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    products = (
        db.query(Product)
        .filter(Product.business_id == user["business_id"])
        .all()
    )

    data = []

    for p in products:
        data.append({
            "Name": p.name,
            "Price": p.price,
            "Stock": p.stock,
            "Category": p.category
        })

    df = pd.DataFrame(data)

    stream = BytesIO()
    df.to_csv(stream, index=False)
    stream.seek(0)

    return StreamingResponse(
        stream,
        media_type="text/csv",
        headers={
            "Content-Disposition":
            "attachment; filename=products.csv"
        }
    )


# ==========================
# SALES CSV
# ==========================

@router.get("/sales/csv")
def export_sales_csv(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    sales = (
        db.query(Sale)
        .filter(Sale.business_id == user["business_id"])
        .all()
    )

    rows = []

    for s in sales:
        rows.append({
            "Order ID": s.order_id,
            "Cashier": s.created_by_name,
            "Subtotal": s.subtotal,
            "Tax": s.tax,
            "Total": s.total,
            "Amount Paid": s.amountPaid,
            "Balance": s.balance,
            "Payment Method": s.paymentMethod,
            "Status": s.status,
            "Date": s.date,
        })

    df = pd.DataFrame(rows)

    stream = BytesIO()
    df.to_csv(stream, index=False)
    stream.seek(0)

    return StreamingResponse(
        stream,
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=sales.csv"
        }
    )

# ==========================
# PRODUCTS PDF
# ==========================

@router.get("/products/pdf")
def export_products_pdf(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    products = (
        db.query(Product)
        .filter(Product.business_id == user["business_id"])
        .all()
    )

    buffer = BytesIO()

    doc = SimpleDocTemplate(buffer)

    table_data = [["Name", "Price", "Stock", "Category"]]

    for p in products:
        table_data.append([
            p.name,
            str(p.price),
            str(p.stock),
            p.category
        ])

    table = Table(table_data)

    table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), colors.blue),
        ("TEXTCOLOR", (0,0), (-1,0), colors.white),
        ("GRID", (0,0), (-1,-1), 1, colors.black),
        ("BOTTOMPADDING",(0,0),(-1,0),10)
    ]))

    doc.build([table])

    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition":
            "attachment; filename=products.pdf"
        }
    )


# ==========================
# SALES PDF
# ==========================

@router.get("/sales/pdf")
def export_sales_pdf(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    sales = (
        db.query(Sale)
        .filter(Sale.business_id == user["business_id"])
        .all()
    )

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer)

    table_data = [[
        "Order",
        "Cashier",
        "Total",
        "Paid",
        "Balance",
        "Status"
    ]]

    for s in sales:
        table_data.append([
            s.order_id,
            s.created_by_name,
            f"₦{s.total:,.2f}",
            f"₦{s.amountPaid:,.2f}",
            f"₦{s.balance:,.2f}",
            s.status
        ])

    table = Table(table_data)

    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.green),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 1, colors.black),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
    ]))

    doc.build([table])

    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": "attachment; filename=sales.pdf"
        }
    )

# ==========================
# DASHBOARD PDF
# ==========================

@router.get("/dashboard/pdf")
def dashboard_pdf(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    products = (
        db.query(Product)
        .filter(Product.business_id == user["business_id"])
        .all()
    )

    sales = (
        db.query(Sale)
        .filter(Sale.business_id == user["business_id"])
        .all()
    )

    total_products = len(products)
    total_sales = len(sales)

    revenue = sum(s.total for s in sales)
    subtotal = sum(s.subtotal for s in sales)
    tax = sum(s.tax for s in sales)
    amount_paid = sum(s.amountPaid for s in sales)
    outstanding = sum(s.balance for s in sales)

    paid_sales = sum(1 for s in sales if s.status == "PAID")
    unpaid_sales = sum(1 for s in sales if s.status == "UNPAID")

    low_stock = sum(1 for p in products if p.stock <= 5)
    out_of_stock = sum(1 for p in products if p.stock == 0)

    inventory_value = sum(p.price * p.stock for p in products)

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer)
    styles = getSampleStyleSheet()

    story = []

    story.append(
        Paragraph("<b>BizTrack Dashboard Report</b>", styles["Title"])
    )

    story.append(Paragraph("<br/>", styles["BodyText"]))

    story.append(Paragraph("<b>Sales Metrics</b>", styles["Heading2"]))
    story.append(Paragraph(f"Total Sales: {total_sales}", styles["BodyText"]))
    story.append(Paragraph(f"Revenue: ₦{revenue:,.2f}", styles["BodyText"]))
    story.append(Paragraph(f"Subtotal: ₦{subtotal:,.2f}", styles["BodyText"]))
    story.append(Paragraph(f"Tax Collected: ₦{tax:,.2f}", styles["BodyText"]))
    story.append(Paragraph(f"Amount Paid: ₦{amount_paid:,.2f}", styles["BodyText"]))
    story.append(Paragraph(f"Outstanding Balance: ₦{outstanding:,.2f}", styles["BodyText"]))
    story.append(Paragraph(f"Paid Sales: {paid_sales}", styles["BodyText"]))
    story.append(Paragraph(f"Unpaid Sales: {unpaid_sales}", styles["BodyText"]))

    story.append(Paragraph("<br/>", styles["BodyText"]))

    story.append(Paragraph("<b>Inventory Metrics</b>", styles["Heading2"]))
    story.append(Paragraph(f"Total Products: {total_products}", styles["BodyText"]))
    story.append(Paragraph(f"Inventory Value: ₦{inventory_value:,.2f}", styles["BodyText"]))
    story.append(Paragraph(f"Low Stock Products: {low_stock}", styles["BodyText"]))
    story.append(Paragraph(f"Out of Stock Products: {out_of_stock}", styles["BodyText"]))

    doc.build(story)

    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": "attachment; filename=dashboard.pdf"
        }
    )