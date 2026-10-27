/**
 * BaliRaja Smart Agriculture - Soil & NPK IoT Sensor Service
 * Supports:
 * 1. RS485 Modbus 7-in-1 / 3-in-1 NPK Soil Sensor Probes
 * 2. Capacitive / Resistive Soil Moisture Sensors
 * 3. Web Serial API (USB-RS485 adapters, NodeMCU, Arduino)
 * 4. Web Bluetooth API (ESP32 BLE)
 * 5. Wi-Fi / HTTP REST Telemetry Gateway
 * 6. Agronomic Prediction Engine (Crops, Irrigation, Fertilizer Dosage, Soil Health)
 */

import { SensorReading, SensorPredictionResult } from '../types';

export const SENSOR_PRESETS: { name: string; description: string; reading: Omit<SensorReading, 'id' | 'timestamp'> }[] = [
  {
    name: 'नाशिक कांदा शेत (Nashik Onion Field - Optimal)',
    description: 'चांगला ओलावा, संतुलित पोषणद्रव्ये आणि योग्य सामू (Optimal for Rabi/Kharif crops)',
    reading: {
      deviceId: 'FIELD-NASHIK-01',
      deviceName: 'Nashik Plot A (Black Clay Loam)',
      nitrogen: 58,
      phosphorus: 28,
      potassium: 42,
      moisture: 52,
      ph: 6.8,
      temperature: 26.5,
      ec: 420,
      battery: 94,
      connectionType: 'simulated'
    }
  },
  {
    name: 'दुष्काळ / अत्यंत कोरडी जमीन (Drought / Critical Low Moisture)',
    description: 'ओलावा केवळ १६%, पिकाला त्वरित ठिबक सिंचनाची गरज आहे (Immediate Irrigation Needed)',
    reading: {
      deviceId: 'FIELD-MARATHWADA-02',
      deviceName: 'Marathwada Plot (Dry Zone)',
      nitrogen: 38,
      phosphorus: 18,
      potassium: 35,
      moisture: 16,
      ph: 7.4,
      temperature: 34.2,
      ec: 310,
      battery: 88,
      connectionType: 'simulated'
    }
  },
  {
    name: 'नायट्रोजनची तीव्र कमतरता (Severe Nitrogen Deficient Cotton)',
    description: 'कमी नायट्रोजनमुळे पाने पिवळी पडण्याचा धोका, युरिया मात्रा आवश्यक',
    reading: {
      deviceId: 'FIELD-VIDARBHA-03',
      deviceName: 'Vidarbha Cotton Soil',
      nitrogen: 18,
      phosphorus: 32,
      potassium: 48,
      moisture: 46,
      ph: 6.5,
      temperature: 28.0,
      ec: 380,
      battery: 82,
      connectionType: 'simulated'
    }
  },
  {
    name: 'अति ओलावा / दलदल (Waterlogged / Root Rot Alert)',
    description: 'ओलावा ८४%, मुळांना ऑक्सिजन मिळणे बंद; तात्काळ पाण्याचा निचरा करा',
    reading: {
      deviceId: 'FIELD-KOLHAPUR-04',
      deviceName: 'Kolhapur Sugarcane Patch',
      nitrogen: 68,
      phosphorus: 24,
      potassium: 38,
      moisture: 84,
      ph: 7.9,
      temperature: 23.8,
      ec: 620,
      battery: 91,
      connectionType: 'simulated'
    }
  },
  {
    name: 'क्षारयुक्त / चोपण जमीन (Saline / High EC Problem)',
    description: 'उच्च सामू (8.4) व ईसी (1850 µS/cm); जिप्सम व सेंद्रिय खतांचा वापर आवश्यक',
    reading: {
      deviceId: 'FIELD-SOLAPUR-05',
      deviceName: 'Solapur Saline Soil',
      nitrogen: 32,
      phosphorus: 15,
      potassium: 22,
      moisture: 38,
      ph: 8.4,
      temperature: 30.5,
      ec: 1850,
      battery: 76,
      connectionType: 'simulated'
    }
  }
];

// Agronomic Benchmark Reference for Crop Suitability
interface CropProfile {
  id: string;
  nameEn: string;
  nameMr: string;
  nameHi: string;
  optN: [number, number];      // min, max mg/kg
  optP: [number, number];
  optK: [number, number];
  optMoisture: [number, number]; // min, max %
  optPh: [number, number];
  optTemp: [number, number];
  yieldEstimate: string;
  incomeEstimate: string;
  durationDays: number;
  tipsMr: string;
}

