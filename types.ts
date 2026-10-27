
export interface Product {
  id: string;
  name: string;
  category: 'Vegetables' | 'Fruits' | 'Grains' | 'Spices' | 'Others';
  price: number;
  unit: string;
  farmerName: string;
  farmerUid: string;
  location: string;
  image: string;
  description: string;
  createdAt?: any;
}

export interface User {
  uid: string;
  name: string;
  role: 'farmer' | 'buyer' | 'admin';
  phone: string;
  email?: string;
  lastSeen?: any;
}

export interface MarketTrend {
  name: string;
  currentPrice: number;
  lastWeekPrice: number;
}

export interface CropInsight {
  id?: string;
  cropName: string;
  region: string;
  farmerCount: number;
  realFarmerCount: number;
  totalFarmersInRegion: number;
  percentage: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  lastUpdated: any;
}

export interface FarmerPlan {
  id?: string;
  farmerUid: string;
  farmerName: string;
  region: string;
  plannedCrop: string;
  season: string;
  timestamp: any;
}

export interface AIAdvisory {
  riskExplanation: string;
  alternativeCrops: {
    name: string;
    benefit: string;
    demandGap: string;
  }[];
  marathiAdvice: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface Alert {
  id: string;
  type: 'power' | 'weather' | 'irrigation' | 'market';
  title: string;
  message: string;
  time: string;
  severity: 'low' | 'medium' | 'high';
  createdAt?: any;
}

export interface SensorReading {
  id?: string;
  deviceId: string;
  deviceName?: string;
  nitrogen: number;       // mg/kg
  phosphorus: number;     // mg/kg
  potassium: number;      // mg/kg
  moisture: number;       // % volumetric soil moisture
  ph: number;             // pH value (3.5 - 9.5)
  temperature: number;    // °C
  ec?: number;            // Electrical Conductivity µS/cm
  battery?: number;       // %
  timestamp: string;
  connectionType?: 'serial' | 'ble' | 'wifi' | 'simulated';
}

export interface SensorPredictionResult {
  soilHealthIndex: number;
  soilHealthCategory: string;
  moistureAnalysis: {
    level: number;
    status: string;
    badgeColor: string;
    actionRequired: string;
    irrigationSchedule: string;
    waterRequirementLitersPerAcre: number;
  };
  npkAnalysis: {
    nitrogen: { value: number; status: string; deficit: number; target: number };
    phosphorus: { value: number; status: string; deficit: number; target: number };
    potassium: { value: number; status: string; deficit: number; target: number };
  };
  fertilizerPrescription: {
    ureaBags: number;
    dapBags: number;
    mopBags: number;
    organicManureTons: number;
    schedule: { stage: string; instruction: string }[];
  };
  topCrops: {
    id: string;
    cropName: string;
    cropNameMr: string;
    cropNameHi: string;
    matchScore: number;
    expectedYield: string;
    estimatedIncomePerAcre: string;
    durationDays: number;
    tips: string;
  }[];
  criticalAlerts: string[];
  summaryMr: string;
  summaryEn: string;
}
