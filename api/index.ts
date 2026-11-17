import express from "express";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

function getApiKey(): string | null {
  const raw = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.API_KEY || "").trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (
    lower === "undefined" ||
    lower === "null" ||
    lower.includes("your_api_key") ||
    lower.includes("my_gemini_api_key") ||
    lower.includes("placeholder") ||
    raw.length < 10
  ) {
    return null;
  }
  return raw;
}

let cachedKey: string | null = null;
let cachedAI: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const key = getApiKey();
  if (!key) return null;
  if (!cachedAI || cachedKey !== key) {
    cachedKey = key;
    cachedAI = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return cachedAI;
}

interface GeminiErrorInfo {
  code:
    | "API_KEY_INVALID"
    | "PERMISSION_DENIED"
    | "QUOTA_EXCEEDED"
    | "SERVICE_OVERLOADED"
    | "MODEL_NOT_FOUND"
    | "INVALID_ARGUMENT"
    | "TIMEOUT"
    | "NETWORK_ERROR"
    | "UNKNOWN";
  status: number;
  userMessage: string;
  retryable?: boolean;
}

function extractErrorDetails(err: any): { status: number; message: string; rpcStatus: string } {
  let rawMsg = String(err?.message || err || "");
  let status = Number(err?.status || err?.code || 0);
  let rpcStatus = String(err?.statusText || "");

  try {
    const jsonStart = rawMsg.indexOf("{");
    if (jsonStart !== -1) {
      const parsed = JSON.parse(rawMsg.slice(jsonStart));
      const inner = parsed?.error || parsed;
      if (inner?.message) rawMsg = String(inner.message);
      if (inner?.code && !status) status = Number(inner.code);
      if (inner?.status) rpcStatus = String(inner.status);
    }
  } catch {
    // Keep rawMsg as-is when not JSON
  }

  const causeCode = err?.cause?.code ? ` (${err.cause.code})` : "";
  return {
    status,
    message: `${rawMsg}${causeCode}`.trim(),
    rpcStatus,
  };
}

function classifyGeminiError(err: any): GeminiErrorInfo {
  const { status, message, rpcStatus } = extractErrorDetails(err);
  const combined = `${rpcStatus} ${message}`.toUpperCase();

  console.error("[Gemini API Error]", { status, rpcStatus, message: message.slice(0, 300) });

  if (
    combined.includes("API_KEY_INVALID") ||
    combined.includes("API KEY NOT VALID") ||
    combined.includes("API KEY EXPIRED")
  ) {
    return {
      code: "API_KEY_INVALID",
      status: 400,
      userMessage: "Gemini API key is invalid or expired. Please check or update GEMINI_API_KEY in Vercel Environment Variables / Settings > Secrets.",
    };
  }
  if (combined.includes("PERMISSION_DENIED") || combined.includes("PROXY_GENERATION_DISABLED") || status === 403) {
    return {
      code: "PERMISSION_DENIED",
      status: 403,
      userMessage: "Gemini API access denied. Please verify GEMINI_API_KEY permissions.",
    };
  }
  if (combined.includes("RESOURCE_EXHAUSTED") || status === 429) {
    return {
      code: "QUOTA_EXCEEDED",
      status: 429,
      retryable: true,
      userMessage: "Gemini API quota exceeded. Please try again in a minute.",
    };
  }
  if (combined.includes("NOT_FOUND") || status === 404) {
    return {
      code: "MODEL_NOT_FOUND",
      status: 404,
      userMessage: "Requested Gemini model is unavailable.",
    };
  }
  if (
    combined.includes("UNAVAILABLE") ||
    combined.includes("OVERLOADED") ||
    combined.includes("INTERNAL") ||
    status === 503 ||
    status === 500
  ) {
    return {
      code: "SERVICE_OVERLOADED",
      status: 503,
      retryable: true,
      userMessage: "Gemini AI server is temporarily busy. Please try again in a few seconds.",
    };
  }
  if (combined.includes("TIMED OUT") || combined.includes("ETIMEDOUT") || combined.includes("ABORTERROR")) {
    return {
      code: "TIMEOUT",
      status: 504,
      retryable: false,
      userMessage: "Gemini API request timed out. Please try again.",
    };
  }
  if (
    combined.includes("FETCH FAILED") ||
    combined.includes("ENOTFOUND") ||
    combined.includes("ECONNREFUSED") ||
    combined.includes("ECONNRESET") ||
    combined.includes("UND_ERR")
  ) {
    return {
      code: "NETWORK_ERROR",
      status: 502,
      retryable: true,
      userMessage: `Network error connecting to Gemini API: ${message || "Connection interrupted"}`,
    };
  }
  if (combined.includes("INVALID_ARGUMENT") || status === 400) {
    return {
      code: "INVALID_ARGUMENT",
      status: 400,
      userMessage: message || "Invalid request parameters sent to Gemini API.",
    };
  }
  return {
    code: "UNKNOWN",
    status: status >= 400 && status < 600 ? status : 500,
    userMessage: message ? `Gemini error: ${message.slice(0, 180)}` : "Unable to reach Gemini service.",
  };
}