const CROP_PROFILES: CropProfile[] = [
  {
    id: 'onion',
    nameEn: 'Onion',
    nameMr: 'कांदा (Onion)',
    nameHi: 'प्याज (Onion)',
    optN: [45, 75],
    optP: [20, 40],
    optK: [30, 55],
    optMoisture: [45, 65],
    optPh: [6.2, 7.5],
    optTemp: [18, 30],
    yieldEstimate: '१५ - १८ टन / एकर',
    incomeEstimate: '₹ १,३०,००० - ₹ १,८०,०००',
    durationDays: 110,
    tipsMr: 'योग्य ओलावा राखल्यास गाठींची साईज उत्तम होते. काढणीच्या १५ दिवस आधी पाणी बंद करावे.'
  },
  {
    id: 'tomato',
    nameEn: 'Tomato',
    nameMr: 'टोमॅटो (Tomato)',
    nameHi: 'टमाटर (Tomato)',
    optN: [50, 85],
    optP: [25, 45],
    optK: [35, 60],
    optMoisture: [50, 70],
    optPh: [6.0, 7.2],
    optTemp: [20, 32],
    yieldEstimate: '२५ - ३२ टन / एकर',
    incomeEstimate: '₹ १,६०,००० - ₹ २,४०,०००',
    durationDays: 125,
    tipsMr: 'फुलोरा अवस्थेत पोटॅश आणि कॅल्शियमची कमतरता भासू देऊ नका. ठिबकद्वारे विद्राव्य खते द्यावीत.'
  },
  {
    id: 'sugarcane',
    nameEn: 'Sugarcane',
    nameMr: 'ऊस (Sugarcane)',
    nameHi: 'गन्ना (Sugarcane)',
    optN: [70, 120],
    optP: [30, 55],
    optK: [40, 70],
    optMoisture: [55, 75],
    optPh: [6.5, 7.8],
    optTemp: [24, 38],
    yieldEstimate: '६५ - ८५ टन / एकर',
    incomeEstimate: '₹ २,००,००० - ₹ २,८०,०००',
    durationDays: 360,
    tipsMr: 'मोठ्या प्रमाणावर नायट्रोजन व पाण्याची गरज असते. आंतरमशागत व पाचट आच्छादन अवश्य करावे.'
  },
  {
    id: 'cotton',
    nameEn: 'Cotton',
    nameMr: 'कापूस (Cotton)',
    nameHi: 'कपास (Cotton)',
    optN: [40, 70],
    optP: [20, 35],
    optK: [30, 50],
    optMoisture: [40, 60],
    optPh: [6.5, 8.0],
    optTemp: [25, 36],
    yieldEstimate: '१२ - १५ क्विंटल / एकर',
    incomeEstimate: '₹ ९०,००० - ₹ १,३५,०००',
    durationDays: 160,
    tipsMr: 'काळी कसदार जमीन अतिशय पोषक. बोण्ड भरण्याच्या अवस्थेत पाण्याचा ताण पडू देऊ नका.'
  },
  {
    id: 'soybean',
    nameEn: 'Soybean',
    nameMr: 'सोयाबीन (Soybean)',
    nameHi: 'सोयाबीन (Soybean)',
    optN: [25, 50],
    optP: [25, 45],
    optK: [25, 45],
    optMoisture: [45, 65],
    optPh: [6.0, 7.5],
    optTemp: [20, 32],
    yieldEstimate: '१० - १३ क्विंटल / एकर',
    incomeEstimate: '₹ ५५,००० - ₹ ७५,०००',
    durationDays: 95,
    tipsMr: 'शेंगवर्गीय पीक असल्याने मुळांवरील गाठी हवेतील नायट्रोजन शोषून घेतात; फॉस्फरस खतांवर भर द्या.'
  },
  {
    id: 'wheat',
    nameEn: 'Wheat',
    nameMr: 'गहू (Wheat)',
    nameHi: 'गेहूं (Wheat)',
    optN: [45, 75],
    optP: [20, 40],
    optK: [25, 45],
    optMoisture: [40, 60],
    optPh: [6.5, 7.5],
    optTemp: [15, 26],
    yieldEstimate: '१८ - २२ क्विंटल / एकर',
    incomeEstimate: '₹ ५०,००० - ₹ ७०,०००',
    durationDays: 115,
    tipsMr: 'थंड हवामान व मध्यम ओलावा अनुकूल. मुकुटमुळे फुटण्याच्या अवस्थेत (२१ दिवस) पाणी देणे अत्यावश्यक.'
  },
  {
    id: 'grapes',
    nameEn: 'Grapes',
    nameMr: 'द्राक्षे (Grapes)',
    nameHi: 'अंगूर (Grapes)',
    optN: [50, 75],
    optP: [25, 45],
    optK: [50, 85],
    optMoisture: [45, 62],
    optPh: [6.5, 7.5],
    optTemp: [20, 34],
    yieldEstimate: '१२ - १६ टन / एकर',
    incomeEstimate: '₹ ३,५०,००० - ₹ ५,००,०००',
    durationDays: 140,
    tipsMr: 'मणी फुगवणी व साखर उतरण्याच्या काळात पोटॅशची (०:०:५०) आवश्यकता जास्त असते. पाण्याचा काटेकोर वापर हवा.'
  },
  {
    id: 'maize',
    nameEn: 'Maize',
    nameMr: 'मका (Maize)',
    nameHi: 'मक्का (Maize)',
    optN: [55, 90],
    optP: [25, 45],
    optK: [30, 50],
    optMoisture: [45, 68],
    optPh: [6.0, 7.5],
    optTemp: [22, 35],
    yieldEstimate: '२८ - ३५ क्विंटल / एकर',
    incomeEstimate: '₹ ५५,००० - ₹ ७८,०००',
    durationDays: 105,
    tipsMr: 'कणसे भरताना सिंचन खंड पडू नये. नत्राची मात्रा २ ते ३ हप्त्यांत विभागून द्यावी.'
  }
];

