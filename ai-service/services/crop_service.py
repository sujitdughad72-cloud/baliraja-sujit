import os
import joblib
import numpy as np
from decimal import Decimal
from schemas.models import CropRecommendationRequest, CropRecommendationResponse, AlternativeCrop

MARATHI_CROP_META = {
    "onion": {
        "nameMr": "कांदा (Onion - Garva/Rabi)",
        "yield": "12 - 16 टन / एकर",
        "profit": Decimal("140000"),
        "sowing": "ऑक्टोबर - नोव्हेंबर (रब्बी)",
        "adviceMr": "मध्यम ते भारी निचऱ्याच्या जमिनीत कांदा उत्तम येतो. पुनर्लागवडीनंतर युरिया व पोटॅश खतांचा समतोल ठेवावा."
    },
    "tomato": {
        "nameMr": "टोमॅटो (Tomato - Hybrid)",
        "yield": "25 - 30 टन / एकर",
        "profit": Decimal("180000"),
        "sowing": "जून - जुलै किंवा ऑक्टोबर",
        "adviceMr": "मल्चिंग पेपर आणि ठिबक सिंचन वापरून लागवड करा. फळ पोसण्याच्या काळात कॅल्शियम व बोरॉन फवारा."
    },
    "grapes": {
        "nameMr": "द्राक्षे (Grapes - Export Quality)",
        "yield": "10 - 12 टन / एकर",
        "profit": Decimal("320000"),
        "sowing": "ऑक्टोबर छाटणी",
        "adviceMr": "द्राक्ष बागेत पोटॅशियम व सूक्ष्म अन्नद्रव्यांचे प्रमाण व्यवस्थित ठेवा. मण्यांची गोडी व टिकवण क्षमता वाढेल."
    },
    "pomegranate": {
        "nameMr": "डाळिंब (Pomegranate - Bhagwa)",
        "yield": "6 - 8 टन / एकर",
        "profit": Decimal("250000"),
        "sowing": "मृग किंवा हस्त बहार",
        "adviceMr": "भगवा वाणाची निवड योग्य आहे. तेलकट डाग व मर रोगापासून संरक्षणासाठी बोर्डो मिश्रणाची फवारणी करा."
    },
    "cotton": {
        "nameMr": "कापूस (Bt Cotton)",
        "yield": "12 - 15 क्विंटल / एकर",
        "profit": Decimal("90000"),
        "sowing": "जून - जुलै (खरीप)",
        "adviceMr": "भारी काळ्या जमिनीत कापूस उत्तम येतो. फुलगळ रोखण्यासाठी प्लॅनोफिक्सची फवारणी करा."
    },
    "soybean": {
        "nameMr": "सोयाबीन (JS-335 / Sangam)",
        "yield": "10 - 14 क्विंटल / एकर",
        "profit": Decimal("65000"),
        "sowing": "जून अखेर ते जुलै पहिला आठवडा",
        "adviceMr": "पेरणीपूर्वी बीजप्रक्रिया अवश्य करा. शेंगा भरण्याच्या काळात ओलावा टिकवून ठेवावा."
    },
    "wheat": {
        "nameMr": "गहू (Wheat - Sharbati)",
        "yield": "18 - 22 क्विंटल / एकर",
        "profit": Decimal("55000"),
        "sowing": "नोव्हेंबर (रब्बी)",
        "adviceMr": "थंडीच्या दिवसांत गव्हाची वाढ उत्तम होते. कांडी फुटताना आणि लोंबी भरताना पाणी देणे अत्यावश्यक आहे."
    },
    "banana": {
        "nameMr": "केळी (Grand Naine)",
        "yield": "30 - 35 टन / एकर",
        "profit": Decimal("210000"),
        "sowing": "मे - जून किंवा ऑक्टोबर",
        "adviceMr": "उष्ण व दमट हवामानात केळी जोमदार येते. पिलवांची वेळेवर छाटणी करून ठिबकने अन्नद्रव्ये द्या."
    },
    "chickpea": {
        "nameMr": "हरभरा / चना (Gram - Digvijay)",
        "yield": "8 - 10 क्विंटल / एकर",
        "profit": Decimal("48000"),
        "sowing": "ऑक्टोबर ते नोव्हेंबर",
        "adviceMr": "कमी पाण्यावर उत्तम नफा देणारे पीक. घाटेअळीच्या नियंत्रणासाठी कामगंध सापळे लावा."
    },
    "rice": {
        "nameMr": "भात / तांदूळ (Paddy)",
        "yield": "20 - 25 क्विंटल / एकर",
        "profit": Decimal("60000"),
        "sowing": "जून (खरीप)",
        "adviceMr": "भरपूर पाऊस व पाणी साचून राहणाऱ्या जमिनीत भात लागवड करावी."
    }
}