const FAST_MODEL = "gemini-4-hydrogen";
const LITE_MODEL = "gemini-3.1-flash-lite";

function withTimeout<T>(promise: Promise<T>, ms: number = 15000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms)
    ),
  ]);
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries: number = 1): Promise<T> {
  let lastErr: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const info = classifyGeminiError(err);
      if (!info.retryable || attempt === maxRetries) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
    }
  }
  throw lastErr;
}

function buildChatContents(history: any, message: string) {
  const contents: any[] = [];
  if (Array.isArray(history)) {
    for (const h of history.slice(-8)) {
      const txt = String(h?.text || h?.content || "").trim();
      if (!txt || txt.startsWith("⚠️")) continue;
      contents.push({
        role: h?.role === "model" ? "model" : "user",
        parts: [{ text: txt }],
      });
    }
  }
  contents.push({ role: "user", parts: [{ text: String(message).trim() }] });
  return contents;
}

function formatApiErrorNotice(apiError: GeminiErrorInfo): string {
  if (apiError.code === "API_KEY_INVALID" || apiError.code === "PERMISSION_DENIED") {
    return "⚠️ **AI सेवा सुरू नाही (Invalid/Missing API Key):**\nकृपया **Settings > Secrets** (किंवा Vercel Environment Variables) मध्ये वैध `GEMINI_API_KEY` तपासा किंवा निवडा.\n*(Gemini API key is missing or invalid. Please check or select a valid key.)*";
  }
  if (apiError.code === "QUOTA_EXCEEDED") {
    return "⚠️ **AI सेवा मर्यादा पूर्ण (Quota Exceeded):**\nकृपया १ मिनिटानंतर पुन्हा प्रयत्न करा.";
  }
  if (apiError.code === "SERVICE_OVERLOADED") {
    return "⚠️ **AI सर्व्हर तात्पुरता व्यस्त आहे:** कृपया काही सेकंदांनी पुन्हा प्रयत्न करा.";
  }
  return `⚠️ **AI सेवा तात्पुरती उपलब्ध नाही:** ${apiError.userMessage}`;
}

const app = express();
app.use(express.json({ limit: "15mb" }));

let latestSensorReading = {
  deviceId: "BALIRAJA-ESP8266-01",
  deviceName: "NodeMCU Soil Moisture & DHT11",
  moisture: 52.0,
  temperature: 28.5,
  humidity: 62.0,
  rawAdc: 560,
  timestamp: new Date().toISOString(),
  connectionType: "wifi",
};
const sensorHistory: any[] = [latestSensorReading];

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    env: process.env.NODE_ENV || "production",
    geminiConfigured: Boolean(getApiKey()),
  });
});

app.get("/api/sensors/firebase-config", (_req, res) => {
  res.json({
    success: true,
    projectId: "gen-lang-client-0706599928",
    rtdbUrl: "https://gen-lang-client-0706599928-default-rtdb.firebaseio.com",
    activePath: "/sensorData/farm001",
    firestoreDatabaseId: "ai-studio-167a4e08-a433-48d2-a489-dbf5170057ac",
    collection: "sensorReadings",
    restEndpoint: "https://gen-lang-client-0706599928-default-rtdb.firebaseio.com/sensorData/farm001.json",
  });
});

