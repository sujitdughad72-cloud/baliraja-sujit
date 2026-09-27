
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
