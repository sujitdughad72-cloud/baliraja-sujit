from pydantic import BaseModel, Field
from typing import List, Optional
from decimal import Decimal

# --- Crop Recommendation Schemas ---
class CropRecommendationRequest(BaseModel):
    nitrogen: float = Field(..., description="Nitrogen content in soil (kg/ha)")
    phosphorus: float = Field(..., description="Phosphorus content in soil (kg/ha)")
    potassium: float = Field(..., description="Potassium content in soil (kg/ha)")
    ph: Optional[float] = Field(6.5, description="Soil pH level")
    temperature: Optional[float] = Field(26.0, description="Temperature in Celsius")
    rainfall: Optional[float] = Field(150.0, description="Rainfall in mm")
    humidity: Optional[float] = Field(65.0, description="Relative humidity %")
    soilType: Optional[str] = Field("Medium Black", description="Soil classification")
    district: Optional[str] = Field("Nashik", description="District name")
    season: Optional[str] = Field("Kharif", description="Kharif, Rabi, Zaid")

class AlternativeCrop(BaseModel):
    cropName: str
    cropNameMr: str
    score: float

class CropRecommendationResponse(BaseModel):
    recommendedCrop: str
    recommendedCropMr: str
    confidenceScore: float
    expectedYield: str
    estimatedProfitPerAcre: Decimal
    sowingWindow: str
    advice: str
    adviceMr: str
    alternativeCrops: List[AlternativeCrop]
    modelSource: str = "PYTHON_FASTAPI"

# --- Disease Prediction Schemas ---
class DiseasePredictionRequest(BaseModel):
    cropName: Optional[str] = Field(None, description="Crop name (e.g., Tomato, Onion)")
    imageBase64: Optional[str] = Field(None, description="Base64 encoded leaf image or url")
    symptoms: Optional[str] = Field(None, description="Visual description of symptoms")

class DiseasePredictionResponse(BaseModel):
    diseaseName: str
    diseaseNameMr: str
    confidenceScore: float
    severity: str # LOW, MEDIUM, HIGH, SEVERE
    description: str
    descriptionMr: str
    chemicalTreatments: List[str]
    organicTreatments: List[str]
    preventiveMeasures: List[str]
    modelSource: str = "PYTHON_FASTAPI"

# --- Soil Analysis Schemas ---
class SoilAnalysisRequest(BaseModel):
    targetCrop: Optional[str] = Field("Onion", description="Crop planned to cultivate")
    nitrogen: float = Field(..., description="Available Nitrogen (kg/ha)")
    phosphorus: float = Field(..., description="Available Phosphorus (kg/ha)")
    potassium: float = Field(..., description="Available Potassium (kg/ha)")
    ph: Optional[float] = Field(7.0, description="Soil pH level")
    organicCarbon: Optional[float] = Field(0.6, description="Organic Carbon %")
    electricConductivity: Optional[float] = Field(0.4, description="EC dS/m")
    landAreaAcres: Optional[float] = Field(1.0, description="Farm size in acres")

class FertilizerDose(BaseModel):
    fertilizerName: str
    fertilizerNameMr: str
    quantityKgPerAcre: Decimal
    applicationTime: str
    applicationMethod: str

class SoilAnalysisResponse(BaseModel):
    soilQualityRating: str # EXCELLENT, GOOD, MODERATE, DEFICIENT
    soilQualityRatingMr: str
    nitrogenStatus: str
    phosphorusStatus: str
    potassiumStatus: str
    phStatus: str
    recommendedFertilizers: List[FertilizerDose]
    organicRecommendations: List[str]
    estimatedFertilizerCost: Decimal
    modelSource: str = "PYTHON_FASTAPI"
