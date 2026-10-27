from schemas.models import DiseasePredictionRequest, DiseasePredictionResponse

DISEASE_KNOWLEDGE_BASE = {
    "blight": {
        "name": "Early Blight (अल्टरनेरिया करपा)",
        "nameMr": "अल्टरनेरिया करपा रोग (Early Blight)",
        "confidence": 93.4,
        "severity": "MEDIUM",
        "desc": "Concentric dark brown rings on older leaves leading to defoliation.",
        "descMr": "पानांवर काळपट-तपकिरी गोलाकार वलयाकार ठिपके पडतात. दमट आणि उष्ण हवेत हा रोग वेगाने पसरतो.",
        "chemical": ["Mancozeb 75% WP @ 2.5 g/L", "Azoxystrobin 23% SC @ 1 ml/L", "Difenoconazole 25% EC @ 0.5 ml/L"],
        "organic": ["Neem Oil 10,000 ppm @ 3 ml/L", "Trichoderma viride 1% WP @ 5 g/L फवारणी", "ताक व हिंग मिश्रण फवारणी"],
        "preventive": ["Keep proper plant-to-plant spacing", "Avoid excess flood irrigation in evening", "Remove diseased lower leaves"]
    },
    "mildew": {
        "name": "Downy Mildew (केवडा रोग)",
        "nameMr": "केवडा / डाऊनी मिल्ड्यू (Downy Mildew)",
        "confidence": 95.1,
        "severity": "HIGH",
        "desc": "Yellow angular spots on top of leaves with white downy growth beneath.",
        "descMr": "पानांच्या वरच्या भागावर पिवळसर तेलकट डाग आणि खालच्या बाजूला पांढरी बुरशी वाढते.",
        "chemical": ["Metalaxyl 8% + Mancozeb 64% WP @ 2 g/L", "Cymoxanil 8% + Mancozeb 64% @ 2 g/L"],
        "organic": ["Bordeaux mixture (1%)", "Garlic + Chilli extract spray"],
        "preventive": ["Pruning of dense canopy", "Improve sunlight exposure and aeration"]
    },
    "thrips": {
        "name": "Thrips & Purple Blotch (थ्रिप्स व जांभळा करपा)",
        "nameMr": "कांद्यावरील थ्रिप्स व जांभळा करपा (Purple Blotch)",
        "confidence": 91.8,
        "severity": "HIGH",
        "desc": "Silvery streaks on onion leaves followed by purple sunken lesions.",
        "descMr": "पानांवर पांढुरके चट्टे पडून पानं वाकडी होतात व नंतर जांभळे लांबट डाग पडतात.",
        "chemical": ["Fipronil 5% SC @ 1.5 ml/L", "Lambda Cyhalothrin 5% EC @ 1 ml/L", "Propiconazole 25% EC @ 1 ml/L"],
        "organic": ["Neem seed kernel extract (NSKE) 5%", "Yellow & Blue sticky traps (20 per acre)"],
        "preventive": ["Maintain timely irrigation", "Destroy field weeds which host thrips"]
    },
    "rust": {
        "name": "Rust Fungus (तांबेरा रोग)",
        "nameMr": "तांबेरा रोग (Rust Disease)",
        "confidence": 89.5,
        "severity": "MEDIUM",
        "desc": "Reddish-brown powdery pustules covering leaf surfaces.",
        "descMr": "सोयाबीन, भुईमूग किंवा गव्हाच्या पानांवर तांबूस लाल रंगाचे पावडरसारखे फोड येतात.",
        "chemical": ["Propiconazole 25% EC @ 1 ml/L", "Tebuconazole 25.9% EC @ 1.5 ml/L"],
        "organic": ["Cow urine + Neem leaf fermented spray", "Sulphur 80% WDG @ 2.5 g/L"],
        "preventive": ["Crop rotation with non-host crops", "Use certified rust-resistant varieties"]
    }
}

class DiseaseService:
    def predict(self, req: DiseasePredictionRequest) -> DiseasePredictionResponse:
        symptoms = (req.symptoms or "").lower()
        crop = (req.cropName or "").lower()

        # Match against pathology dictionary or fallback
        matched_key = "blight"
        if "mildew" in symptoms or "kevd" in symptoms or "downy" in symptoms or "yellow" in symptoms:
            matched_key = "mildew"
        elif "thrips" in symptoms or "curl" in symptoms or "onion" in crop or "purple" in symptoms:
            matched_key = "thrips"
        elif "rust" in symptoms or "tambera" in symptoms or "red" in symptoms:
            matched_key = "rust"

        info = DISEASE_KNOWLEDGE_BASE[matched_key]

        return DiseasePredictionResponse(
            diseaseName=info["name"],
            diseaseNameMr=info["nameMr"],
            confidenceScore=info["confidence"],
            severity=info["severity"],
            description=info["desc"],
            descriptionMr=info["descMr"],
            chemicalTreatments=info["chemical"],
            organicTreatments=info["organic"],
            preventiveMeasures=info["preventive"],
            modelSource="PYTHON_FASTAPI"
        )
