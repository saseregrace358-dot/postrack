from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.sale import Sale
from app.models.employee import Employee



def build_context(db: Session, business_id: int):

    product_count = (
        db.query(Product)
        .filter(Product.business_id == business_id)
        .count()
    )

    employee_count = (
        db.query(Employee)
        .filter(Employee.business_id == business_id)
        .count()
    )

    

    total_sales = (
        db.query(Sale)
        .filter(Sale.business_id == business_id)
        .count()
    )

    low_stock = (
        db.query(Product)
        .filter(
            Product.business_id == business_id,
            Product.stock <= 5
        )
        .count()
    )

    return f"""
Business Statistics

Products: {product_count}

Employees: {employee_count}



Sales: {total_sales}

Low Stock Products: {low_stock}
"""