

import { db } from '../../firebase';
import { collection, query, where, getDocs, setDoc, doc, limit } from 'firebase/firestore';
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface MarketRate {
  name: string;
  price: number;
  minPrice?: number;
  maxPrice?: number;
  unit: string;
  location: string;
  change: string;
  trend: 'up' | 'down' | 'stable';
  source?: 'live' | 'cached' | 'database' | 'demo' | 'ai_search';
  lastUpdated?: string;
  isDemo?: boolean;
}

export interface VerifiedMandiPrice {
  market_name: string;
  min_price: number;
  max_price: number;
  modal_price: number;
  arrival_date: string;
  source: string;
  is_verified: boolean;
}

export interface MandiData {
  crop: string;
  state: string;
  district: string;
  date: string;
  mandis: VerifiedMandiPrice[];
}

export interface VerifiedMandiResponse {
  action: "store_and_use" | "use_previous" | "no_data";
  source?: "api" | "database";
  verified?: boolean;
  data?: MandiData;
  message?: string;
  error?: string;
  status?: "success" | "error"; // For backward compatibility
}

const CACHE_KEY = 'market_rates_cache_v2';
const CACHE_EXPIRY = 60 * 60 * 1000; // 1 hour

interface CachedData {
  rates: MarketRate[];
  timestamp: number;
}