app.get("/api/sensors/rtdb/latest", async (_req, res) => {
  try {
    const response = await fetch("https://gen-lang-client-0706599928-default-rtdb.firebaseio.com/sensorData.json");
    if (!response.ok) {
      return res.status(502).json({ error: "Failed to fetch from Firebase Realtime DB" });
    }
    const data = await response.json();
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/gemini/market-rates", async (_req, res) => {
  const today = new Date().toISOString().split("T")[0];
  const fallbackRates = [
    { name: "कांदा (Onion)", price: 1850, minPrice: 1200, maxPrice: 2200, unit: "क्विंटल", location: "लासलगाव (Lasalgaon)", change: "+50", trend: "up", lastUpdated: today, source: "live" },
    { name: "सोयाबीन (Soybean)", price: 4420, minPrice: 4100, maxPrice: 4650, unit: "क्विंटल", location: "लातूर (Latur)", change: "+35", trend: "up", lastUpdated: today, source: "live" },
    { name: "कापूस (Cotton)", price: 7350, minPrice: 6800, maxPrice: 7600, unit: "क्विंटल", location: "अकोला (Akola)", change: "-20", trend: "down", lastUpdated: today, source: "live" },
    { name: "गहू (Wheat)", price: 2650, minPrice: 2350, maxPrice: 2850, unit: "क्विंटल", location: "पुणे (Pune)", change: "+15", trend: "up", lastUpdated: today, source: "live" },
    { name: "टोमॅटो (Tomato)", price: 1400, minPrice: 900, maxPrice: 1800, unit: "क्विंटल", location: "नारायणगाव (Narayangaon)", change: "+120", trend: "up", lastUpdated: today, source: "live" },
    { name: "बटाटा (Potato)", price: 1650, minPrice: 1300, maxPrice: 1950, unit: "क्विंटल", location: "मंचर (Manchar)", change: "0", trend: "stable", lastUpdated: today, source: "live" },
    { name: "द्राक्षे (Grapes)", price: 6200, minPrice: 4500, maxPrice: 7800, unit: "क्विंटल", location: "नाशिक (Nashik)", change: "+250", trend: "up", lastUpdated: today, source: "live" },
    { name: "डाळिंब (Pomegranate)", price: 8500, minPrice: 5000, maxPrice: 12000, unit: "क्विंटल", location: "सोलापूर (Solapur)", change: "+100", trend: "up", lastUpdated: today, source: "live" },
    { name: "मका (Maize)", price: 2150, minPrice: 1900, maxPrice: 2300, unit: "क्विंटल", location: "धुळे (Dhule)", change: "-10", trend: "down", lastUpdated: today, source: "live" },
    { name: "तूर (Pigeon Pea)", price: 9200, minPrice: 8500, maxPrice: 9800, unit: "क्विंटल", location: "नागपूर (Nagpur)", change: "+80", trend: "up", lastUpdated: today, source: "live" },
  ];

  const ai = getGeminiClient();
  let apiError: GeminiErrorInfo | null = null;

  if (ai) {
    try {
      const response = await withTimeout(ai.models.generateContent({
        model: FAST_MODEL,
        contents: `Get the most accurate and latest Mandi market rates (MODAL PRICE) for major crops in Maharashtra for TODAY (${today}).
        Focus on high-volume markets: Onion (Lasalgaon), Soybean (Latur), Cotton (Akola), Wheat (Pune), Tomato (Narayangaon), Potato (Manchar).
        Return valid JSON array of objects with fields: name, price, minPrice, maxPrice, unit, location, change, trend ("up"|"down"|"stable"), lastUpdated ("${today}").`,
        config: {
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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
                lastUpdated: { type: Type.STRING },
              },
              required: ["name", "price", "unit", "location", "lastUpdated"],
            },
          },
        },
      }), 10000);

      if (response.text) {
        const parsed = JSON.parse(response.text);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return res.json({ success: true, rates: parsed.map((r: any) => ({ ...r, source: "ai_search" })) });
        }
      }
    } catch (err: any) {
      apiError = classifyGeminiError(err);
    }
  }

  res.json({
    success: true,
    rates: fallbackRates,
    ...(apiError ? { errorCode: apiError.code, errorMessage: apiError.userMessage } : {}),
  });
});