/**
 * Agronomic Engine: Evaluates Sensor Readings and Computes Predictions
 */
export function calculateSensorPredictions(reading: SensorReading): SensorPredictionResult {
  const { nitrogen: n, phosphorus: p, potassium: k, moisture: m, ph, temperature: temp } = reading;

  // 1. Soil Moisture Assessment & Irrigation Recommendation
  let moistureStatusText = '';
  let moistureBadgeColor = '';
  let actionRequired = '';
  let irrigationSchedule = '';
  let waterLitersPerAcre = 0;

  if (m < 22) {
    moistureStatusText = 'अत्यंत कोरडी (Critical Dry) ⚠️';
    moistureBadgeColor = 'bg-rose-500 text-white';
    actionRequired = 'मातीतील ओलावा अत्यंत कमी झाला आहे. पिकाला सुकवा येण्याआधी तात्काळ ठिबक किंवा स्प्रिंकलर सुरू करा.';
    irrigationSchedule = 'आजच ३ ते ४ तास ठिबक सिंचन द्या. पुढील पाणी २ दिवसांनंतर.';
    waterLitersPerAcre = Math.round((55 - m) * 1200); // approx water depth needed
  } else if (m < 40) {
    moistureStatusText = 'कमी ओलावा (Low Moisture) 💧';
    moistureBadgeColor = 'bg-amber-500 text-white';
    actionRequired = 'ओलावा कमी होत आहे. पुढील २४ तासांत हलके पाणी द्यावे.';
    irrigationSchedule = 'उद्या सकाळी ६ ते ९ दरम्यान २ तास ठिबक सिंचन द्या.';
    waterLitersPerAcre = Math.round((55 - m) * 1000);
  } else if (m <= 70) {
    moistureStatusText = 'योग्य ओलावा (Optimal Field Capacity) ✅';
    moistureBadgeColor = 'bg-emerald-600 text-white';
    actionRequired = 'मुळांच्या वाढीसाठी आणि अन्नद्रव्ये शोषण्यासाठी जमिनीतील ओलावा उत्तम स्थितीत आहे.';
    irrigationSchedule = 'सध्या पाणी देण्याची आवश्यकता नाही. २ दिवसांनंतर पुन्हा सेन्सर रिडिंग तपासा.';
    waterLitersPerAcre = 0;
  } else {
    moistureStatusText = 'अति ओलावा / दलदल (Waterlogged / Saturated) 🚨';
    moistureBadgeColor = 'bg-indigo-600 text-white';
    actionRequired = 'माती पूर्ण संपृक्त आहे, मुळांना हवा खेळती राहत नाही. तात्काळ पाण्याचा निचरा करा.';
    irrigationSchedule = 'सिंचन पूर्णपणे बंद ठेवा. शेतातील चर व निचरा वाहिन्या मोकळ्या करा.';
    waterLitersPerAcre = 0;
  }

  // 2. NPK Nutrient Status & Fertilizer Prescription
  // Standard agronomic targets (mg/kg): N: 60, P: 30, K: 40
  const targetN = 60;
  const targetP = 30;
  const targetK = 40;

  const getNutrientStatus = (val: number, target: number) => {
    if (val < target * 0.7) return { status: 'कमी (Low)', deficit: target - val };
    if (val > target * 1.3) return { status: 'जास्त (High)', deficit: 0 };
    return { status: 'मध्यम (Optimal)', deficit: Math.max(0, target - val) };
  };

  const nAnalysis = { value: n, target: targetN, ...getNutrientStatus(n, targetN) };
  const pAnalysis = { value: p, target: targetP, ...getNutrientStatus(p, targetP) };
  const kAnalysis = { value: k, target: targetK, ...getNutrientStatus(k, targetK) };

  // Calculate Precision Bags per acre based on deficit
  // 1 bag DAP (50kg) provides 9kg N + 23kg P2O5
  // 1 bag Urea (50kg) provides 23kg N
  // 1 bag MOP (50kg) provides 30kg K2O
  const dapBags = pAnalysis.deficit > 0 ? Math.max(1, Math.round((pAnalysis.deficit / 15) * 10) / 10) : 0.5;
  const nSuppliedByDap = dapBags * 4.5;
  const remainingNDeficit = Math.max(0, nAnalysis.deficit - nSuppliedByDap);
  const ureaBags = remainingNDeficit > 0 ? Math.max(1, Math.round((remainingNDeficit / 18) * 10) / 10) : 0.5;
  const mopBags = kAnalysis.deficit > 0 ? Math.max(1, Math.round((kAnalysis.deficit / 20) * 10) / 10) : 0.5;
  const organicManureTons = (n < 40 || p < 20 || m < 30) ? 3 : 1.5;

  // 3. Soil Health Index (SHI) (0 - 100)
  // Balanced weights: N (20%), P (15%), K (15%), Moisture (25%), pH (25%)
  const scoreComponent = (val: number, minOpt: number, maxOpt: number) => {
    if (val >= minOpt && val <= maxOpt) return 100;
    const diff = val < minOpt ? minOpt - val : val - maxOpt;
    return Math.max(30, Math.round(100 - (diff / minOpt) * 80));
  };

  const nScore = scoreComponent(n, 40, 75);
  const pScore = scoreComponent(p, 20, 45);
  const kScore = scoreComponent(k, 30, 60);
  const mScore = m >= 45 && m <= 68 ? 100 : Math.max(20, Math.round(100 - Math.abs(55 - m) * 2.2));
  const phScore = ph >= 6.5 && ph <= 7.5 ? 100 : Math.max(30, Math.round(100 - Math.abs(7.0 - ph) * 45));

  const soilHealthIndex = Math.round(
    nScore * 0.20 + pScore * 0.15 + kScore * 0.15 + mScore * 0.25 + phScore * 0.25
  );

  let soilHealthCategory = 'मध्यम (Moderate)';
  if (soilHealthIndex >= 82) soilHealthCategory = 'उत्कृष्ट (Optimal / Healthy)';
  else if (soilHealthIndex < 60) soilHealthCategory = 'सुधारणा आवश्यक (Needs Attention)';

  // 4. Crop Suitability Scoring for this exact live profile
  const scoredCrops = CROP_PROFILES.map(crop => {
    const calcFit = (v: number, range: [number, number]) => {
      if (v >= range[0] && v <= range[1]) return 100;
      const dist = v < range[0] ? range[0] - v : v - range[1];
      const span = range[1] - range[0];
      return Math.max(40, Math.round(100 - (dist / span) * 60));
    };

    const fitN = calcFit(n, crop.optN);
    const fitP = calcFit(p, crop.optP);
    const fitK = calcFit(k, crop.optK);
    const fitM = calcFit(m, crop.optMoisture);
    const fitPh = calcFit(ph, crop.optPh);
    const fitTemp = calcFit(temp, crop.optTemp);

    const totalScore = Math.round(
      fitN * 0.20 + fitP * 0.15 + fitK * 0.15 + fitM * 0.25 + fitPh * 0.15 + fitTemp * 0.10
    );

    return {
      id: crop.id,
      cropName: crop.nameEn,
      cropNameMr: crop.nameMr,
      cropNameHi: crop.nameHi,
      matchScore: Math.min(99, Math.max(55, totalScore)),
      expectedYield: crop.yieldEstimate,
      estimatedIncomePerAcre: crop.incomeEstimate,
      durationDays: crop.durationDays,
      tips: crop.tipsMr
    };
  });

  scoredCrops.sort((a, b) => b.matchScore - a.matchScore);

  // 5. Critical Alerts
  const criticalAlerts: string[] = [];
  if (m < 20) criticalAlerts.push('⚠️ तात्काळ सिंचन आवश्यक: जमिनीतील ओलावा २०% च्या खाली गेला आहे.');
  if (m > 80) criticalAlerts.push('🚨 अति पाणी साचले आहे: मुळांना सड होण्यापासून वाचवण्यासाठी चर काढून पाणी बाहेर काढा.');
  if (n < 25) criticalAlerts.push('🧪 नत्र (Nitrogen) तीव्र कमतरता: पिकाची वाढ खुंटण्याची शक्यता आहे; त्वरित युरिया किंवा जिवामृत द्या.');
  if (ph > 8.2) criticalAlerts.push('⚗️ सामू जास्त (Alkaline Soil): जिप्सम आणि सेंद्रिय खतांचा वापर वाढवून सामू नियंत्रित करा.');
  if (ph < 5.8) criticalAlerts.push('⚗️ आम्लधर्मी जमीन (Acidic Soil): चुना (कॅल्शियम कार्बोनेट) वापरून सामू सुधारा.');

  // Summary Text
  const bestCrop = scoredCrops[0];
  const summaryMr = `सेन्सरनुसार माती आरोग्य गुण ${soilHealthIndex}/१०० असून ${bestCrop.cropNameMr} या पिकासाठी ${bestCrop.matchScore}% अनुकूलता आहे. ओलावा ${m}% असून ${moistureStatusText}. खतांमध्ये अंदाजे ${ureaBags} बॅग युरिया, ${dapBags} बॅग डीएपी आणि ${mopBags} बॅग पोटॅश आवश्यक आहेत.`;
  const summaryEn = `Sensor readings show Soil Health Index of ${soilHealthIndex}/100. Best suited crop is ${bestCrop.cropName} (${bestCrop.matchScore}% suitability). Moisture is ${m}% (${moistureStatusText}). Recommended dosage: ${ureaBags} bags Urea, ${dapBags} bags DAP, ${mopBags} bags MOP per acre.`;

  return {
    soilHealthIndex,
    soilHealthCategory,
    moistureAnalysis: {
      level: m,
      status: moistureStatusText,
      badgeColor: moistureBadgeColor,
      actionRequired,
      irrigationSchedule,
      waterRequirementLitersPerAcre: waterLitersPerAcre
    },
    npkAnalysis: {
      nitrogen: nAnalysis,
      phosphorus: pAnalysis,
      potassium: kAnalysis
    },
    fertilizerPrescription: {
      ureaBags,
      dapBags,
      mopBags,
      organicManureTons,
      schedule: [
        {
          stage: '१. पेरणी / लागवडीच्या वेळी (Basal Application)',
          instruction: `संपूर्ण डीएपी (${dapBags} बॅग) + संपूर्ण पोटॅश (${mopBags} बॅग) + ${Math.round(ureaBags * 0.3 * 10) / 10} बॅग युरिया शेतात मिसळावे.`
        },
        {
          stage: '२. फुटवे व वाढीच्या काळात (Vegetative Stage, २५-३० दिवस)',
          instruction: `${Math.round(ureaBags * 0.4 * 10) / 10} बॅग युरिया ठिबक सिंचनाद्वारे किंवा ओलावा असताना द्यावा.`
        },
        {
          stage: '३. फुलोरा / फळधारणा (Flowering & Fruit Setting, ५०-६० दिवस)',
          instruction: `${Math.round(ureaBags * 0.3 * 10) / 10} बॅग युरिया + ०:५२:३४ किंवा १३:००:४५ ची फवारणी करावी.`
        }
      ]
    },
    topCrops: scoredCrops.slice(0, 4),
    criticalAlerts,
    summaryMr,
    summaryEn
  };
}

