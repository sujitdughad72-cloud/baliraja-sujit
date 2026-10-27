import os
import joblib
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from schemas.models import (
    CropRecommendationRequest, CropRecommendationResponse,
    DiseasePredictionRequest, DiseasePredictionResponse,
    SoilAnalysisRequest, SoilAnalysisResponse
)
from services.crop_service import CropService
from services.disease_service import DiseaseService
from services.soil_service import SoilService

# Global service instances
crop_service = CropService()
disease_service = DiseaseService()
soil_service = SoilService()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Load ML models once during FastAPI startup.
    Ensures models are in-memory and not reloaded per request.
    """
    print("[AI-SERVICE] Initializing BaliRaja AI/ML Microservice...")
    base_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(base_dir, "models", "crop_recommendation_model.joblib")

    if os.path.exists(model_path):
        try:
            print(f"[AI-SERVICE] Loading pre-trained model from {model_path}...")
            model = joblib.load(model_path)
            crop_service.set_model(model)
            print("[AI-SERVICE] Pre-trained Scikit-Learn model loaded successfully into memory.")
        except Exception as e:
            print(f"[AI-SERVICE] Warning: Could not load joblib file: {e}. Using rule engine fallback.")
    else:
        print("[AI-SERVICE] Note: Model file not yet trained at path. Using integrated agronomic ML heuristics.")

    yield
    print("[AI-SERVICE] Shutting down BaliRaja AI/ML Microservice.")

app = FastAPI(
    title="BaliRaja AI/ML Microservice",
    description="Python FastAPI service for Crop Recommendation, Plant Disease Detection, and Soil Fertilizer Analysis",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for Spring Boot & React communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {
        "status": "UP",
        "service": "BaliRaja AI/ML FastAPI Service",
        "version": "1.0.0"
    }

@app.post("/predict/crop", response_model=CropRecommendationResponse)
def predict_crop(request: CropRecommendationRequest):
    """
    Predict optimal crop recommendation based on Soil NPK, pH, Temperature, and Rainfall.
    """
    try:
        return crop_service.predict(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Crop prediction error: {str(e)}")

@app.post("/predict/disease", response_model=DiseasePredictionResponse)
def predict_disease(request: DiseasePredictionRequest):
    """
    Diagnose crop leaf pathology and return severity, organic, and chemical cures.
    """
    try:
        return disease_service.predict(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Disease prediction error: {str(e)}")

@app.post("/predict/soil", response_model=SoilAnalysisResponse)
def predict_soil(request: SoilAnalysisRequest):
    """
    Analyze soil test reports and calculate custom fertilizer dosages and soil health.
    """
    try:
        return soil_service.analyze(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Soil analysis error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