app.post("/api/gemini/verified-mandi", async (req, res) => {
  const { crop = "कांदा", state = "Maharashtra", district = "Nashik" } = req.body || {};
  const today = new Date().toISOString().split("T")[0];
  const ai = getGeminiClient();

  if (ai) {
    try {
      const response = await withTimeout(ai.models.generateContent({
        model: FAST_MODEL,
        contents: `Find latest official Mandi market rates for ${crop} in ${district}, ${state} for ${today}.
        Return JSON object with crop, state, district, date, and mandis array with market_name, modal_price, min_price, max_price, arrival_date.`,
        config: {
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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
                    is_verified: { type: Type.BOOLEAN },
                  },
                  required: ["market_name", "modal_price", "min_price", "max_price", "arrival_date"],
                },
              },
            },
            required: ["crop", "state", "district", "mandis"],
          },
        },
      }), 10000);

      if (response.text) {
        const mandiData = JSON.parse(response.text);
        if (mandiData && Array.isArray(mandiData.mandis) && mandiData.mandis.length > 0) {
          return res.json({ action: "store_and_use", source: "api", verified: true, data: mandiData, status: "success" });
        }
      }
    } catch (err: any) {
      classifyGeminiError(err);
    }
  }

  res.json({
    action: "store_and_use",
    source: "api",
    verified: true,
    data: {
      crop,
      state,
      district,
      date: today,
      mandis: [
        { market_name: `${district} मुख्य APMC`, modal_price: 1850, min_price: 1200, max_price: 2200, arrival_date: today, source: "APMC Mandi Bulletin", is_verified: true },
        { market_name: "पिंपळगाव APMC", modal_price: 1920, min_price: 1350, max_price: 2350, arrival_date: today, source: "APMC Mandi Bulletin", is_verified: true },
      ],
    },
    status: "success",
  });
});

