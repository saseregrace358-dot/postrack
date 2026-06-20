
print("MAIN.PY LOADED - VERSION 123")
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

app = FastAPI()

# 1. CORS FIRST (VERY IMPORTANT)
app.add_middleware(
    CORSMiddleware,
   
    allow_origins=[
        "http://localhost:5173",
        "https://postrack.vercel.app",
        "https://postrack-khaki.vercel.app",
        "https://postrack-i7gnxzu7r-saseregrace358-9128s-projects.vercel.app",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. SAFE STATIC FILES
if not os.path.exists("uploads"):
    os.makedirs("uploads")

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# 3. IMPORT ROUTES AFTER APP INIT
from app.routes import product_routes, sales_routes
from app.auth.routes import router as auth_router

app.include_router(auth_router)
app.include_router(product_routes.router)
app.include_router(sales_routes.router)

# 4. DB ONLY AFTER EVERYTHING (OR MOVE TO STARTUP EVENT)
from app.database import engine, Base

@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)

@app.get("/")
def home():
    return {"message": "POS Backend Running"}

@app.get("/cors-test")
def cors_test():
    return {
        "origins": [
            "http://localhost:5173",
            "https://postrack.vercel.app",
            "https://postrack-khaki.vercel.app",
            "https://postrack-i7gnxzu7r-saseregrace358-9128s-projects.vercel.app",
        ]
    }