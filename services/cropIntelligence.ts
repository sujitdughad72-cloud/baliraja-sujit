import { collection, getDocs, query, where, orderBy, limit, Timestamp, addDoc, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Product, FarmerPlan, CropInsight, AIAdvisory } from '../types';
import { REGIONAL_STATUS, RABI_CROP_DISTRIBUTION, SUMMER_CROP_DISTRIBUTION, OFFICIAL_REPORT_DATE } from '../src/constants/officialCropReport';

interface OfficialReportData {
  reportDate: string;
  rabiDistribution: any[];
  summerDistribution: any[];
  regionalStatus: Record<string, any>;
  updatedAt: Timestamp;
}

/**
 * Fetches the latest official crop report from Firestore.
 * Fallbacks to local constants if no report is found in DB.
 */
export const getLatestOfficialReport = async (): Promise<OfficialReportData> => {
  try {
    const reportsRef = collection(db, 'officialReports');
    const q = query(reportsRef, orderBy('updatedAt', 'desc'), limit(1));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      return snapshot.docs[0].data() as OfficialReportData;
    }
  } catch (error) {
    console.error("Error fetching official report from DB:", error);
  }

  // Fallback to local constants
  return {
    reportDate: OFFICIAL_REPORT_DATE,
    rabiDistribution: RABI_CROP_DISTRIBUTION,
    summerDistribution: SUMMER_CROP_DISTRIBUTION,
    regionalStatus: REGIONAL_STATUS,
    updatedAt: Timestamp.now()
  };
};

/**
 * Seeds the official report data into Firestore if it doesn't exist.
 */
export const seedOfficialReport = async () => {
  try {
    const reportsRef = collection(db, 'officialReports');
    const q = query(reportsRef, where('reportDate', '==', OFFICIAL_REPORT_DATE));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      await addDoc(reportsRef, {
        reportDate: OFFICIAL_REPORT_DATE,
        rabiDistribution: RABI_CROP_DISTRIBUTION,
        summerDistribution: SUMMER_CROP_DISTRIBUTION,
        regionalStatus: REGIONAL_STATUS,
        updatedAt: Timestamp.now()
      });
      console.log("Official report seeded successfully.");
    }
  } catch (error) {
    console.error("Error seeding official report:", error);
  }
};

/**
 * Aggregates crop distribution data from products and farmer plans, 
 * and merges it with a realistic baseline from Gemini AI and official reports.
 */
export const getCropDistribution = async (region: string): Promise<CropInsight[]> => {
  const productsRef = collection(db, 'products');
  const plansRef = collection(db, 'farmerPlans');

  // Fetch latest official report
  const officialData = await getLatestOfficialReport();

  // Fetch current products in the region
  const productsQuery = query(productsRef, where('location', '==', region));
  const productsSnapshot = await getDocs(productsQuery);
  const products = productsSnapshot.docs.map(doc => doc.data() as Product);

  // Fetch future plans in the region
  const plansQuery = query(plansRef, where('region', '==', region));
  const plansSnapshot = await getDocs(plansQuery);
  const plans = plansSnapshot.docs.map(doc => doc.data() as FarmerPlan);

  const cropCounts: Record<string, number> = {};
  
  // Helper to normalize crop names
  const normalize = (name: string) => {
    const n = name.trim().toLowerCase();
    // Simple mapping for common crops to ensure consistency
    if (n.includes('onion') || n.includes('कांदा')) return 'Onion (कांदा)';
    if (n.includes('soybean') || n.includes('सोयाबीन')) return 'Soybean (सोयाबीन)';
    if (n.includes('cotton') || n.includes('कापूस')) return 'Cotton (कापूस)';
    if (n.includes('wheat') || n.includes('गहू')) return 'Wheat (गहू)';
    if (n.includes('grapes') || n.includes('द्राक्ष')) return 'Grapes (द्राक्ष)';
    if (n.includes('pomegranate') || n.includes('डाळिंब')) return 'Pomegranate (डाळिंब)';
    if (n.includes('tur') || n.includes('pigeon pea') || n.includes('तूर')) return 'Tur (तूर)';
    if (n.includes('methi') || n.includes('मेथी')) return 'Methi (मेथी)';
    if (n.includes('gram') || n.includes('हरभरा')) return 'Gram (हरभरा)';
    if (n.includes('jowar') || n.includes('ज्वारी')) return 'Jowar (ज्वारी)';
    if (n.includes('maize') || n.includes('मका')) return 'Maize (मका)';
    // Capitalize first letter if no match
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  // Aggregate current crops
  products.forEach(p => {
    const name = normalize(p.name);
    cropCounts[name] = (cropCounts[name] || 0) + 1;
  });

  // Aggregate planned crops
  plans.forEach(p => {
    const name = normalize(p.plannedCrop);
    cropCounts[name] = (cropCounts[name] || 0) + 1;
  });

  // Get baseline from official report if available
  let baseline: { cropName: string, percentage: number }[] = [];
  
  // Use official Rabi/Summer distribution as baseline
  // Since it's April, we use a mix of Rabi (harvesting) and Summer (sowing)
  baseline = [
    ...officialData.rabiDistribution.map(c => ({ cropName: c.name, percentage: c.percentage * 0.4 })),
    ...officialData.summerDistribution.map(c => ({ cropName: c.name, percentage: c.percentage * 0.6 }))
  ];

  // If we have regional specific data, we can adjust it further
  const regionalInfo = officialData.regionalStatus[region];
  
  const baselinePrompt = `You are a data analyst. I have official state-level crop distribution data for Maharashtra (April 2026).
  Official State-Level Rabi: ${JSON.stringify(officialData.rabiDistribution)}
  Official State-Level Summer: ${JSON.stringify(officialData.summerDistribution)}
  
  Current Regional Status for ${region}: ${regionalInfo ? JSON.stringify(regionalInfo) : 'General trends'}.
  
  Task: 
  1. If the region is "महाराष्ट्र" (State), you MUST return the exact state-level percentages provided in the official data. For Rabi crops, use their official percentages. For Summer crops, use their official percentages. Combine them into a single list where the total sum is 100.
  2. If the region is a specific division (e.g., Nashik, Pune), adjust the state-level percentages to be more realistic for that specific region based on the provided Regional Status.
  
  Return a JSON array of objects with "cropName" and "percentage" (0-100). 
  The sum MUST be 100. Use the official crop names provided.`;

  try {
    const res = await fetch('/api/gemini/crop-baseline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: baselinePrompt })
    });
    if (res.ok) {
      const json = await res.json();
      if (json.data && Array.isArray(json.data) && json.data.length > 0) {
        baseline = json.data;
      }
    }
  } catch (err: any) {
    console.warn("Failed to fetch baseline distribution from server:", err);
    // Use the pre-calculated baseline if AI fails
  }

  // Merge real-time data with baseline
  const totalRealTime = Object.values(cropCounts).reduce((a, b) => a + b, 0);
  
  const insights: CropInsight[] = baseline.map(b => {
    const normalizedName = normalize(b.cropName);
    const realTimeCount = cropCounts[normalizedName] || 0;
    
    // Adjust percentage: (Baseline % + Real-time weight)
    const realTimeWeight = totalRealTime > 0 ? (realTimeCount / totalRealTime) * 20 : 0;
    const adjustedPercentage = Math.min(100, b.percentage + realTimeWeight);
    
    let riskLevel: 'Low' | 'Medium' | 'High' = 'Low';
    if (adjustedPercentage > 40) riskLevel = 'High';
    else if (adjustedPercentage > 25) riskLevel = 'Medium';

    return {
      cropName: normalizedName,
      region,
      farmerCount: realTimeCount + Math.round(b.percentage * 10), 
      realFarmerCount: realTimeCount,
      totalFarmersInRegion: totalRealTime + 1000,
      percentage: adjustedPercentage,
      riskLevel,
      lastUpdated: Timestamp.now()
    };
  });

  // Add any real-time crops that weren't in baseline
  Object.entries(cropCounts).forEach(([name, count]) => {
    if (!insights.find(i => i.cropName === name)) {
      const percentage = totalRealTime > 0 ? (count / totalRealTime) * 5 : 1;
      insights.push({
        cropName: name,
        region,
        farmerCount: count,
        realFarmerCount: count,
        totalFarmersInRegion: totalRealTime + 1000,
        percentage,
        riskLevel: 'Low',
        lastUpdated: Timestamp.now()
      });
    }
  });

  // Re-normalize percentages to sum to 100
  const sum = insights.reduce((a, b) => a + b.percentage, 0);
  insights.forEach(i => {
    i.percentage = (i.percentage / sum) * 100;
  });

  return insights.sort((a, b) => b.percentage - a.percentage);
};