class CropService:
    def __init__(self, model=None):
        self.model = model

    def set_model(self, model):
        self.model = model

    def predict(self, req: CropRecommendationRequest) -> CropRecommendationResponse:
        features = np.array([[
            req.nitrogen,
            req.phosphorus,
            req.potassium,
            req.temperature if req.temperature else 25.0,
            req.humidity if req.humidity else 65.0,
            req.ph if req.ph else 6.5,
            req.rainfall if req.rainfall else 150.0
        ]])

        if self.model is not None:
            probabilities = self.model.predict_proba(features)[0]
            classes = self.model.classes_

            # Sort predictions by probability descending
            sorted_indices = np.argsort(probabilities)[::-1]
            top_class = classes[sorted_indices[0]]
            top_conf = float(probabilities[sorted_indices[0]]) * 100.0

            # Alternative top 2 crops
            alternatives = []
            for idx in sorted_indices[1:3]:
                c_name = classes[idx]
                meta = MARATHI_CROP_META.get(c_name.lower(), {})
                alternatives.append(AlternativeCrop(
                    cropName=c_name.capitalize(),
                    cropNameMr=meta.get("nameMr", c_name),
                    score=round(float(probabilities[idx]) * 100.0, 1)
                ))
        else:
            # Agronomic rule heuristics if pre-trained joblib file is not yet built
            if req.nitrogen >= 80 and req.phosphorus >= 40:
                top_class = "onion"
                top_conf = 95.0
            elif req.potassium >= 60:
                top_class = "grapes"
                top_conf = 92.5
            elif req.nitrogen >= 70:
                top_class = "cotton"
                top_conf = 90.0
            else:
                top_class = "soybean"
                top_conf = 88.0

            alternatives = [
                AlternativeCrop(cropName="Tomato", cropNameMr="टोमॅटो (Hybrid)", score=84.0),
                AlternativeCrop(cropName="Wheat", cropNameMr="गहू (Sharbati)", score=80.5)
            ]

        meta = MARATHI_CROP_META.get(top_class.lower(), {
            "nameMr": top_class.capitalize(),
            "yield": "12 - 15 टन / एकर",
            "profit": Decimal("100000"),
            "sowing": "हंगामानुसार",
            "adviceMr": "जमिनीच्या गुणवत्तेनुसार खतांचे संतुलित व्यवस्थापन करावे."
        })

        return CropRecommendationResponse(
            recommendedCrop=top_class.capitalize(),
            recommendedCropMr=meta["nameMr"],
            confidenceScore=round(top_conf, 1),
            expectedYield=meta["yield"],
            estimatedProfitPerAcre=meta["profit"],
            sowingWindow=meta["sowing"],
            advice=f"Based on your soil NPK ({req.nitrogen}-{req.phosphorus}-{req.potassium}), {top_class.capitalize()} offers the highest yield potential.",
            adviceMr=meta["adviceMr"],
            alternativeCrops=alternatives,
            modelSource="PYTHON_FASTAPI"
        )