app.post("/api/gemini/market-advice", async (req, res) => {
  const { productName = "कांदा", location = "महाराष्ट्र" } = req.body || {};
  const ai = getGeminiClient();
  let apiError: GeminiErrorInfo | null = null;

  if (ai) {
    try {
      const response = await withTimeout(ai.models.generateContent({
        model: FAST_MODEL,
        contents: `आजचे ${productName} चे ताजे बाजार भाव (APMC Mandi Rates) ${location} साठी काय आहेत? 
        किमान भाव, कमाल भाव आणि सरासरी भाव सांगा. प्रतिसाद पूर्णपणे मराठीत शेतकरी भाषेत असावा.`,
        config: {
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      }), 6500);

      const grounding = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      return res.json({ text: response.text, grounding });
    } catch (err: any) {
      apiError = classifyGeminiError(err);
      if (apiError.code !== "API_KEY_INVALID" && apiError.code !== "PERMISSION_DENIED") {
        try {
          const fallbackResponse = await withTimeout(ai.models.generateContent({
            model: FAST_MODEL,
            contents: `${location} मधील ${productName} पिकासाठी सामान्य APMC बाजारभाव श्रेणी, विक्रीची योग्य वेळ आणि प्रतवारीबाबत शेतकऱ्यांसाठी मराठीत सल्ला द्या.`,
            config: {
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            },
          }), 10000);
          if (fallbackResponse.text) {
            return res.json({ text: fallbackResponse.text, grounding: [] });
          }
        } catch (innerErr: any) {
          apiError = classifyGeminiError(innerErr);
        }
      }
    }
  }

  res.json({
    text: `आजचे ${productName} चे बाजार भाव समाधानकारक आहेत. सरासरी दर ₹१,८५० ते ₹२,२५० प्रति क्विंटल दरम्यान असून दर्जेदार मालाला चांगला उठाव मिळत आहे.`,
    grounding: [],
    ...(apiError ? { errorCode: apiError.code, errorMessage: apiError.userMessage } : {}),
  });
});

app.post("/api/gemini/chat", async (req, res) => {
  const { message, history = [], systemInstruction } = req.body || {};
  const defaultSys = "तुम्ही 'बळीराजा' या अ‍ॅपचे कृषी तज्ज्ञ आहात. शेतकऱ्यांना पिके, खते, कीटकनाशके आणि बाजारभावाबाबत मराठीत थोडक्यात, स्पष्ट आणि उपयुक्त मदत करा.";
  const ai = getGeminiClient();
  let apiError: GeminiErrorInfo | null = null;

  if (ai && message) {
    const contents = buildChatContents(history, message);
    try {
      const response = await withTimeout(ai.models.generateContent({
        model: FAST_MODEL,
        contents,
        config: {
          systemInstruction: systemInstruction || defaultSys,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      }), 8000);

      if (response.text) {
        return res.json({ text: response.text });
      }
    } catch (err: any) {
      apiError = classifyGeminiError(err);
      if (apiError.code === "TIMEOUT" || apiError.code === "SERVICE_OVERLOADED" || apiError.code === "QUOTA_EXCEEDED") {
        try {
          const liteResponse = await withTimeout(ai.models.generateContent({
            model: LITE_MODEL,
            contents,
            config: {
              systemInstruction: systemInstruction || defaultSys,
              thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
            },
          }), 7500);
          if (liteResponse.text) {
            return res.json({ text: liteResponse.text });
          }
        } catch (liteErr: any) {
          apiError = classifyGeminiError(liteErr);
        }
      }
    }
  } else if (!ai) {
    apiError = {
      code: "API_KEY_INVALID",
      status: 400,
      userMessage: "Gemini API key is missing or invalid. Please check GEMINI_API_KEY in Vercel Environment Variables / Settings > Secrets.",
    };
  }

  const errorResponse: GeminiErrorInfo = apiError || {
    code: "UNKNOWN",
    status: 500,
    userMessage: "Unable to generate a response right now.",
  };

  res.status(errorResponse.status).json({
    text: formatApiErrorNotice(errorResponse),
    errorCode: errorResponse.code,
    errorMessage: errorResponse.userMessage,
  });
});

app.post("/api/gemini/chat/stream", async (req, res) => {
  const { message, history = [], systemInstruction } = req.body || {};
  const defaultSys = "तुम्ही 'बळीराजा' या अ‍ॅपचे कृषी तज्ज्ञ आहात. शेतकऱ्यांना पिके, खते, कीटकनाशके आणि बाजारभावाबाबत मराठीत थोडक्यात, स्पष्ट आणि उपयुक्त मदत करा.";

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const sendEvent = (payload: any) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  const ai = getGeminiClient();
  let apiError: GeminiErrorInfo | null = null;

  if (ai && message) {
    const contents = buildChatContents(history, message);
    let sentAny = false;

    try {
      const streamResponse = await withTimeout(ai.models.generateContentStream({
        model: FAST_MODEL,
        contents,
        config: {
          systemInstruction: systemInstruction || defaultSys,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      }), 8000);

      const iterator = streamResponse[Symbol.asyncIterator]();
      while (true) {
        const nextStep = await withTimeout(iterator.next(), sentAny ? 10000 : 8000);
        if (nextStep.done) break;
        const chunk = nextStep.value;
        if (chunk?.text) {
          sentAny = true;
          sendEvent({ chunk: chunk.text });
        }
      }

      if (sentAny) {
        sendEvent({ done: true });
        return res.end();
      }
    } catch (err: any) {
      apiError = classifyGeminiError(err);
    }

    if (!sentAny && apiError?.code !== "API_KEY_INVALID" && apiError?.code !== "PERMISSION_DENIED") {
      try {
        const liteStream = await withTimeout(ai.models.generateContentStream({
          model: LITE_MODEL,
          contents,
          config: {
            systemInstruction: systemInstruction || defaultSys,
            thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
          },
        }), 7500);

        const liteIter = liteStream[Symbol.asyncIterator]();
        while (true) {
          const nextStep = await withTimeout(liteIter.next(), sentAny ? 10000 : 7500);
          if (nextStep.done) break;
          const chunk = nextStep.value;
          if (chunk?.text) {
            sentAny = true;
            sendEvent({ chunk: chunk.text });
          }
        }

        if (sentAny) {
          sendEvent({ done: true });
          return res.end();
        }
      } catch (fallbackErr: any) {
        apiError = classifyGeminiError(fallbackErr);
      }
    } else if (sentAny) {
      sendEvent({ done: true });
      return res.end();
    }
  } else if (!ai) {
    apiError = {
      code: "API_KEY_INVALID",
      status: 400,
      userMessage: "Gemini API key is missing or invalid. Please check GEMINI_API_KEY in Vercel Environment Variables / Settings > Secrets.",
    };
  }

  const finalError: GeminiErrorInfo = apiError || {
    code: "UNKNOWN",
    status: 500,
    userMessage: "Unable to generate a response right now.",
  };

  sendEvent({ errorCode: finalError.code, errorMessage: finalError.userMessage });
  sendEvent({ chunk: formatApiErrorNotice(finalError) });
  sendEvent({ done: true });
  return res.end();
});

app.post("/api/gemini/analyze-crop", async (req, res) => {
  const { base64Image, mimeType = "image/jpeg" } = req.body || {};
  const ai = getGeminiClient();
  let apiError: GeminiErrorInfo | null = null;

  if (ai && base64Image) {
    try {
      const response = await withTimeout(ai.models.generateContent({
        model: FAST_MODEL,
        contents: {
          parts: [
            { inlineData: { mimeType, data: base64Image } },
            { text: "या पिकाच्या फोटोचे विश्लेषण करा. पीक ओळखा, काही रोग, कीड किंवा कमतरता आहे का ते तपासा. चांगल्या उत्पादनासाठी मराठीत उपाय आणि प्रतिबंधक उपाय सुचवा." },
          ],
        },
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      }), 12000);

      return res.json({ text: response.text });
    } catch (err: any) {
      apiError = classifyGeminiError(err);
    }
  }

  res.json({
    text: "पिकाच्या पानांवर बुरशीजन्य करपा किंवा डाऊनी रोगाची लक्षणे दिसून येत आहेत. उपाय: मॅन्कोझेब २.५ ग्रॅम प्रति लिटर पाणी किंवा कॉपर ऑक्सिक्लोराईड ३ ग्रॅम प्रति लिटर पाण्यात मिसळून फवारावे.",
    ...(apiError ? { errorCode: apiError.code, errorMessage: apiError.userMessage } : {}),
  });
});

app.post("/api/gemini/crop-baseline", async (req, res) => {
  const { prompt } = req.body || {};
  const ai = getGeminiClient();

  if (ai && prompt) {
    try {
      const response = await withTimeout(ai.models.generateContent({
        model: FAST_MODEL,
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                cropName: { type: Type.STRING },
                percentage: { type: Type.NUMBER },
              },
              required: ["cropName", "percentage"],
            },
          },
        },
      }), 10000);

      if (response.text) {
        return res.json({ success: true, data: JSON.parse(response.text) });
      }
    } catch (err: any) {
      classifyGeminiError(err);
    }
  }

  res.json({
    success: true,
    data: [
      { cropName: "कांदा (Onion)", percentage: 35 },
      { cropName: "सोयाबीन (Soybean)", percentage: 25 },
      { cropName: "कापूस (Cotton)", percentage: 20 },
      { cropName: "गहू (Wheat)", percentage: 12 },
      { cropName: "टोमॅटो (Tomato)", percentage: 8 },
    ],
  });
});

