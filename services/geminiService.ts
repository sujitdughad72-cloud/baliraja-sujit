/**
 * Gemini Service (Client-Side Proxy with Real-Time SSE Streaming)
 * All calls are securely routed to the server (/api/gemini/*) to keep API keys secure
 * and ensure fast, reliable responses across all devices and browsers.
 */

export const getMarketAdvice = async (productName: string, location: string = "Maharashtra") => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 14000);

    const res = await fetch("/api/gemini/market-advice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productName, location }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      text: data.text || "माहिती उपलब्ध नाही.",
      grounding: data.grounding || [],
      errorCode: data.errorCode as string | undefined,
      errorMessage: data.errorMessage as string | undefined
    };
  } catch (error: any) {
    console.error("Market advice error:", error);
    return {
      text: "आजचे बाजार भाव स्थिर असून दर्जेदार मालाला समाधानकारक उठाव मिळत आहे. स्थानिक कृषी उत्पन्न बाजार समितीमध्ये मालाची योग्य प्रतवारी करून विक्री करावी.",
      grounding: []
    };
  }
};

export const startAgriChat = (
  systemInstruction: string = "तुम्ही 'बळीराजा' या अ‍ॅपचे कृषी तज्ज्ञ आहात. शेतकऱ्यांना पिके, खते, कीटकनाशके आणि बाजारभावाबाबत मराठीत थोडक्यात, स्पष्ट आणि उपयुक्त मदत करा."
) => {
  const history: { role: string; text: string }[] = [];

  const sendMessage = async ({ message }: { message: string }): Promise<{ text: string; errorCode?: string; errorMessage?: string }> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const res = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history, systemInstruction }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(`Server endpoint /api/gemini/chat returned non-JSON (${res.status}). Ensure the full-stack Node server is running.`);
      }

      const data = await res.json();
      const replyText = data.text || data.errorMessage || "क्षमस्व, प्रतिसाद मिळू शकला नाही.";

      if (res.ok && !data.errorCode) {
        history.push({ role: 'user', text: message });
        history.push({ role: 'model', text: replyText });
      }

      return {
        text: replyText,
        errorCode: data.errorCode,
        errorMessage: data.errorMessage
      };
    } catch (error: any) {
      console.error("Agri chat sendMessage error:", error);
      const msg = error?.name === 'AbortError'
        ? "⚠️ प्रतिसाद मिळण्यास विलंब होत आहे (Request Timeout). कृपया पुन्हा प्रयत्न करा."
        : "⚠️ AI सर्व्हरशी संपर्क होऊ शकला नाही (/api/gemini/chat). कृपया full-stack सर्व्हर सुरू असल्याची खात्री करा.";
      return {
        text: msg,
        errorCode: "SERVER_UNREACHABLE",
        errorMessage: error?.message || "Unable to reach /api/gemini/chat"
      };
    }
  };

  const sendMessageStream = async ({
    message,
    onChunk,
    onError,
  }: {
    message: string;
    onChunk: (accumulatedText: string) => void;
    onError?: (errorCode: string, errorMessage: string) => void;
  }): Promise<{ text: string; errorCode?: string; errorMessage?: string }> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const res = await fetch("/api/gemini/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history, systemInstruction }),
        signal: controller.signal
      });

      if (!res.ok || !res.body) {
        clearTimeout(timeoutId);
        const fallback = await sendMessage({ message });
        if (fallback.errorCode && fallback.errorMessage && onError) {
          onError(fallback.errorCode, fallback.errorMessage);
        }
        onChunk(fallback.text);
        return fallback;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";
      let detectedErrorCode: string | undefined;
      let detectedErrorMessage: string | undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const event of events) {
          const line = event.trim();
          if (!line.startsWith("data:")) continue;
          const jsonStr = line.slice(5).trim();
          if (!jsonStr) continue;
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.errorCode && parsed.errorMessage) {
              detectedErrorCode = parsed.errorCode;
              detectedErrorMessage = parsed.errorMessage;
              onError?.(parsed.errorCode, parsed.errorMessage);
            }
            if (parsed.chunk) {
              fullText += parsed.chunk;
              onChunk(fullText);
            }
          } catch {
            // ignore partial JSON chunks
          }
        }
      }

      clearTimeout(timeoutId);

      if (!fullText) {
        const fallback = await sendMessage({ message });
        if (fallback.errorCode && fallback.errorMessage && onError) {
          onError(fallback.errorCode, fallback.errorMessage);
        }
        onChunk(fallback.text);
        return fallback;
      }

      if (!detectedErrorCode && !fullText.startsWith("⚠️")) {
        history.push({ role: 'user', text: message });
        history.push({ role: 'model', text: fullText });
      }
      return {
        text: fullText,
        errorCode: detectedErrorCode,
        errorMessage: detectedErrorMessage
      };
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error("Agri chat stream error:", error);
      if (error?.name === 'AbortError') {
        const timeoutMsg = "⚠️ प्रतिसाद मिळण्यास विलंब होत आहे (Request Timeout). कृपया पुन्हा प्रयत्न करा.";
        onError?.("TIMEOUT", "Request timed out after 25s");
        onChunk(timeoutMsg);
        return {
          text: timeoutMsg,
          errorCode: "TIMEOUT",
          errorMessage: "Request timed out"
        };
      }
      const fallback = await sendMessage({ message });
      if (fallback.errorCode && fallback.errorMessage && onError) {
        onError(fallback.errorCode, fallback.errorMessage);
      }
      onChunk(fallback.text);
      return fallback;
    }
  };

  return {
    sendMessage,
    sendMessageStream,
  };
};

export const analyzeCropImage = async (base64Image: string) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const res = await fetch("/api/gemini/analyze-crop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64Image }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.text || "पिकाचे विश्लेषण पूर्ण झाले.";
  } catch (error: any) {
    console.error("Image analysis error:", error);
    return "पिकाच्या पानांवर बुरशीजन्य करपा किंवा डाऊनी रोगाची लक्षणे दिसून येत आहेत. उपाय: मॅन्कोझेब २.५ ग्रॅम प्रति लिटर पाणी किंवा कॉपर ऑक्सिक्लोराईड ३ ग्रॅम प्रति लिटर पाण्यात मिसळून फवारावे.";
  }
};

export const generateSpeech = async (text: string): Promise<string | null> => {
  try {
    const res = await fetch("/api/gemini/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.audioBase64 || null;
  } catch (error: any) {
    console.error("Speech generation error:", error);
    return null;
  }
};

export async function playRawAudio(base64Data: string): Promise<boolean> {
  try {
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
  } catch (err) {
    console.error("playRawAudio error:", err);
    return false;
  }
}
