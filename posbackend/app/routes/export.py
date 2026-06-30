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
            "Order": s.order_id,
            "Customer": s.customer_name,
            "Total": s.total,
            "Payment": s.payment_method,
            "Date": s.created_at
        })

    df = pd.DataFrame(rows)

    stream = BytesIO()
    df.to_csv(stream, index=False)
    stream.seek(0)

    return StreamingResponse(
        stream,
        media_type="text/csv",
        headers={
            "Content-Disposition":
            "attachment; filename=sales.csv"
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

    table_data = [["Order", "Customer", "Total"]]

    for s in sales:
        table_data.append([
            s.order_id,
            s.customer_name,
            str(s.total)
        ])

    table = Table(table_data)

    table.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,0),colors.green),
        ("TEXTCOLOR",(0,0),(-1,0),colors.white),
        ("GRID",(0,0),(-1,-1),1,colors.black)
    ]))

    doc.build([table])

    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition":
            "attachment; filename=sales.pdf"
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
    total_products = (
        db.query(Product)
        .filter(Product.business_id == user["business_id"])
        .count()
    )

    sales = (
        db.query(Sale)
        .filter(Sale.business_id == user["business_id"])
        .all()
    )

    revenue = sum(s.total for s in sales)

    buffer = BytesIO()

    doc = SimpleDocTemplate(buffer)

    styles = getSampleStyleSheet()

    story = [
        Paragraph("<b>Dashboard Summary</b>", styles["Title"]),
        Paragraph(f"Total Products: {total_products}", styles["BodyText"]),
        Paragraph(f"Total Sales: {len(sales)}", styles["BodyText"]),
        Paragraph(f"Revenue: ₦{revenue:,.2f}", styles["BodyText"]),
    ]

    doc.build(story)

    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition":
            "attachment; filename=dashboard.pdf"
        }
    )