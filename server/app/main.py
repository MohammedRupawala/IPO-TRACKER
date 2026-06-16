from fastapi import FastAPI
from fastapi.security import OAuth2PasswordBearer
import uvicorn

from app.api.v1.admin import router as admin_router
from app.api.v1.auth import router as auth_router
from app.api.v1.user import router as user_router
from fastapi.middleware.cors import CORSMiddleware



app = FastAPI(title="IPO Tracker API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


access_token_scheme = OAuth2PasswordBearer(
    tokenUrl="login", 
    scheme_name="JWT_Access_Token",
    description="Enter your short-lived JWT Access Token here."
)

# Scheme 2: Dedicated Refresh Token scheme
# Points to the token URL, but mapped to a different scheme name for the UI
refresh_token_scheme = OAuth2PasswordBearer(
    tokenUrl="login", 
    scheme_name="JWT_Refresh_Token",
    description="Enter your long-lived JWT Refresh Token here."
)

@app.get("/health")
def health():
    print("Health check endpoint called")
    return {"status": "Not Healthy"}


app.include_router(auth_router)
app.include_router(user_router)
app.include_router(admin_router)


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        access_log=True,
    )