from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Imports AFTER app creation
from app.routes import product_routes, sales_routes, ai
from app.auth.routes import router as auth_router
from app.routes.employee import router as employee_router
from app.database import engine, Base
from app.routes.notification import router as notification_router

app.include_router(auth_router)
app.include_router(product_routes.router)
app.include_router(sales_routes.router)
app.include_router(employee_router)
app.include_router(ai.router)
app.include_router(notification_router)

if not os.path.exists("uploads"):
    os.makedirs("uploads")

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)

@app.get("/")
def home():
    return {"message": "POS Backend Running"}