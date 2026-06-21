from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import Response
import os


app = FastAPI()


# 1. CORS FIRST (VERY IMPORTANT)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
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



@app.options("/{rest_of_path:path}")
def preflight_handler():
    return Response(status_code=200)