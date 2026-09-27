
export interface RegionalCropStatus {
  region: string;
  rabiSowingPercentage: number;
  summerSowingPercentage: number;
  harvestingCrops: string[];
  maturityCrops: string[];
  weatherStatus: string;
}

export const OFFICIAL_REPORT_DATE = "2026-04-09";

export const RABI_CROP_DISTRIBUTION = [
  { name: "Gram (हरभरा)", percentage: 43.1, area: 29.01 },
  { name: "Wheat (गहू)", percentage: 22.5, area: 15.14 },
  { name: "Jowar (रब्बी ज्वारी)", percentage: 20.7, area: 13.92 },
  { name: "Maize (मका)", percentage: 9.8, area: 6.60 },
  { name: "Other Pulses (इतर कडधान्ये)", percentage: 2.7, area: 1.83 },
  { name: "Safflower (करडई)", percentage: 0.5, area: 0.31 },
  { name: "Other Cereals (इतर तृणधान्ये)", percentage: 0.3, area: 0.17 },
  { name: "Oilseeds (तेलवबया)", percentage: 0.4, area: 0.24 },
];

export const SUMMER_CROP_DISTRIBUTION = [
  { name: "Summer Rice (उन्हाळी भात)", percentage: 44, area: 1.27 },
  { name: "Summer Maize (उन्हाळी मका)", percentage: 18, area: 0.50 },
  { name: "Summer Groundnut (उन्हाळी भुईमुग)", percentage: 17, area: 0.48 },
  { name: "Summer Bajra (उन्हाळी बाजरी)", percentage: 7, area: 0.21 },
  { name: "Summer Sesame (उन्हाळी तीळ)", percentage: 6, area: 0.159 },
  { name: "Summer Jowar (उन्हाळी ज्वारी)", percentage: 5, area: 0.146 },
  { name: "Summer Moong (उन्हाळी मूग)", percentage: 3, area: 0.084 },
];

export const REGIONAL_STATUS: Record<string, RegionalCropStatus> = {
  "कोकण": {
    region: "Konkan",
    rabiSowingPercentage: 91,
    summerSowingPercentage: 19,
    harvestingCrops: ["Wal (वाल)", "Chavali (चवळी)", "Kulith (कुळीथ)", "Gram (हरभरा)"],
    maturityCrops: [],
    weatherStatus: "Dry and clear skies. Temperature rising."
  },
  "नाशिक": {
    region: "Nashik",
    rabiSowingPercentage: 131,
    summerSowingPercentage: 64,
    harvestingCrops: [],
    maturityCrops: ["Maize (मका)", "Gram (हरभरा)", "Jowar (ज्वारी)", "Wheat (गहू)", "Safflower (करडई)"],
    weatherStatus: "Dry and clear skies. Temperature rising."
  },
  "पुणे": {
    region: "Pune",
    rabiSowingPercentage: 103,
    summerSowingPercentage: 56,
    harvestingCrops: ["Jowar (ज्वारी)", "Wheat (गहू)", "Maize (मका)", "Gram (हरभरा)"],
    maturityCrops: ["Safflower (करडई)", "Sunflower (सूर्यफूल)"],
    weatherStatus: "Unseasonal rain recorded. Slight drop in temperature."
  },
  "कोल्हापूर": {
    region: "Kolhapur",
    rabiSowingPercentage: 102,
    summerSowingPercentage: 88,
    harvestingCrops: ["Jowar (ज्वारी)", "Gram (हरभरा)", "Wheat (गहू)"],
    maturityCrops: ["Maize (मका)"],
    weatherStatus: "Unseasonal rain recorded. Slight drop in temperature."
  },
  "छत्रपती संभाजीनगर": {
    region: "Chhatrapati Sambhajinagar",
    rabiSowingPercentage: 149,
    summerSowingPercentage: 21,
    harvestingCrops: ["Jowar (ज्वारी)", "Maize (मका)", "Wheat (गहू)", "Gram (हरभरा)"],
    maturityCrops: ["Safflower (करडई)"],
    weatherStatus: "Dry and clear skies. Temperature rising."
  },
  "लातूर": {
    region: "Latur",
    rabiSowingPercentage: 117,
    summerSowingPercentage: 44,
    harvestingCrops: ["Jowar (ज्वारी)", "Wheat (गहू)", "Gram (हरभरा)", "Maize (मका)"],
    maturityCrops: ["Safflower (करडई)"],
    weatherStatus: "Unseasonal rain recorded. Slight drop in temperature."
  },
  "अमरावती": {
    region: "Amravati",
    rabiSowingPercentage: 110,
    summerSowingPercentage: 68,
    harvestingCrops: ["Gram (हरभरा)", "Wheat (गहू)", "Chia Seed (चिया सीड)"],
    maturityCrops: ["Jowar (ज्वारी)", "Maize (मका)"],
    weatherStatus: "Unseasonal rain recorded. Slight drop in temperature."
  },
  "नागपूर": {
    region: "Nagpur",
    rabiSowingPercentage: 106,
    summerSowingPercentage: 96,
    harvestingCrops: ["Wheat (गहू)", "Gram (हरभरा)", "Jowar (ज्वारी)", "Masur (मसूर)", "Maize (मका)", "Linseed (जवस)", "Mustard (मोहरी)"],
    maturityCrops: [],
    weatherStatus: "Unseasonal rain recorded. Slight drop in temperature."
  },
  "महाराष्ट्र": {
    region: "Maharashtra (State)",
    rabiSowingPercentage: 116,
    summerSowingPercentage: 65,
    harvestingCrops: ["Jowar (ज्वारी)", "Wheat (गहू)", "Maize (मका)", "Gram (हरभरा)"],
    maturityCrops: ["Safflower (करडई)", "Sunflower (सूर्यफूल)", "Sesame (तीळ)"],
    weatherStatus: "Dry and clear in most parts. Unseasonal rain recorded in Pune, Kolhapur, Latur, Amravati, and Nagpur divisions. Rainfall is 109% of average."
  }
};