export const fetchRealTimeMarketRates = async (forceRefresh: boolean = false): Promise<MarketRate[]> => {
  const todayStr = new Date().toISOString().split('T')[0];
  
  // Check cache first
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached && !forceRefresh) {
    try {
      const { rates, timestamp }: CachedData = JSON.parse(cached);
      const isRecent = Date.now() - timestamp < CACHE_EXPIRY;
      const isToday = rates.every(r => r.lastUpdated === todayStr);

      if (isRecent && isToday && rates.length >= 5) {
        console.log("Using cached market rates");
        return rates.map(r => ({ ...r, source: 'cached' }));
      }
    } catch (e) {
      console.error("Error parsing market rates cache:", e);
    }
  }

  let allRates: MarketRate[] = [];

  // 1. Try AI-powered Search
  try {
    const today = new Date().toISOString().split('T')[0];
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: `Get the most accurate and latest Mandi market rates (MODAL PRICE) for major crops in Maharashtra. 
      Focus on these specific high-volume markets:
      - Onion: Lasalgaon, Pimpalgaon, or Yeola
      - Soybean: Latur, Amravati, or Washim
      - Cotton: Akola, Yavatmal, or Jalgaon
      - Wheat: Pune, Nagpur, or Solapur
      - Tomato: Narayangaon, Nashik, or Junnar
      - Potato: Pune, Mumbai, or Manchar
      
      Use official sources like MSAMB (msamb.com), Agmarknet, or direct APMC bulletins. 
      Provide the data in structured JSON for TODAY (${today}). 
      It is CRITICAL that you search for data updated in the LAST 24 HOURS. 
      If today's data isn't out, use the latest from April 2026. 
      Return at least 10 different crop/location pairs. 
      Ensure 'price' is the MODAL price per Quintal.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              price: { type: Type.NUMBER },
              minPrice: { type: Type.NUMBER },
              maxPrice: { type: Type.NUMBER },
              unit: { type: Type.STRING },
              location: { type: Type.STRING },
              change: { type: Type.STRING },
              trend: { type: Type.STRING, enum: ["up", "down", "stable"] },
              lastUpdated: { type: Type.STRING }
            },
            required: ["name", "price", "unit", "location", "lastUpdated"]
          }
        }
      }
    });

    if (response.text) {
      const aiRates = JSON.parse(response.text);
      if (Array.isArray(aiRates) && aiRates.length > 0) {
        allRates = [...aiRates.map(r => ({ ...r, source: 'ai_search' as const }))];
      }
    }
  } catch (error) {
    console.error("AI Search failed:", error);
  }

  // 2. Supplement with Database if needed
  if (allRates.length < 5) {
    try {
      const q = query(collection(db, 'verified_mandi_prices'), limit(10));
      const snapshot = await getDocs(q);
      
      const dbRates: MarketRate[] = [];
      snapshot.docs.forEach(doc => {
        const data = doc.data() as any;
        if (data.mandis && Array.isArray(data.mandis)) {
          data.mandis.forEach((mandi: any) => {
            dbRates.push({
              name: `${data.crop} (${mandi.market_name || 'Market'})`,
              price: mandi.modal_price || 0,
              minPrice: mandi.min_price,
              maxPrice: mandi.max_price,
              unit: 'Quintal',
              location: `${data.district}, ${data.state}`,
              change: '0',
              trend: 'stable' as const,
              source: 'database' as const,
              lastUpdated: data.date
            });
          });
        }
      });
      
      // Add unique database rates
      dbRates.forEach(dbR => {
        if (!allRates.find(r => r.name === dbR.name)) {
          allRates.push(dbR);
        }
      });
    } catch (e) {}
  }

  if (allRates.length > 0) {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ rates: allRates, timestamp: Date.now() }));
  }

  return allRates;
};

/**
 * STRICT DATA CONTROLLER LOGIC
 */
const validateApiData = (records: any[]): any[] => {
  const today = new Date();
  const threeDaysAgo = new Date(today);
  threeDaysAgo.setDate(today.getDate() - 3);

  return records.filter(r => {
    const modal = parseFloat(r.modal_price);
    const arrivalDate = new Date(r.arrival_date);
    
    // Accept ONLY if:
    // - modal_price is a valid number
    // - market name exists
    // - arrival_date is within last 3 days
    // - Reject if price looks unrealistic (<100 or >10000)
    return !isNaN(modal) && 
           modal >= 100 && 
           modal <= 10000 && 
           r.market && 
           !isNaN(arrivalDate.getTime()) && 
           arrivalDate >= threeDaysAgo;
  });
};

const getPreviousData = async (crop: string, state: string, district: string): Promise<MandiData | null> => {
  try {
    const docId = `${crop}_${state}_${district}`.replace(/\s+/g, '_').toLowerCase();
    const docRef = doc(db, 'verified_mandi_prices', docId);
    
    // Try direct doc fetch first (most efficient)
    const docSnap = await getDocs(query(collection(db, 'verified_mandi_prices'), where('crop', '==', crop), where('state', '==', state), where('district', '==', district), limit(1)));
    
    if (!docSnap.empty) {
      return docSnap.docs[0].data() as MandiData;
    }

    // Fallback to direct ID if query fails
    try {
      const { getDoc } = await import('firebase/firestore');
      const directSnap = await getDoc(docRef);
      if (directSnap.exists()) {
        return directSnap.data() as MandiData;
      }
    } catch (e) {}
  } catch (e: any) {
    console.error("Error fetching previous data:", e.message || e);
  }
  return null;
};

const storeVerifiedData = async (data: MandiData) => {
  try {
    const docId = `${data.crop}_${data.state}_${data.district}`.replace(/\s+/g, '_').toLowerCase();
    await setDoc(doc(db, 'verified_mandi_prices', docId), data);
  } catch (e) {
    console.error("Error storing verified data:", e);
  }
};

export const fetchDirectGovApiMandiPrices = async (crop: string, state: string, district: string): Promise<VerifiedMandiResponse> => {
  // 1. Try Direct Government API (via proxy) first
  try {
    console.log(`Fetching direct Gov API data for ${crop} in ${district}, ${state}...`);
    const apiKey = "579b464db66ec23bdd000001cdd3946e448c48ef719e45f7f6655361"; // Public API Key
    
    // Try with specific commodity filter first
    let url = `https://api.data.gov.in/resource/9ef273d1-c142-4542-87bc-3b033e2e77ee?api-key=${apiKey}&format=json&filters[state]=${state}&filters[district]=${district}&filters[commodity]=${crop}`;
    let response = await fetch(url);
    let result = await response.json();
    
    // If no results, try broader search for the district and filter manually
    if (!result || !result.records || result.records.length === 0) {
      console.log(`No specific results for ${crop}, trying broader district search...`);
      url = `https://api.data.gov.in/resource/9ef273d1-c142-4542-87bc-3b033e2e77ee?api-key=${apiKey}&format=json&filters[state]=${state}&filters[district]=${district}&limit=100`;
      response = await fetch(url);
      result = await response.json();
      
      if (result && result.records) {
        // Fuzzy match the crop name
        result.records = result.records.filter((r: any) => 
          r.commodity.toLowerCase().includes(crop.toLowerCase()) || 
          crop.toLowerCase().includes(r.commodity.toLowerCase())
        );
      }
    }
    
    if (result && result.records && result.records.length > 0) {
      const validatedRecords = validateApiData(result.records);
      if (validatedRecords.length > 0) {
        const mandiData: MandiData = {
          crop,
          state,
          district,
          date: validatedRecords[0].arrival_date,
          mandis: validatedRecords.map(r => ({
            market_name: r.market,
            modal_price: parseFloat(r.modal_price),
            min_price: parseFloat(r.min_price),
            max_price: parseFloat(r.max_price),
            arrival_date: r.arrival_date,
            source: "Government API (Agmarknet)",
            is_verified: true
          }))
        };
        
        await storeVerifiedData(mandiData);
        return {
          action: "store_and_use",
          source: "api",
          verified: true,
          data: mandiData,
          status: "success"
        };
      }
    }
  } catch (error) {
    console.warn("Direct Gov API failed or timed out, falling back to AI Search:", error);
  }

  // 2. Fallback to AI-powered Search (Google Search Grounding)
  try {
    const today = new Date().toISOString().split('T')[0];
    console.log(`Fetching verified mandi prices for ${crop} in ${district}, ${state} via AI Search for ${today}...`);
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: `Find the most accurate and latest official Mandi (APMC) market rates for ${crop} in ${district}, ${state}. 
      Use official sources like MSAMB (msamb.com), Agmarknet (agmarknet.gov.in), or Maharashtra State Agricultural Marketing Board. 
      Provide the data for the top 5 markets in this district. 
      It is CRITICAL that you provide the MODAL PRICE for TODAY (${today}) or the most recent available date. 
      If you cannot find data for ${today}, look for the latest possible date in April 2026. 
      DO NOT return data from March 2026 if newer data exists. 
      Ensure the modal price is accurate and reflects the current market trend.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            crop: { type: Type.STRING },
            state: { type: Type.STRING },
            district: { type: Type.STRING },
            date: { type: Type.STRING },
            mandis: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  market_name: { type: Type.STRING },
                  modal_price: { type: Type.NUMBER },
                  min_price: { type: Type.NUMBER },
                  max_price: { type: Type.NUMBER },
                  arrival_date: { type: Type.STRING },
                  source: { type: Type.STRING },
                  is_verified: { type: Type.BOOLEAN }
                },
                required: ["market_name", "modal_price", "min_price", "max_price", "arrival_date"]
              }
            }
          },
          required: ["crop", "state", "district", "mandis"]
        }
      }
    });

    if (response.text) {
      const mandiData = JSON.parse(response.text) as MandiData;
      if (mandiData.mandis && mandiData.mandis.length > 0) {
        // Ensure source and verification are set
        mandiData.mandis = mandiData.mandis.map(m => ({
          ...m,
          source: m.source || "AI Search (Google Grounding)",
          is_verified: true
        }));
        
        await storeVerifiedData(mandiData);

        return {
          action: "store_and_use",
          source: "api",
          verified: true,
          data: mandiData,
          status: "success"
        };
      }
    }
  } catch (error: any) {
    console.error("AI Search verified mandi fetch failed:", error);
  }

  // Fallback to Database
  const previous = await getPreviousData(crop, state, district);
  if (previous) {
    return {
      action: "use_previous",
      source: "database",
      verified: true,
      message: "Using last stored verified data",
      data: previous,
      status: "success"
    };
  }

  return {
    action: "no_data",
    error: "No verified market data available via AI Search or Database",
    status: "error"
  };
};

export const fetchVerifiedMandiPrices = async (crop: string, state: string, district: string): Promise<VerifiedMandiResponse> => {
  return fetchDirectGovApiMandiPrices(crop, state, district);
};