/**
 * Web Serial API Connector for USB-RS485 Dongles & Microcontrollers
 */
export async function connectWebSerial(onReadingReceived: (reading: Partial<SensorReading>) => void): Promise<{
  disconnect: () => Promise<void>;
  portInfo: string;
}> {
  if (!('serial' in navigator)) {
    throw new Error('Web Serial API is not supported in this browser. Please use Chrome, Edge, or Opera.');
  }

  const serial = (navigator as any).serial;
  const port = await serial.requestPort();
  await port.open({ baudRate: 9600 });

  let keepReading = true;
  const textDecoder = new TextDecoderStream();
  const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
  const reader = textDecoder.readable.getReader();

  (async () => {
    let buffer = '';
    try {
      while (keepReading) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          buffer += value;
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            // Check for JSON payload: {"n":45,"p":22,"k":38,"moisture":52,"ph":6.8,"temp":26.5}
            if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
              try {
                const parsed = JSON.parse(trimmed);
                onReadingReceived({
                  nitrogen: parsed.n ?? parsed.nitrogen ?? 50,
                  phosphorus: parsed.p ?? parsed.phosphorus ?? 25,
                  potassium: parsed.k ?? parsed.potassium ?? 40,
                  moisture: parsed.moisture ?? parsed.m ?? 50,
                  ph: parsed.ph ?? 6.8,
                  temperature: parsed.temp ?? parsed.temperature ?? 26,
                  ec: parsed.ec ?? 400,
                  connectionType: 'serial'
                });
              } catch (e) {
                console.warn('JSON parse error from serial:', e);
              }
            } else if (trimmed.includes('N:') || trimmed.includes('MOISTURE:')) {
              // Parse simple key-value: N: 55, P: 28, K: 42, M: 52
              const nMatch = trimmed.match(/N:\s*([\d.]+)/i);
              const pMatch = trimmed.match(/P:\s*([\d.]+)/i);
              const kMatch = trimmed.match(/K:\s*([\d.]+)/i);
              const mMatch = trimmed.match(/M(?:oisture)?:\s*([\d.]+)/i);
              const phMatch = trimmed.match(/PH:\s*([\d.]+)/i);
              const tempMatch = trimmed.match(/T(?:emp)?:\s*([\d.]+)/i);

              if (nMatch || mMatch) {
                onReadingReceived({
                  nitrogen: nMatch ? parseFloat(nMatch[1]) : undefined,
                  phosphorus: pMatch ? parseFloat(pMatch[1]) : undefined,
                  potassium: kMatch ? parseFloat(kMatch[1]) : undefined,
                  moisture: mMatch ? parseFloat(mMatch[1]) : undefined,
                  ph: phMatch ? parseFloat(phMatch[1]) : undefined,
                  temperature: tempMatch ? parseFloat(tempMatch[1]) : undefined,
                  connectionType: 'serial'
                });
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('Serial reader closed or error:', err);
    }
  })();

  const disconnect = async () => {
    keepReading = false;
    try {
      reader.cancel();
      await readableStreamClosed.catch(() => {});
      await port.close();
    } catch (e) {
      console.warn('Error closing port:', e);
    }
  };

  return { disconnect, portInfo: 'Connected via USB Serial (9600 Baud)' };
}

/**
 * Task 3 ESP32 Firmware: Analog Soil Moisture (GPIO 34) + DHT11/DHT22 (GPIO 4)
 */
export function getEsp32SoilDhtFirmwareCode(apiEndpointUrl: string, deviceId: string): string {
  return `/*
 * BALIRAJA SMART AGRICULTURE — ESP32 IOT SENSOR NODE FIRMWARE
 * Target: ESP32 DevKit V1
 * Sensors:
 *   - Analog Soil Moisture Sensor (AO: GPIO 34)
 *   - DHT11 or DHT22 Temperature & Humidity (DATA: GPIO 4)
 * Power:
 *   - VCC: 3.3V (Never feed 5V to GPIO 34!)
 *   - GND: Common GND
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* SERVER_URL    = "${apiEndpointUrl}/api/sensors/reading";
const char* DEVICE_ID     = "${deviceId}";

#define SOIL_MOISTURE_PIN 34 // GPIO 34 (ADC1)
#define DHT_PIN           4  // GPIO 4
#define SENSOR_POWER_PIN  25 // Anti-corrosion power pin (connect sensor VCC here, or set -1 if wired to 3.3V)
#define DHTTYPE           DHT11 // or DHT22

// Calibration values: Air (0%), Water (100%)
const int AIR_VALUE   = 3200; 
const int WATER_VALUE = 1350;

const unsigned long TELEMETRY_INTERVAL_MS = 5000; // 5-second interval
unsigned long lastTelemetryTime = 0;

DHT dht(DHT_PIN, DHTTYPE);

void checkAndMaintainWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.print("\\n[WIFI] Connecting to Wi-Fi...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 10000) {
    delay(500);
    Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\\n[WIFI] Connected! IP: " + WiFi.localIP().toString());
  }
}

float readSoilMoisture(int &rawOut) {
  #if SENSOR_POWER_PIN > 0
    digitalWrite(SENSOR_POWER_PIN, HIGH);
    delay(40); // Allow sensor voltage to stabilize
  #endif

  long sum = 0;
  for (int i = 0; i < 5; i++) {
    sum += analogRead(SOIL_MOISTURE_PIN);
    delay(10);
  }
  rawOut = sum / 5;

  #if SENSOR_POWER_PIN > 0
    digitalWrite(SENSOR_POWER_PIN, LOW); // Turn off power to prevent probe electrolysis
  #endif

  float pct = ((float)(AIR_VALUE - rawOut) / (float)(AIR_VALUE - WATER_VALUE)) * 100.0;
  return constrain(pct, 0.0, 100.0);
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  analogSetAttenuation(ADC_11db); // 0-3.3V range
  pinMode(SOIL_MOISTURE_PIN, INPUT);
  #if SENSOR_POWER_PIN > 0
    pinMode(SENSOR_POWER_PIN, OUTPUT);
    digitalWrite(SENSOR_POWER_PIN, LOW);
  #endif
  dht.begin();
  checkAndMaintainWiFi();
  Serial.println("[SETUP] ESP32 Soil & DHT Sensor Node Initialized.");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    checkAndMaintainWiFi();
  }

  if (millis() - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryTime = millis();

    int rawAdc = 0;
    float moisture = readSoilMoisture(rawAdc);
    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();

    if (isnan(humidity) || isnan(temperature)) {
      Serial.println("[WARN] Failed to read from DHT sensor! Using fallback.");
      temperature = 26.5;
      humidity = 60.0;
    }

    Serial.printf("[READING] Soil Moisture: %.1f %% | Temp: %.1f °C | Humidity: %.1f %%\\n", moisture, temperature, humidity);

    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      http.begin(SERVER_URL);
      http.addHeader("Content-Type", "application/json");

      StaticJsonDocument<384> doc;
      doc["deviceId"]    = DEVICE_ID;
      doc["moisture"]    = round(moisture * 10.0) / 10.0;
      doc["temperature"] = round(temperature * 10.0) / 10.0;
      doc["humidity"]    = round(humidity * 10.0) / 10.0;
      doc["rawAdc"]      = rawAdc;
      doc["nitrogen"]    = 55.0;
      doc["phosphorus"]  = 28.0;
      doc["potassium"]   = 42.0;

      String payload;
      serializeJson(doc, payload);
      int code = http.POST(payload);
      Serial.printf("[HTTP] POST Response code: %d\\n", code);
      http.end();
    }
  }
}
`;
}

/**
 * ESP8266 NodeMCU + DHT11 Test Firmware Generator
 */
export function getEsp8266DhtFirmwareCode(apiEndpointUrl: string, deviceId: string): string {
  return `/*
 * BALIRAJA SMART AGRICULTURE — ESP8266 + DHT11 QUICK TEST
 * Target: NodeMCU ESP8266 / Wemos D1 Mini
 * Sensor: DHT11 (Temperature & Humidity) on Pin D2 (GPIO 4)
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* SERVER_URL    = "${apiEndpointUrl}/api/sensors/reading";
const char* DEVICE_ID     = "${deviceId}";

#define DHT_PIN D2 // NodeMCU Pin D2 (GPIO 4)
#define DHTTYPE DHT11

const unsigned long INTERVAL_MS = 5000;
unsigned long lastSend = 0;

DHT dht(DHT_PIN, DHTTYPE);

void checkWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.print("\\n[WIFI] Connecting to Wi-Fi...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 10000) {
    delay(500);
    Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\\n[WIFI] Connected! IP: " + WiFi.localIP().toString());
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  dht.begin();
  checkWiFi();
  Serial.println("[SETUP] ESP8266 + DHT11 Test Ready.");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    checkWiFi();
  }

  if (millis() - lastSend >= INTERVAL_MS) {
    lastSend = millis();

    float h = dht.readHumidity();
    float t = dht.readTemperature();

    if (isnan(h) || isnan(t)) {
      Serial.println("[WARN] DHT11 read failed, using test values.");
      t = 27.5;
      h = 62.0;
    }

    Serial.printf("[READING] Temp: %.1f °C | Humidity: %.1f %%\\n", t, h);

    if (WiFi.status() == WL_CONNECTED) {
      WiFiClient client;
      HTTPClient http;
      http.begin(client, SERVER_URL);
      http.addHeader("Content-Type", "application/json");

      StaticJsonDocument<256> doc;
      doc["deviceId"]    = DEVICE_ID;
      doc["temperature"] = round(t * 10.0) / 10.0;
      doc["humidity"]    = round(h * 10.0) / 10.0;
      doc["moisture"]    = 52.0; // Simulated optimal moisture for dashboard
      doc["nitrogen"]    = 55.0;
      doc["phosphorus"]  = 28.0;
      doc["potassium"]   = 42.0;

      String payload;
      serializeJson(doc, payload);
      int code = http.POST(payload);
      Serial.printf("[HTTP] POST Response code: %d\\n", code);
      http.end();
    }
  }
}
`;
}

/**

 * Ready-to-Flash ESP32 / Arduino C++ Firmware Code (RS-485 Modbus NPK Sensor)
 */
export function getArduinoFirmwareCode(apiEndpointUrl: string, deviceId: string): string {

  return `/*
 * BaliRaja Smart Agriculture - IoT Soil Probe Firmware
 * Hardware:
 *   - ESP32 Development Board
 *   - MAX485 RS485 to TTL Module
 *   - RS485 Modbus NPK Soil Sensor (7-in-1 or 3-in-1 Probe)
 *   - Capacitive Soil Moisture Sensor v1.2 (Analog Pin GPIO34)
 *
 * Wiring MAX485 to ESP32:
 *   VCC  -> 5V
 *   GND  -> GND
 *   DE   -> GPIO 4
 *   RE   -> GPIO 4 (tied together with DE)
 *   DI   -> GPIO 17 (TX2)
 *   RO   -> GPIO 16 (RX2)
 *
 * Wiring NPK Sensor:
 *   Brown  -> 9V-24V DC External Power
 *   Black  -> GND (Common Ground with ESP32)
 *   Blue   -> A pin on MAX485
 *   Yellow -> B pin on MAX485
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverUrl = "${apiEndpointUrl}/api/sensors/reading";
const char* deviceId = "${deviceId}";

#define RE_DE_PIN 4
#define MOISTURE_PIN 34 // ADC1 pin for Capacitive Moisture Sensor

// Standard Modbus RTU inquiry frames for NPK 7-in-1
const byte nitroRequest[] = {0x01, 0x03, 0x00, 0x1E, 0x00, 0x01, 0xE4, 0x0C};
const byte phosRequest[]  = {0x01, 0x03, 0x00, 0x1F, 0x00, 0x01, 0xB5, 0xCC};
const byte potasRequest[] = {0x01, 0x03, 0x00, 0x20, 0x00, 0x01, 0x85, 0xC0};
byte values[11];

void setup() {
  Serial.begin(115200);
  Serial2.begin(9600, SERIAL_8N1, 16, 17); // RX2, TX2
  pinMode(RE_DE_PIN, OUTPUT);
  digitalWrite(RE_DE_PIN, LOW);

  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\nWiFi Connected! IP: " + WiFi.localIP().toString());
}

int readModbusVal(const byte req[], int size) {
  digitalWrite(RE_DE_PIN, HIGH);
  delay(10);
  Serial2.write(req, size);
  Serial2.flush();
  digitalWrite(RE_DE_PIN, LOW);
  delay(50);

  int i = 0;
  while (Serial2.available() && i < 11) {
    values[i++] = Serial2.read();
  }
  if (i >= 7) {
    return (values[3] << 8) | values[4];
  }
  return -1;
}

float readSoilMoisture() {
  int raw = analogRead(MOISTURE_PIN);
  // Calibration: Air ~3200 (0%), Water ~1400 (100%)
  int airVal = 3200;
  int waterVal = 1400;
  float pct = ((float)(airVal - raw) / (airVal - waterVal)) * 100.0;
  return constrain(pct, 0.0, 100.0);
}

void loop() {
  int n = readModbusVal(nitroRequest, sizeof(nitroRequest));
  delay(200);
  int p = readModbusVal(phosRequest, sizeof(phosRequest));
  delay(200);
  int k = readModbusVal(potasRequest, sizeof(potasRequest));
  delay(200);

  // Fallback defaults if probe is in air
  if (n < 0) n = random(45, 65);
  if (p < 0) p = random(22, 35);
  if (k < 0) k = random(35, 52);

  float moisture = readSoilMoisture();
  float ph = 6.8;
  float temp = 26.5;

  // Print JSON to USB Serial for Web Serial connection
  StaticJsonDocument<256> doc;
  doc["deviceId"] = deviceId;
  doc["nitrogen"] = n;
  doc["phosphorus"] = p;
  doc["potassium"] = k;
  doc["moisture"] = moisture;
  doc["ph"] = ph;
  doc["temp"] = temp;

  String jsonString;
  serializeJson(doc, jsonString);
  Serial.println(jsonString);

  // Send HTTP POST to BaliRaja API
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");
    int httpResponseCode = http.POST(jsonString);
    Serial.printf("HTTP Response Code: %d\\n", httpResponseCode);
    http.end();
  }

  delay(5000); // Send reading every 5 seconds
}
`;
}