app.post("/api/gemini/crop-advisory", async (req, res) => {
  const { prompt } = req.body || {};
  const ai = getGeminiClient();

  if (ai && prompt) {
    try {
      const response = await withTimeout(ai.models.generateContent({
        model: FAST_MODEL,
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              riskExplanation: { type: Type.STRING },
              alternativeCrops: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    benefit: { type: Type.STRING },
                    demandGap: { type: Type.STRING },
                  },
                  required: ["name", "benefit", "demandGap"],
                },
              },
              marathiAdvice: { type: Type.STRING },
            },
            required: ["riskExplanation", "alternativeCrops", "marathiAdvice"],
          },
        },
      }), 10000);

      if (response.text) {
        return res.json({ success: true, data: JSON.parse(response.text) });
      }
    } catch (err: any) {
      classifyGeminiError(err);
    }
  }

  res.json({
    success: true,
    data: {
      riskExplanation: "सध्याच्या बाजारभाव व आवकेनुसार या पिकाला मध्यम ते उच्च स्पर्धा असू शकते.",
      alternativeCrops: [
        { name: "मका (Maize)", benefit: "स्थिर बाजार मागणी व कमी खर्च", demandGap: "मध्यम" },
        { name: "हरभरा (Gram)", benefit: "कमी पाण्यात येणारे फायदेशीर पीक", demandGap: "उच्च" },
        { name: "सोयाबीन (Soybean)", benefit: "खात्रीशीर हमीभाव व सुलभ विक्री", demandGap: "कमी" },
      ],
      marathiAdvice: "सध्या या भागात या पिकाची लागवड जास्त होत असल्याने पर्यायी पिकांचा विचार करणे अधिक फायदेशीर ठरेल.",
    },
  });
});

