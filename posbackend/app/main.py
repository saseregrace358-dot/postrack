from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import os
from fastapi.staticfiles import StaticFiles

from app.database import engine, Base
from app.routes import product_routes, sales_routes
from app.auth.routes import router as auth_router



from fastapi.responses import Response

# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="POS Backend")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

if not os.path.exists("uploads"):
    os.makedirs("uploads")

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Routes
app.include_router(product_routes.router)
app.include_router(sales_routes.router)
app.include_router(auth_router)



@app.get("/")
def home():
    return {"message": "POS Backend Running"}