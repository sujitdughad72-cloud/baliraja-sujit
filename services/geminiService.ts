
import { GoogleGenAI, Type, Modality } from "@google/genai";

// Use a getter to ensure we always have the latest key and a fresh instance if needed
const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  
  // Check if the key is effectively missing or a placeholder string
  if (!apiKey || apiKey === 'undefined' || apiKey === 'null') {
    throw new Error("Gemini API Key is missing. Please set it in the Settings menu (bottom left).");
  }
  
  return new GoogleGenAI({ apiKey });
};

export const getMarketAdvice = async (productName: string, location: string = "Maharashtra") => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest', // Using the recommended model for text tasks
      contents: `आजचे ${productName} चे ताजे बाजार भाव (APMC Mandi Rates) ${location} साठी काय आहेत? 
      कृपया अधिकृत सरकारी पोर्टल किंवा कृषी उत्पन्न बाजार समितीच्या ताज्या आकडेवारीनुसार माहिती द्या. 
      किमान भाव, कमाल भाव आणि सरासरी भाव सांगा. प्रतिसाद पूर्णपणे मराठीत असावा.`,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.1, 
      }
    });
    
    const grounding = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const text = response.text;
    
    return { text, grounding };
  } catch (error: any) {
    console.error("Market advice error:", error);
    const isQuotaError = error?.message?.includes('429') || error?.status === 'RESOURCE_EXHAUSTED';
    
    let errorMessage = "क्षमस्व, बाजार भाव मिळवण्यात अडचण येत आहे. कृपया पुन्हा प्रयत्न करा.";
    if (error.message?.includes("API Key")) {
      errorMessage = "API Key चुकीची आहे किंवा सेट केलेली नाही. कृपया Settings तपासा.";
    } else if (isQuotaError) {
      errorMessage = "एआय सेवा सध्या व्यस्त आहे (Quota Exceeded). कृपया १ मिनिटानंतर पुन्हा प्रयत्न करा.";
    }
    
    return { text: errorMessage, grounding: [] };
  }
};

export const startAgriChat = (systemInstruction: string = "तुम्ही 'बळीराजा' या अ‍ॅपचे कृषी तज्ज्ञ आहात. शेतकऱ्यांना पिके, खते, कीटकनाशके आणि बाजारभावाबाबत मराठीत मदत करा. नेहमी ताज्या आणि अधिकृत माहितीचा आधार घ्या.") => {
  try {
    const ai = getAI();
    return ai.chats.create({
      model: 'gemini-flash-latest',
      config: {
        systemInstruction,
      },
    });
  } catch (error) {
    console.error("Chat initialization error:", error);
    return null;
  }
};

export const analyzeCropImage = async (base64Image: string) => {
  try {
    const ai = getAI();
    const imagePart = {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Image,
      },
    };
    const textPart = {
      text: "या पिकाच्या फोटोचे विश्लेषण करा. पीक ओळखा, काही रोग किंवा गुणवत्तेच्या समस्या आहेत का ते तपासा. चांगल्या उत्पादनासाठी मराठीत उपाय सुचवा."
    };

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: { parts: [imagePart, textPart] },
    });
    return response.text;
  } catch (error: any) {
    console.error("Image analysis error:", error);
    const isQuotaError = error?.message?.includes('429') || error?.status === 'RESOURCE_EXHAUSTED';
    if (isQuotaError) {
      return "एआय सेवा सध्या व्यस्त आहे (Quota Exceeded). कृपया १ मिनिटानंतर पुन्हा प्रयत्न करा.";
    }
    return "फोटोचे विश्लेषण करताना त्रुटी आली. कृपया आपली API Key तपासा.";
  }
};

export const generateSpeech = async (text: string) => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `मराठीत सांगा: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, 
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (error) {
    console.error("Speech generation error:", error);
    return null;
  }
};

export async function playRawAudio(base64Data: string) {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  
  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const data = decode(base64Data);
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length;
  const buffer = audioContext.createBuffer(1, frameCount, 24000);
  const channelData = buffer.getChannelData(0);

  for (let i = 0; i < frameCount; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }

  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(audioContext.destination);
  source.start();
  
  return new Promise((resolve) => {
    source.onended = () => {
      audioContext.close();
      resolve(true);
    };
  });
}