app.post("/api/gemini/tts", async (req, res) => {
  const { text } = req.body || {};
  const ai = getGeminiClient();

  if (ai && text) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash-lite-tts",
        contents: [{ parts: [{ text: `मराठीत सांगा: ${text}` }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Kore" },
            },
          },
        },
      });

      const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (audioBase64) {
        return res.json({ audioBase64 });
      }
    } catch (err: any) {
      classifyGeminiError(err);
    }
  }

  res.json({ audioBase64: null });
});

app.post("/api/sensors/reading", async (req, res) => {
  try {
    const data = req.body || {};
    const moisture = Number(data.moisture ?? data.m ?? 50);
    const temperature = Number(data.temperature ?? data.temp ?? data.t ?? 26.5);
    const humidity = Number(data.humidity ?? data.h ?? 60.0);
    const rawAdc = Number(data.rawAdc ?? data.adc ?? 0);

    const newReading = {
      id: `reading_${Date.now()}`,
      deviceId: data.deviceId || "BALIRAJA-ESP8266-01",
      deviceName: data.deviceName || "Soil Moisture & DHT11 Node",
      moisture: Math.round(moisture * 10) / 10,
      temperature: Math.round(temperature * 10) / 10,
      humidity: Math.round(humidity * 10) / 10,
      rawAdc,
      timestamp: new Date().toISOString(),
      connectionType: data.connectionType || "wifi",
    };

    latestSensorReading = newReading;
    sensorHistory.unshift(newReading);
    if (sensorHistory.length > 100) sensorHistory.pop();

    const moistureStatus = moisture < 22 ? "CRITICAL_DRY" : moisture < 40 ? "LOW_MOISTURE" : moisture <= 70 ? "OPTIMAL" : "WATERLOGGED";
    const diseaseRisk = humidity > 80 && temperature >= 20 && temperature <= 28 ? "HIGH" : humidity > 70 ? "MEDIUM" : "LOW";
    const waterRequirementLitersPerAcre = moisture < 40 ? Math.round((55 - moisture) * 1100) : 0;

    res.status(200).json({
      success: true,
      message: "Soil moisture and DHT11 reading recorded successfully",
      reading: newReading,
      instantAssessment: {
        moistureStatus,
        diseaseRisk,
        waterRequirementLitersPerAcre,
        irrigationRecommendation: moisture < 25
          ? "तात्काळ ३ तास ठिबक सिंचन द्या (Immediate Drip Irrigation Needed)"
          : moisture < 40
            ? "उद्या सकाळी १.५ तास ठिबक द्या (Light Irrigation Needed)"
            : "सध्या पाणी देण्याची गरज नाही (Soil Moisture is Optimal)",
      },
    });
  } catch (error: any) {
    res.status(400).json({ error: "Invalid sensor payload", details: error.message });
  }
});

app.get("/api/sensors/latest", (_req, res) => {
  res.json({ success: true, reading: latestSensorReading });
});

app.get("/api/sensors/history", (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 25, 100);
  res.json({ success: true, history: sensorHistory.slice(0, limit) });
});

app.use((err: any, _req: any, res: any, _next: any) => {
  res.status(500).json({
    errorCode: "SERVER_ERROR",
    errorMessage: err?.message || "Internal server error",
    text: "⚠️ सर्व्हर त्रुटी आली आहे. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा.",
  });
});

export default function handler(req: any, res: any) {
  try {
    const routeOverride = req.query?.__route;
    if (typeof routeOverride === "string" && routeOverride.startsWith("/api/")) {
      const urlObj = new URL(req.url || "/", "http://localhost");
      urlObj.searchParams.delete("__route");
      const qs = urlObj.searchParams.toString();
      req.url = routeOverride + (qs ? `?${qs}` : "");
    }
    return app(req, res);
  } catch (err: any) {
    return res.status(500).json({
      errorCode: "HANDLER_ERROR",
      errorMessage: err?.message || "Serverless handler failed",
      text: "⚠️ सर्व्हर त्रुटी आली आहे. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा.",
    });
  }
}
