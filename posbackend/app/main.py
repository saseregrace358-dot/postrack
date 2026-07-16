from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import SessionLocal
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite
        "http://127.0.0.1:5173",
        "http://localhost:3000",   # React (if needed)
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Imports AFTER app creation
from app.routes.landing_payment import router as landing_payment_router
from app.routes import product_routes, sales_routes, ai
from app.auth.routes import router as auth_router
from app.routes.employee import router as employee_router
from app.database import engine, Base
from app.routes.notification import router as notification_router
from app.routes.websocket import router as websocket_router
from app.routes.export import router as export_router
from app.routes.settings import router as settings_router
from app.models.subscription_plan import SubscriptionPlan
from app.models.business_subscription import BusinessSubscription
from app.models.payment import Payment
from app.routes.subscriptions import router as subscription_router
from app.services.seed_plans import seed_subscription_plans 
from app.routes.payment import router as payment_router 

app.include_router(auth_router)
app.include_router(product_routes.router)
app.include_router(sales_routes.router)
app.include_router(employee_router)
app.include_router(ai.router)
app.include_router(notification_router)
app.include_router(websocket_router)
app.include_router(export_router)
app.include_router(settings_router)
app.include_router(subscription_router)
app.include_router(payment_router)
app.include_router(landing_payment_router)

if not os.path.exists("uploads"):
    os.makedirs("uploads")

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/")
def home():
    return {"message": "POS Backend Running"}

@app.on_event("startup")
def startup():

    db = SessionLocal()

    try:
        seed_subscription_plans(db)
    finally:
        db.close()