from app.database import SessionLocal
from app.models.product import Product
from app.models.sale import Sale
from app.models.inventory_log import InventoryLog
from datetime import datetime

def process_sale(db, items, subtotal, tax, total, amountPaid, paymentMethod):

    try:
        # 1. Deduct stock
        for item in items:
            product = db.query(Product).filter(Product.id == item["product_id"]).first()

            if product:
                product.stock = max(0, product.stock - item["quantity"])

                log = InventoryLog(
                    product_id=product.id,
                    change_type="sold",
                    quantity=item["quantity"],
                    timestamp=datetime.utcnow()
                )
                db.add(log)

        balance = amountPaid - total

        sale = Sale(
            id=f"ORD{int(datetime.utcnow().timestamp()*1000)}",
            date=datetime.utcnow(),
            items=items,
            subtotal=subtotal,
            tax=tax,
            total=total,
            amountPaid=amountPaid,
            balance=balance,
            paymentMethod=paymentMethod,
            status="PAID" if balance >= 0 else "DEBT",
            payments=[]
        )

        db.add(sale)
        db.commit()

        return {"message": "Sale processed successfully"}

    except Exception as e:
        db.rollback()
        return {"error": str(e)}

    finally:
        db.close()