/**
 * Calls Gemini AI to get personalized crop advisory based on regional insights.
 */
export const getAIAdvisory = async (
  farmerCrop: string,
  region: string,
  insights: CropInsight[]
 ): Promise<AIAdvisory> => {
  const officialData = await getLatestOfficialReport();
  const regionalContext = insights.map(i => `${i.cropName}: ${i.percentage.toFixed(1)}% (${i.riskLevel} Risk)`).join(', ');
  const officialReport = officialData.regionalStatus[region] || { weatherStatus: "General Maharashtra weather", harvestingCrops: [], maturityCrops: [] };
  
  const prompt = `
    You are a senior agricultural data scientist. 
    A farmer in ${region} is planning to grow ${farmerCrop}.
    Current regional crop distribution: ${regionalContext}.
    
    Official Government Report Context (as of ${officialData.reportDate}):
    - Weather: ${officialReport.weatherStatus}
    - Harvesting in progress: ${officialReport.harvestingCrops.join(', ')}
    - Crops in maturity: ${officialReport.maturityCrops.join(', ')}

    Analyze the risk of oversupply for ${farmerCrop} in this region.
    If the risk is Medium or High, suggest 3 alternative crops that have lower competition in this region.
    Provide a natural language explanation of the risk.
    Provide a concise bilingual advice (Marathi + English).

    Return the response in JSON format with the following structure:
    {
      "riskExplanation": "string",
      "alternativeCrops": [
        { "name": "string", "benefit": "string", "demandGap": "string" }
      ],
      "marathiAdvice": "string"
    }
  `;

  try {
    const res = await fetch('/api/gemini/crop-advisory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    if (res.ok) {
      const json = await res.json();
      if (json.data) {
        return json.data;
      }
    }
    throw new Error("Advisory response invalid");
  } catch (err: any) {
    console.warn("Advisory fetch failed, returning fallback advice:", err);
    return {
      riskExplanation: "सध्याच्या बाजारभाव व आवकेनुसार या पिकाला मध्यम ते उच्च स्पर्धा असू शकते.",
      marathiAdvice: "पिकाचे नियोजन करताना स्थानिक बाजारभाव व आवक तपासावी. संतुलित खत व पाण्याचे व्यवस्थापन ठेवावे.",
      alternativeCrops: [
        { name: "Maize (मका)", benefit: "स्थिर बाजार मागणी व हमीभाव", demandGap: "मध्यम" },
        { name: "Gram (हरभरा)", benefit: "कमी पाण्यामध्ये उत्तम उत्पन्न", demandGap: "उच्च" }
      ]
    };
  }
};
