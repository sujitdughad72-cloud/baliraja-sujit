from decimal import Decimal
from schemas.models import SoilAnalysisRequest, SoilAnalysisResponse, FertilizerDose

class SoilService:
    def analyze(self, req: SoilAnalysisRequest) -> SoilAnalysisResponse:
        n = req.nitrogen
        p = req.phosphorus
        k = req.potassium
        ph = req.ph if req.ph else 7.0

        # Classify N, P, K status
        n_status = "LOW" if n < 280 else ("OPTIMAL" if n <= 450 else "HIGH")
        p_status = "LOW" if p < 15 else ("OPTIMAL" if p <= 30 else "HIGH")
        k_status = "LOW" if k < 150 else ("OPTIMAL" if k <= 300 else "HIGH")

        ph_status = f"NEUTRAL ({ph:.1f})"
        if ph < 6.5:
            ph_status = f"ACIDIC ({ph:.1f}) - चुना (Lime) आवश्यक"
        elif ph > 7.8:
            ph_status = f"ALKALINE ({ph:.1f}) - जिप्सम (Gypsum) आवश्यक"

        fertilizers = []
        total_cost = Decimal("0")

        # Fertilizer dose recommendations
        if n_status == "LOW":
            fertilizers.append(FertilizerDose(
                fertilizerName="Urea (युरिया 46% N)",
                fertilizerNameMr="युरिया (Urea)",
                quantityKgPerAcre=Decimal("50.0"),
                applicationTime="पेरणीनंतर २५ व ४० दिवसांनी दोन हप्त्यांत",
                applicationMethod="जमिनीत मिसळून पाणी द्यावे"
            ))
            total_cost += Decimal("300")

        if p_status == "LOW" or p_status == "OPTIMAL":
            fertilizers.append(FertilizerDose(
                fertilizerName="DAP (18:46:0) or 10:26:26 NPK",
                fertilizerNameMr="१०:२६:२६ किंवा डीएपी (DAP)",
                quantityKgPerAcre=Decimal("65.0"),
                applicationTime="लागवडीच्या वेळी (Basal Dose)",
                applicationMethod="चाढ्यावरून किंवा पेरणीच्या ओळीत टाकावे"
            ))
            total_cost += Decimal("1950")

        if k_status == "LOW":
            fertilizers.append(FertilizerDose(
                fertilizerName="MOP (Muriate of Potash 60% K2O)",
                fertilizerNameMr="म्युरेट ऑफ पोटॅश (MOP)",
                quantityKgPerAcre=Decimal("35.0"),
                applicationTime="फळ किंवा कंद पोसण्याच्या काळात",
                applicationMethod="ठिबक सिंचनातून किंवा आळे पद्धतीने"
            ))
            total_cost += Decimal("1200")

        organic_recs = [
            "चांगले कुजलेले शेणखत (FYM) किमान ४ ते ५ ट्रॅक्टर ट्रॉली प्रति एकर द्या.",
            "जिवाणू खते (Rhizobium / PSB / KMB) वापरून रासायनिक खतांची २५% बचत करा.",
            "हिरवळीचे खत (ताग / धैंचा) जमिनीत गाडल्यास सेंद्रिय कर्ब (Organic Carbon) वाढतो."
        ]

        quality_rating = "EXCELLENT" if (n_status != "LOW" and p_status != "LOW" and k_status != "LOW") else "GOOD"
        quality_mr = "उत्तम सुपीक जमीन (Fertile Soil)" if quality_rating == "EXCELLENT" else "मध्यम सुपीक जमीन (Moderate Fertility)"

        return SoilAnalysisResponse(
            soilQualityRating=quality_rating,
            soilQualityRatingMr=quality_mr,
            nitrogenStatus=n_status,
            phosphorusStatus=p_status,
            potassiumStatus=k_status,
            phStatus=ph_status,
            recommendedFertilizers=fertilizers,
            organicRecommendations=organic_recs,
            estimatedFertilizerCost=total_cost,
            modelSource="PYTHON_FASTAPI"
        )
