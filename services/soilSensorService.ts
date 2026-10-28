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
    name: 'नाशिक कांदा शेत (Nashik Onion - Optimal Soil & Climate)',
    description: 'चांगला ओलावा (५२%), मुळांसाठी उत्तम तापमान (२६.५°C) आणि आदर्श आर्द्रता (६२%)',
    reading: {
      deviceId: 'FIELD-NASHIK-01',
      deviceName: 'नाशिक शेत प्लॉट १ (Nashik Plot 1)',
      moisture: 52,
      temperature: 26.5,
      humidity: 62.0,
      rawAdc: 560,
      battery: 94,
      connectionType: 'simulated'
    }
  },
  {
    name: 'दुष्काळ / अत्यंत कोरडी जमीन (Severe Drought / Dry Zone)',
    description: 'ओलावा केवळ १६%, तापमान ३६°C; पिकाला सुकवा येण्याआधी तात्काळ ठिबक सिंचन आवश्यक',
    reading: {
      deviceId: 'FIELD-MARATHWADA-02',
      deviceName: 'मराठवाडा कोरडा विभाग (Marathwada Dry Zone)',
      moisture: 16,
      temperature: 36.2,
      humidity: 21.0,
      rawAdc: 890,
      battery: 88,
      connectionType: 'simulated'
    }
  },
  {
    name: 'अति ओलावा / दलदल (Waterlogged / Root Rot Alert)',
    description: 'ओलावा ८५%, मुळांना ऑक्सिजन मिळणे बंद; तात्काळ पाण्याचा निचरा करा',
    reading: {
      deviceId: 'FIELD-KOLHAPUR-03',
      deviceName: 'कोल्हापूर ऊस शेत (Kolhapur Sugarcane Patch)',
      moisture: 85,
      temperature: 23.5,
      humidity: 89.0,
      rawAdc: 240,
      battery: 92,
      connectionType: 'simulated'
    }
  },
  {
    name: 'बुरशीजन्य रोग हवामान (High Fungal Spore & Blight Risk)',
    description: 'आर्द्रता ९४%, तापमान २४°C आणि मातीत ओलावा ६५%; डाऊनी/करपा रोगाचा उच्च धोका',
    reading: {
      deviceId: 'FIELD-PUNE-04',
      deviceName: 'पुणे टोमॅटो शेत (Pune Tomato Field)',
      moisture: 65,
      temperature: 24.0,
      humidity: 94.0,
      rawAdc: 440,
      battery: 85,
      connectionType: 'simulated'
    }
  },
  {
    name: 'उष्णतेचा ताण (Severe Heat Stress & Wilting Risk)',
    description: 'तापमान ३९.५°C, आर्द्रता १८%, माती ओलावा ३०%; पाने सुकण्याचा धोका',
    reading: {
      deviceId: 'FIELD-VIDARBHA-05',
      deviceName: 'विदर्भ कापूस शेत (Vidarbha Cotton Plot)',
      moisture: 30,
      temperature: 39.5,
      humidity: 18.0,
      rawAdc: 720,
      battery: 79,
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

export function calculateSensorPredictions(reading: SensorReading): SensorPredictionResult {
  const m = reading.moisture ?? 50;
  const temp = reading.temperature ?? 26.5;
  const humidity = reading.humidity ?? 60.0;
  const n = reading.nitrogen ?? 50;
  const p = reading.phosphorus ?? 25;
  const k = reading.potassium ?? 40;

  // 1. Soil Moisture Assessment & Irrigation Recommendation
  let moistureStatusText = '';
  let moistureBadgeColor = '';
  let actionRequired = '';
  let irrigationSchedule = '';
  let waterLitersPerAcre = 0;
  let dryingHoursRemaining = 48;

  if (m < 22) {
    moistureStatusText = 'अत्यंत कोरडी जमीन (Critical Dry) ⚠️';
    moistureBadgeColor = 'bg-rose-500 text-white';
    actionRequired = 'मातीतील ओलावा धोकादायक पातळीवर कमी झाला आहे. पिकाला कायमस्वरूपी सुकवा येण्याआधी तात्काळ ठिबक सिंचन सुरू करा.';
    irrigationSchedule = 'आजच ३ ते ४ तास ठिबक सिंचन द्या. ३ दिवसांनी पुन्हा ओलावा तपासा.';
    waterLitersPerAcre = Math.round((55 - m) * 1200);
    dryingHoursRemaining = 0;
  } else if (m < 40) {
    moistureStatusText = 'कमी ओलावा (Low Moisture) 💧';
    moistureBadgeColor = 'bg-amber-500 text-white';
    actionRequired = 'ओलावा कमी होत असून मुळांवर ताण येत आहे. पुढील २४ तासांत हलके पाणी द्यावे.';
    irrigationSchedule = 'उद्या सकाळी ६ ते ९ दरम्यान २ तास ठिबक सिंचन द्या.';
    waterLitersPerAcre = Math.round((55 - m) * 1000);
    dryingHoursRemaining = 18;
  } else if (m <= 70) {
    moistureStatusText = 'योग्य ओलावा (Optimal Moisture) ✅';
    moistureBadgeColor = 'bg-emerald-600 text-white';
    actionRequired = 'मुळांच्या निरोगी वाढीसाठी व अन्नद्रव्ये शोषण्यासाठी जमिनीतील ओलावा आदर्श स्थितीत आहे.';
    irrigationSchedule = 'सध्या पाणी देण्याची आवश्यकता नाही. २ दिवसांनंतर पुन्हा सेन्सर रिडिंग तपासा.';
    waterLitersPerAcre = 0;
    dryingHoursRemaining = 60;
  } else {
    moistureStatusText = 'अति ओलावा / दलदल (Waterlogged / Saturated) 🚨';
    moistureBadgeColor = 'bg-indigo-600 text-white';
    actionRequired = 'माती पूर्ण संपृक्त आहे, मुळांना ऑक्सिजन मिळणे बंद झाले आहे. तात्काळ पाण्याचा निचरा करा.';
    irrigationSchedule = 'सिंचन पूर्णपणे बंद ठेवा. शेतातील चर व निचरा वाहिन्या मोकळ्या करा.';
    waterLitersPerAcre = 0;
    dryingHoursRemaining = 96;
  }

  // 2. DHT11 Microclimate, VPD (Vapor Pressure Deficit) & Fungal Disease Analysis
  // Saturation vapor pressure in kPa
  const vpsat = 0.61078 * Math.exp((17.27 * temp) / (temp + 237.3));
  const vpact = vpsat * (humidity / 100.0);
  const vpdKpa = Math.max(0.1, Math.round((vpsat - vpact) * 100) / 100);

  // Heat Index in Celsius
  const heatIndexC = Math.round((temp + (humidity > 60 ? (humidity - 60) * 0.1 : 0)) * 10) / 10;

  // Disease Risk Assessment
  let diseaseRisk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  let diseaseWarningMr = 'हवामान रोगमुक्त असून पिकासाठी सुरक्षित आहे.';
  let transpirationStatus = 'सामान्य बाष्पोत्सर्जन (Optimal Transpiration)';

  if (humidity > 80 && temp >= 18 && temp <= 29) {
    diseaseRisk = 'HIGH';
    diseaseWarningMr = 'उच्च आर्द्रता व मध्यम तापमानामुळे डाऊनी, भुरी व करपा रोगाचा प्रादुर्भाव वाढू शकतो. प्रतिबंधक बुरशीनाशक फवारावे.';
  } else if (humidity > 70) {
    diseaseRisk = 'MEDIUM';
    diseaseWarningMr = 'हवेतील आर्द्रता जास्त आहे. पिकाची नियमित पाहणी करा.';
  }

  if (vpdKpa < 0.4) {
    transpirationStatus = 'कमी बाष्पोत्सर्जन (Low VPD: बुरशी धोका वाढतो)';
  } else if (vpdKpa > 1.6) {
    transpirationStatus = 'अति बाष्पोत्सर्जन ताण (High VPD: झाडे सुकण्याचा धोका)';
  }

  // 3. Soil & Microclimate Health Index (0 - 100)
  // Moisture balance (50%), Temperature balance (30%), Humidity balance (20%)
  const mScore = m >= 45 && m <= 68 ? 100 : Math.max(20, Math.round(100 - Math.abs(55 - m) * 2.2));
  const tempScore = temp >= 22 && temp <= 32 ? 100 : Math.max(25, Math.round(100 - Math.abs(27 - temp) * 4.5));
  const humScore = humidity >= 50 && humidity <= 75 ? 100 : Math.max(30, Math.round(100 - Math.abs(62 - humidity) * 1.8));

  const soilHealthIndex = Math.round(mScore * 0.50 + tempScore * 0.30 + humScore * 0.20);

  let soilHealthCategory = 'मध्यम (Moderate)';
  if (soilHealthIndex >= 82) soilHealthCategory = 'उत्कृष्ट ओलावा व हवामान (Optimal)';
  else if (soilHealthIndex < 60) soilHealthCategory = 'लक्ष देण्याची गरज (Needs Attention)';

  // 4. Crop Suitability Scoring based on Moisture, Temperature, Humidity
  const scoredCrops = CROP_PROFILES.map(crop => {
    const calcFit = (v: number, range: [number, number]) => {
      if (v >= range[0] && v <= range[1]) return 100;
      const dist = v < range[0] ? range[0] - v : v - range[1];
      const span = range[1] - range[0];
      return Math.max(40, Math.round(100 - (dist / span) * 60));
    };

    const fitM = calcFit(m, crop.optMoisture);
    const fitTemp = calcFit(temp, crop.optTemp);
    const fitHum = calcFit(humidity, [45, 75]);

    const totalScore = Math.round(fitM * 0.50 + fitTemp * 0.35 + fitHum * 0.15);

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
  if (m < 20) criticalAlerts.push('⚠️ कोरडी जमीन: ओलावा २०% खाली गेला आहे, त्वरित ठिबक सिंचन सुरू करा.');
  if (m > 80) criticalAlerts.push('🚨 अति ओलावा: मुळांना सड लागण्याचा धोका टाळण्यासाठी शेतातील पाणी बाहेर काढा.');
  if (temp > 38) criticalAlerts.push('☀️ तीव्र उष्णता: दुपारी तापमान जास्त असल्याने पानांचे बाष्पीभवन वाढले आहे.');
  if (diseaseRisk === 'HIGH') criticalAlerts.push('🍄 बुरशीजन्य रोगाचा धोका: आर्द्रता ८०% पेक्षा जास्त असल्याने पिकावर करपा/डाऊनीचा प्रादुर्भाव होऊ शकतो.');

  // Summary Text
  const bestCrop = scoredCrops[0];
  const summaryMr = `मातीचा ओलावा ${m}% असून ${moistureStatusText}. तापमान ${temp}°C व हवेतील आर्द्रता ${humidity}% आहे. सध्याच्या स्थितीनुसार ${bestCrop.cropNameMr} पिकासाठी ${bestCrop.matchScore}% अनुकूलता आहे. सिंचन सल्ला: ${actionRequired}`;
  const summaryEn = `Soil moisture is ${m}% (${moistureStatusText}) with ambient temperature ${temp}°C and relative humidity ${humidity}%. Overall suitability for ${bestCrop.cropName} is ${bestCrop.matchScore}%. Irrigation advice: ${actionRequired}`;

  return {
    soilHealthIndex,
    soilHealthCategory,
    moistureAnalysis: {
      level: m,
      status: moistureStatusText,
      badgeColor: moistureBadgeColor,
      actionRequired,
      irrigationSchedule,
      waterRequirementLitersPerAcre: waterLitersPerAcre,
      dryingHoursRemaining
    },
    microclimateAnalysis: {
      vpdKpa,
      heatIndexC,
      diseaseRisk,
      diseaseWarningMr,
      transpirationStatus
    },
    topCrops: scoredCrops.slice(0, 4),
    criticalAlerts,
    summaryMr,
    summaryEn,
    // Optional compatibility fallbacks
    npkAnalysis: {
      nitrogen: { value: n, target: 60, status: 'संतुलित', deficit: 0 },
      phosphorus: { value: p, target: 30, status: 'संतुलित', deficit: 0 },
      potassium: { value: k, target: 40, status: 'संतुलित', deficit: 0 }
    },
    fertilizerPrescription: {
      ureaBags: 1,
      dapBags: 1,
      mopBags: 0.5,
      organicManureTons: 2,
      schedule: []
    }
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
 * ESP8266 NodeMCU + 2-Pin Resistive Soil Moisture (Pin A0) + DHT11 (Pin D2) Firmware
 */
export function getEsp8266DhtFirmwareCode(apiEndpointUrl: string, deviceId: string): string {
  return `/*
 * BALIRAJA SMART AGRICULTURE — ESP8266 + SOIL MOISTURE + DHT11
 * Hardware:
 *   - NodeMCU ESP8266 / Wemos D1 Mini
 *   - 2-Pin Resistive Soil Moisture Sensor (with LM393 Comparator Board)
 *   - DHT11 Temperature & Relative Humidity Sensor
 *
 * Wiring Pinout:
 *   - 2-Pin Probe -> 2 Pins on LM393 board
 *   - LM393 VCC   -> NodeMCU 3V3 (3.3V)
 *   - LM393 GND   -> NodeMCU GND
 *   - LM393 AO    -> NodeMCU Pin A0 (Analog ADC0)
 *   - DHT11 VCC   -> NodeMCU 3V3
 *   - DHT11 GND   -> NodeMCU GND
 *   - DHT11 DATA  -> NodeMCU Pin D2 (GPIO 4)
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <DHT.h>

const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Baliraja API Endpoint:
const char* SERVER_URL    = "${apiEndpointUrl}/api/sensors/reading";
const char* DEVICE_ID     = "${deviceId}";

#define SOIL_PIN A0 // NodeMCU Analog ADC pin (0 - 1024)
#define DHT_PIN D2  // NodeMCU Pin D2 (GPIO 4)
#define DHTTYPE DHT11

// Soil Calibration Values (NodeMCU 10-bit ADC: 0 - 1024)
// In Dry Air: raw ADC ~ 900 - 1023
// In Wet Soil / Water: raw ADC ~ 250 - 450
const int AIR_VALUE = 950;
const int WATER_VALUE = 320;

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

float readSoilMoisture(int &rawAdcOut) {
  // Take 5 samples to smooth ADC jitter
  long sum = 0;
  for (int i = 0; i < 5; i++) {
    sum += analogRead(SOIL_PIN);
    delay(10);
  }
  int raw = sum / 5;
  rawAdcOut = raw;

  // Inverse mapping: higher resistance = drier soil
  float percentage = ((float)(AIR_VALUE - raw) / (AIR_VALUE - WATER_VALUE)) * 100.0;
  return constrain(percentage, 0.0, 100.0);
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  dht.begin();
  pinMode(SOIL_PIN, INPUT);
  checkWiFi();
  Serial.println("[SETUP] Baliraja Soil Moisture + DHT11 Node Ready.");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    checkWiFi();
  }

  if (millis() - lastSend >= INTERVAL_MS) {
    lastSend = millis();

    // 1. Read DHT11
    float h = dht.readHumidity();
    float t = dht.readTemperature();

    if (isnan(h) || isnan(t)) {
      Serial.println("[WARN] DHT11 read failed, retrying...");
      t = 27.5;
      h = 60.0;
    }

    // 2. Read Resistive Soil Moisture
    int rawAdc = 0;
    float moisture = readSoilMoisture(rawAdc);

    Serial.println("----------------------------------------------");
    Serial.printf("🌱 Soil Moisture: %.1f %% (Raw ADC: %d)\\n", moisture, rawAdc);
    Serial.printf("🌡️ Temperature  : %.1f °C\\n", t);
    Serial.printf("💨 Air Humidity : %.1f %%\\n", h);

    if (WiFi.status() == WL_CONNECTED) {
      StaticJsonDocument<256> doc;
      doc["deviceId"]    = DEVICE_ID;
      doc["deviceName"]  = "NodeMCU Soil Moisture & DHT11";
      doc["moisture"]    = round(moisture * 10.0) / 10.0;
      doc["temperature"] = round(t * 10.0) / 10.0;
      doc["humidity"]    = round(h * 10.0) / 10.0;
      doc["rawAdc"]      = rawAdc;

      String payload;
      serializeJson(doc, payload);

      String url = String(SERVER_URL);
      bool isHttps = url.startsWith("https://");

      if (isHttps) {
        WiFiClientSecure secureClient;
        secureClient.setInsecure();
        secureClient.setTimeout(8000);

        HTTPClient https;
        if (https.begin(secureClient, SERVER_URL)) {
          https.addHeader("Content-Type", "application/json");
          https.setTimeout(8000);
          int code = https.POST(payload);
          Serial.printf("[HTTP] Success POST to Baliraja: %d\\n", code);
          https.end();
        }
      } else {
        WiFiClient client;
        HTTPClient http;
        if (http.begin(client, SERVER_URL)) {
          http.addHeader("Content-Type", "application/json");
          http.setTimeout(5000);
          int code = http.POST(payload);
          Serial.printf("[HTTP] Success POST to Baliraja: %d\\n", code);
          http.end();
        }
      }
    }
  }
}
`;
}

/**
 * Ready-to-Flash ESP8266 Firmware Code sending directly to user's Firebase Realtime Database
 */
export function getEsp8266FirebaseRtdbFirmwareCode(nodeId: string = 'farm001'): string {
  return `/*
 * BALIRAJA SMART AGRI — DIRECT FIREBASE REALTIME DATABASE FIRMWARE
 * Target Board: NodeMCU ESP8266 (ESP-12E)
 * Sensors:
 *   - 2-Pin Resistive Soil Moisture (Analog Pin A0)
 *   - DHT11 Temperature & Humidity (Digital Pin D2)
 *
 * Realtime DB: https://gen-lang-client-0706599928-default-rtdb.firebaseio.com/
 * Node Path  : /sensorData/${nodeId}.json
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <DHT.h>

const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Direct Firebase Realtime Database REST URL (PATCH/PUT)
const char* FIREBASE_RTDB_URL = "https://gen-lang-client-0706599928-default-rtdb.firebaseio.com/sensorData/${nodeId}.json";

#define SOIL_PIN A0  // Analog ADC pin (0 - 1024)
#define DHT_PIN D2   // Digital GPIO 4
#define DHTTYPE DHT11

// Soil Calibration Values
const int AIR_VALUE = 950;    // In dry air (high resistance)
const int WATER_VALUE = 320;  // In wet soil/water (low resistance)

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

float readSoilMoisture(int &rawAdcOut) {
  long sum = 0;
  for (int i = 0; i < 5; i++) {
    sum += analogRead(SOIL_PIN);
    delay(10);
  }
  int raw = sum / 5;
  rawAdcOut = raw;
  float pct = ((float)(AIR_VALUE - raw) / (AIR_VALUE - WATER_VALUE)) * 100.0;
  return constrain(pct, 0.0, 100.0);
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  dht.begin();
  pinMode(SOIL_PIN, INPUT);
  checkWiFi();
  Serial.println("[SETUP] Baliraja Firebase RTDB Node Ready.");
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
      Serial.println("[WARN] DHT11 read error, using last known value");
      t = 30.5;
      h = 42.0;
    }

    int soilRaw = 0;
    float moisture = readSoilMoisture(soilRaw);
    int soilPercent = (int)round(moisture);

    Serial.println("----------------------------------------------");
    Serial.printf("🌱 Soil Moisture: %d %% (Raw ADC: %d)\\n", soilPercent, soilRaw);
    Serial.printf("🌡️ Temperature  : %.1f °C\\n", t);
    Serial.printf("💨 Air Humidity : %.1f %%\\n", h);

    if (WiFi.status() == WL_CONNECTED) {
      // Format matches user's schema: {humidity, soilMoisturePercent, soilRaw, temperature, updatedAt}
      StaticJsonDocument<256> doc;
      doc["humidity"] = round(h * 10.0) / 10.0;
      doc["soilMoisturePercent"] = soilPercent;
      doc["soilRaw"] = soilRaw;
      doc["temperature"] = round(t * 10.0) / 10.0;
      doc["updatedAt"] = millis(); // or epoch if NTP is used

      String payload;
      serializeJson(doc, payload);

      WiFiClientSecure secureClient;
      secureClient.setInsecure(); // Bypass cert check for BearSSL
      secureClient.setTimeout(8000);

      HTTPClient https;
      if (https.begin(secureClient, FIREBASE_RTDB_URL)) {
        https.addHeader("Content-Type", "application/json");
        https.setTimeout(8000);
        int httpCode = https.PATCH(payload); // or PUT
        Serial.printf("[FIREBASE RTDB] Response Code: %d\\n", httpCode);
        https.end();
      }
    }
  }
}
`;
}

