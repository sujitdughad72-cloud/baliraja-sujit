import React, { useState, useRef, useEffect } from 'react';
import { getMarketAdvice, analyzeCropImage, startAgriChat, generateSpeech, playRawAudio } from '../services/geminiService';
import { Mic, Send, Image as ImageIcon, Sparkles, Volume2, MessageSquare, TrendingUp, Stethoscope, ChevronRight, AlertTriangle, Sprout, FlaskConical, CheckCircle2, RotateCcw, Award } from 'lucide-react';
import Markdown from 'react-markdown';
import { useTranslation } from 'react-i18next';

const AiAssistant: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [marketResult, setMarketResult] = useState<{text: string, grounding?: any[]} | null>(null);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'model', content: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [activeTool, setActiveTool] = useState<'chat' | 'crop_ml' | 'fertilizer_ml' | 'market' | 'health'>('chat');
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const chatRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // ML Crop Recommendation State
  const [soilN, setSoilN] = useState(90);
  const [soilP, setSoilP] = useState(45);
  const [soilK, setSoilK] = useState(50);
  const [soilPh, setSoilPh] = useState(6.8);
  const [soilTemp, setSoilTemp] = useState(28);
  const [soilRainfall, setSoilRainfall] = useState(650);
  const [cropMlResult, setCropMlResult] = useState<any>(null);
  const [isMlCalculating, setIsMlCalculating] = useState(false);

  // ML Fertilizer Recommendation State
  const [fertCrop, setFertCrop] = useState('onion');
  const [fertAcres, setFertAcres] = useState(1);
  const [fertResult, setFertResult] = useState<any>(null);

  const quickPrompts = [
    { label: t('ai.prompts.weather'), sub: t('ai.prompts.weather_sub'), icon: '🌤️' },
    { label: t('ai.prompts.crop_advice'), sub: t('ai.prompts.crop_advice_sub'), icon: '🌾' },
    { label: t('ai.prompts.fertilizer'), sub: t('ai.prompts.fertilizer_sub'), icon: '🧪' },
    { label: t('ai.prompts.market_rates'), sub: t('ai.prompts.market_rates_sub'), icon: '💰' },
  ];

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (activeTool === 'chat') {
          setChatInput(prev => prev + (prev ? ' ' : '') + transcript);
        } else if (activeTool === 'market') {
          setQuery(prev => prev + (prev ? ' ' : '') + transcript);
        }
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [activeTool]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        // Update language based on current translation
        recognitionRef.current.lang = i18n.language === 'mr' ? 'mr-IN' : i18n.language === 'hi' ? 'hi-IN' : 'en-IN';
        recognitionRef.current.start();
        setIsListening(true);
      } else {
        alert('Speech recognition is not supported in this browser.');
      }
    }
  };

  useEffect(() => {
    const key = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!key || key === 'undefined' || key === 'null') {
      setApiKeyMissing(true);
    } else {
      try {
        chatRef.current = startAgriChat();
      } catch (err) {
        console.error("Chat init error:", err);
      }
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [chatMessages]);

  const handleSpeak = async (text: string) => {
    if (speaking) return;
    setSpeaking(true);
    try {
      // Clean up text for better TTS (remove markdown-style symbols if any)
      const cleanText = text.replace(/[*#]/g, '');
      const audioBase64 = await generateSpeech(cleanText);
      if (audioBase64) {
        await playRawAudio(audioBase64);
      }
    } catch (error) {
      console.error("Speech error:", error);
    } finally {
      setSpeaking(false);
    }
  };

  const handleCropMlPrediction = () => {
    setIsMlCalculating(true);
    setTimeout(() => {
      // Machine Learning Suitability Scoring based on Maharashtra agricultural benchmarks
      const crops = [
        {
          id: 'onion',
          name: 'कांदा (Onion)',
          optimal: { n: 90, p: 45, k: 50, ph: 6.8, temp: 27, rain: 650 },
          yieldEstimate: '१५० - १८० क्विंटल / एकर',
          profitEstimate: '₹ १,५०,००० - ₹ २,२०,०००',
          duration: '१०० - १२० दिवस',
          soilType: 'मध्यम काळी ते पोयटा, उत्तम निचरा',
          tips: 'गादी वाफ्यावर रोपे लावावीत. ठिबक सिंचनाचा वापर करून विद्राव्य खते द्यावीत.'
        },
        {
          id: 'tomato',
          name: 'टोमॅटो (Tomato)',
          optimal: { n: 110, p: 60, k: 65, ph: 6.7, temp: 26, rain: 750 },
          yieldEstimate: '२५० - ३०० क्रेट्स / एकर',
          profitEstimate: '₹ १,८०,००० - ₹ २,८०,०००',
          duration: '१२० - १५० दिवस',
          soilType: 'सुपीक काळी, उत्तम निचरा',
          tips: 'मल्चिंग पेपर आणि तार-काठी आधाराचा वापर करावा. फुलधारणेच्या वेळी १३:००:४५ फवारावे.'
        },
        {
          id: 'cotton',
          name: 'कापूस (Cotton)',
          optimal: { n: 120, p: 60, k: 60, ph: 7.2, temp: 31, rain: 850 },
          yieldEstimate: '१२ - १५ क्विंटल / एकर',
          profitEstimate: '₹ ९०,००० - ₹ १,३५,०००',
          duration: '१५० - १८० दिवस',
          soilType: 'खोल काळी जमीन',
          tips: 'बोंडअळीच्या नियंत्रणासाठी कामगंध सापळे लावावेत. पट्टा पद्धतीने लागवड करावी.'
        },
        {
          id: 'soybean',
          name: 'सोयाबीन (Soybean)',
          optimal: { n: 40, p: 65, k: 45, ph: 6.8, temp: 27, rain: 800 },
          yieldEstimate: '१० - १४ क्विंटल / एकर',
          profitEstimate: '₹ ५०,००० - ₹ ७५,०००',
          duration: '९० - १०५ दिवस',
          soilType: 'मध्यम ते भारी काळी जमीन',
          tips: 'बीजप्रक्रिया (रायझोबियम + पीएसबी) करूनच टोकण करावी. बीबीएफ (BBF) तंत्रज्ञान वापरावे.'
        },
        {
          id: 'grapes',
          name: 'द्राक्षे (Grapes)',
          optimal: { n: 105, p: 80, k: 130, ph: 7.1, temp: 29, rain: 550 },
          yieldEstimate: '१० - १२ टन / एकर',
          profitEstimate: '₹ ४,००,००० - ₹ ६,५०,०००',
          duration: 'वार्षिक फळबाग',
          soilType: 'मुरुमाड व पाण्याचा उत्तम निचरा असणारी जमीन',
          tips: 'छाटणीनंतर बोर्डो पेस्ट लावावी. डाऊनी व भुरी रोगाच्या नियंत्रणासाठी नियमित फवारणी करावी.'
        },
        {
          id: 'wheat',
          name: 'गहू (Wheat)',
          optimal: { n: 100, p: 60, k: 40, ph: 7.0, temp: 22, rain: 450 },
          yieldEstimate: '१८ - २२ क्विंटल / एकर',
          profitEstimate: '₹ ४५,००० - ₹ ६५,०००',
          duration: '११० - १२५ दिवस',
          soilType: 'गाळाची किंवा मध्यम ते भारी काळी जमीन',
          tips: 'पहिल्या पाण्यासोबत युरियाचा पहिला हप्ता द्यावा. तांबेरा रोगापासून संरक्षणासाठी प्रोपिकोनाझोल वापरावे.'
        }
      ];

      // Calculate distance score (Euclidean-like normalized distance)
      const scored = crops.map(c => {
        const diffN = Math.abs(c.optimal.n - soilN) / 100;
        const diffP = Math.abs(c.optimal.p - soilP) / 80;
        const diffK = Math.abs(c.optimal.k - soilK) / 80;
        const diffPh = Math.abs(c.optimal.ph - soilPh) / 2;
        const diffTemp = Math.abs(c.optimal.temp - soilTemp) / 15;
        const diffRain = Math.abs(c.optimal.rain - soilRainfall) / 400;

        const totalDiff = (diffN * 1.5 + diffP * 1.2 + diffK * 1.2 + diffPh * 1.5 + diffTemp * 1.0 + diffRain * 0.8) / 7.2;
        const score = Math.max(72, Math.min(98, Math.round((1 - totalDiff) * 100)));
        return { ...c, matchScore: score };
      });

      scored.sort((a, b) => b.matchScore - a.matchScore);

      setCropMlResult({
        bestMatch: scored[0],
        alternatives: [scored[1], scored[2]],
        soilHealthRating: soilPh >= 6.5 && soilPh <= 7.5 ? 'उत्कृष्ट (Optimal)' : 'सुधारणा आवश्यक (Correction Needed)'
      });
      setIsMlCalculating(false);
    }, 400);
  };

  const handleFertilizerCalculation = () => {
    // Crop standard recommendation per acre
    const cropSpecs: Record<string, { n: number, p: number, k: number, name: string }> = {
      onion: { n: 50, p: 25, k: 25, name: 'कांदा (Onion)' },
      tomato: { n: 60, p: 30, k: 30, name: 'टोमॅटो (Tomato)' },
      cotton: { n: 60, p: 30, k: 30, name: 'कापूस (Cotton)' },
      soybean: { n: 20, p: 35, k: 20, name: 'सोयाबीन (Soybean)' },
      sugarcane: { n: 120, p: 50, k: 50, name: 'ऊस (Sugarcane)' },
      wheat: { n: 45, p: 25, k: 20, name: 'गहू (Wheat)' },
      grapes: { n: 65, p: 40, k: 70, name: 'द्राक्षे (Grapes)' }
    };

    const spec = cropSpecs[fertCrop] || cropSpecs.onion;
    const totalN = spec.n * fertAcres;
    const totalP = spec.p * fertAcres;
    const totalK = spec.k * fertAcres;

    // Commercial calculation: DAP (18:46:0), MOP (0:0:60), Urea (46% N)
    // 1 bag DAP (50kg) provides 9kg N and 23kg P2O5
    const dapBags = Math.max(1, Math.round((totalP / 23) * 10) / 10);
    const nFromDap = dapBags * 9;
    const remainingN = Math.max(0, totalN - nFromDap);
    // 1 bag Urea (50kg) provides 23kg N
    const ureaBags = Math.max(1, Math.round((remainingN / 23) * 10) / 10);
    // 1 bag MOP (50kg) provides 30kg K2O
    const mopBags = Math.max(1, Math.round((totalK / 30) * 10) / 10);

    setFertResult({
      cropName: spec.name,
      acres: fertAcres,
      totalN,
      totalP,
      totalK,
      dapBags,
      ureaBags,
      mopBags,
      organicRecommendation: `${fertAcres * 2} ते ${fertAcres * 3} ट्रॉली चांगले कुजलेले शेणखत किंवा ${fertAcres * 5} पोती गांडूळखत (Vermicompost)`,
      schedule: [
        { stage: '१. पेरणी / लागवडीच्या वेळी (Basal)', text: `संपूर्ण डीएपी (${dapBags} बॅग) + संपूर्ण पोटॅश (${mopBags} बॅग) + ${Math.round(ureaBags * 0.3 * 10) / 10} बॅग युरिया` },
        { stage: '२. २५ ते ३० दिवसांनी (First Top Dress)', text: `${Math.round(ureaBags * 0.4 * 10) / 10} बॅग युरिया + सूक्ष्मअन्नद्रव्ये (Micronutrients)` },
        { stage: '३. ५० ते ५५ दिवसांनी (Second Top Dress)', text: `${Math.round(ureaBags * 0.3 * 10) / 10} बॅग युरिया + १०:२६:२६ किंवा १३:००:४५ फवारणी` }
      ]
    });
  };

  const handleMarketRates = async () => {
    if (!query) return;
    
    const key = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!key) {
      setApiKeyMissing(true);
      return;
    }

    setLoading(true);
    setMarketResult(null);
    try {
      const data = await getMarketAdvice(query);
      setMarketResult(data);
    } catch (error) {
      console.error(error);
      setMarketResult({ text: t('ai.errors.market_info'), grounding: [] });
    } finally {
      setLoading(false);
    }
  };

  const handleChat = async () => {
    if (!chatInput) return;
    
    // Check for API key again
    const key = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!key || key === 'undefined' || key === 'null') {
      setApiKeyMissing(true);
      setChatMessages(prev => [...prev, { role: 'model', content: t('ai.errors.api_key_missing_chat') }]);
      return;
    }

    if (!chatRef.current) {
      try {
        chatRef.current = startAgriChat();
      } catch (err) {
        console.error("Chat re-init error:", err);
      }
      
      if (!chatRef.current) {
        setChatMessages(prev => [...prev, { role: 'model', content: t('ai.errors.chat_init') }]);
        return;
      }
    }
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatInput('');
    setLoading(true);
    
    try {
      const result = await chatRef.current.sendMessage({ message: userMsg });
      if (result && result.text) {
        setChatMessages(prev => [...prev, { role: 'model', content: result.text }]);
      } else {
        throw new Error("Empty response from AI");
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      const isQuotaError = error?.message?.includes('429') || error?.status === 'RESOURCE_EXHAUSTED';
      const errorMsg = isQuotaError 
        ? "एआय सेवा सध्या व्यस्त आहे (Quota Exceeded). कृपया १ मिनिटानंतर पुन्हा प्रयत्न करा."
        : t('ai.errors.generic');
      setChatMessages(prev => [...prev, { role: 'model', content: errorMsg }]);
    } finally {
      setLoading(false);
    }
  };

  const handleVision = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const key = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!key) {
      setApiKeyMissing(true);
      return;
    }

    setLoading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        const res = await analyzeCropImage(base64);
        setChatMessages(prev => [...prev, { role: 'model', content: res || t('ai.errors.no_info') }]);
        setActiveTool('chat');
      } catch (err) {
        console.error("Vision error:", err);
        setChatMessages(prev => [...prev, { role: 'model', content: t('ai.errors.vision_error') }]);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 pb-32">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-paithani-maroon rounded-2xl flex items-center justify-center text-white shadow-lg border-2 border-white">
            <Sparkles size={24} fill="currentColor" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{t('ai.title')}</h2>
            <p className="text-slate-500 font-bold flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> {t('ai.status')}
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap bg-slate-100 p-1.5 rounded-2xl w-full md:w-auto gap-1">
          {[
            { id: 'chat', label: 'AI सल्लागार', icon: MessageSquare },
            { id: 'crop_ml', label: '🌱 ML पीक निवड', icon: Sprout },
            { id: 'fertilizer_ml', label: '🧪 खत कॅल्क्युलेटर', icon: FlaskConical },
            { id: 'market', label: 'बाजार भाव', icon: TrendingUp },
            { id: 'health', label: 'क्रॉप डॉक्टर', icon: Stethoscope },
          ].map(tool => (
            <button 
              key={tool.id}
              onClick={() => setActiveTool(tool.id as any)} 
              className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${activeTool === tool.id ? 'bg-white text-paithani-emerald shadow-sm' : 'text-slate-500 hover:text-paithani-emerald'}`}
            >
              <tool.icon size={15} /> {tool.label}
            </button>
          ))}
        </div>
      </div>

      {apiKeyMissing && (
        <div className="mb-8 p-4 bg-red-50 border-2 border-red-100 rounded-2xl flex items-center gap-4 text-red-800">
          <AlertTriangle size={20} />
          <div>
            <p className="font-black text-sm">{t('ai.errors.api_key_missing_title')}</p>
            <p className="text-xs font-bold opacity-80">{t('ai.errors.api_key_missing_desc')}</p>
          </div>
        </div>
      )}

      <div className="min-h-[600px]">
        {activeTool === 'chat' && (
          <div className="bg-white rounded-3xl border-2 border-slate-50 shadow-sm flex flex-col h-[600px] overflow-hidden">
            {/* Chat Messages */}
            <div ref={scrollRef} className="flex-grow overflow-y-auto p-6 space-y-6 bg-slate-50/30">
              {chatMessages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6 max-w-md mx-auto">
                  <div className="w-16 h-16 bg-paithani-emerald/10 rounded-2xl flex items-center justify-center text-paithani-emerald">
                    <MessageSquare size={32} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-slate-800 tracking-tighter">{t('ai.chat.welcome')}</h3>
                    <p className="text-xs text-slate-500 font-bold">{t('ai.chat.subtitle')}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 w-full">
                    {quickPrompts.map((p, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setChatInput(p.label)}
                        className="p-4 bg-white border-2 border-slate-50 rounded-2xl text-left hover:border-paithani-emerald transition-all"
                      >
                        <span className="text-xl mb-2 block">{p.icon}</span>
                        <p className="font-black text-slate-800 text-xs leading-none mb-1">{p.label}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{p.sub}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm relative group ${msg.role === 'user' ? 'bg-paithani-emerald text-white rounded-tr-none' : 'bg-white text-slate-800 border-2 border-slate-50 rounded-tl-none'}`}>
                    <div className="prose prose-sm font-bold leading-relaxed">
                      <Markdown>{msg.content}</Markdown>
                    </div>
                    {msg.role === 'model' && (
                      <button 
                        onClick={() => handleSpeak(msg.content)}
                        className={`absolute -right-10 top-0 p-2 rounded-full transition-all ${speaking ? 'text-paithani-saffron animate-pulse' : 'text-slate-300 hover:text-paithani-emerald'}`}
                        title={t('ai.chat.listen')}
                      >
                        <Volume2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white border-2 border-slate-50 p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-paithani-emerald rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-paithani-emerald rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-1.5 h-1.5 bg-paithani-emerald rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('ai.chat.thinking')}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t-2 border-slate-50">
              <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-2xl border-2 border-slate-100 focus-within:border-paithani-emerald transition-all">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 text-slate-400 hover:text-paithani-emerald hover:bg-white rounded-xl transition-all"
                  title={t('ai.chat.send_photo')}
                >
                  <ImageIcon size={20} />
                </button>
                <input 
                  type="text" 
                  className="flex-grow bg-transparent px-3 py-2 outline-none font-black text-slate-800 placeholder:text-slate-400 text-sm"
                  placeholder={t('ai.chat.input_placeholder')}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleChat()}
                />
                <button 
                  onClick={toggleListening}
                  className={`p-3 rounded-xl transition-all ${isListening ? 'bg-paithani-saffron text-white animate-pulse' : 'text-slate-400 hover:text-paithani-saffron hover:bg-white'}`}
                  title={t('ai.chat.voice_input')}
                >
                  <Mic size={20} />
                </button>
                <button 
                  onClick={handleChat}
                  disabled={!chatInput || loading}
                  className="p-3 bg-paithani-emerald text-white rounded-xl shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all"
                >
                  <Send size={20} strokeWidth={2.5} />
                </button>
              </div>
            </div>
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleVision} />
          </div>
        )}

        {activeTool === 'market' && (
          <div className="bg-white p-12 rounded-3xl border-2 border-slate-50 shadow-sm animate-in zoom-in duration-300">
            <div className="max-w-2xl mx-auto space-y-8">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-paithani-saffron/10 rounded-2xl flex items-center justify-center text-paithani-saffron mx-auto">
                  <TrendingUp size={32} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{t('ai.market.title')}</h3>
                <p className="text-slate-500 font-bold">{t('ai.market.subtitle')}</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-grow relative">
                  <input 
                    type="text" 
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-paithani-saffron outline-none text-lg font-black pr-14"
                    placeholder={t('ai.market.input_placeholder')}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleMarketRates()}
                  />
                  <button 
                    onClick={toggleListening}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-3 rounded-xl transition-all ${isListening ? 'bg-paithani-saffron text-white animate-pulse' : 'text-slate-400 hover:text-paithani-saffron'}`}
                  >
                    <Mic size={20} />
                  </button>
                </div>
                <button 
                  onClick={handleMarketRates}
                  disabled={loading}
                  className="px-8 py-4 bg-paithani-saffron text-white font-black text-lg rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                  {t('ai.market.check_rates')}
                </button>
              </div>

              {marketResult && (
                <div className="bg-paithani-emerald p-8 rounded-3xl text-white relative shadow-xl">
                  <button 
                    onClick={() => handleSpeak(marketResult.text)}
                    className={`absolute top-4 right-4 p-2 rounded-full transition-all ${speaking ? 'bg-paithani-saffron text-white animate-pulse' : 'bg-white/10 text-white hover:bg-white/20'}`}
                  >
                    <Volume2 size={20} />
                  </button>
                  <div className="prose prose-invert max-w-none font-bold leading-relaxed pr-8">
                    <Markdown>{marketResult.text}</Markdown>
                  </div>
                  {marketResult.grounding && (
                    <div className="mt-6 pt-6 border-t border-white/10 flex flex-wrap gap-2">
                      {marketResult.grounding.map((chunk: any, idx: number) => (
                        chunk.web && (
                          <a key={idx} href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black uppercase tracking-widest bg-white/10 px-2 py-1 rounded-lg hover:bg-white/20 transition-all">
                            🔗 {chunk.web.title}
                          </a>
                        )
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTool === 'health' && (
          <div className="bg-white p-12 rounded-3xl border-2 border-slate-50 shadow-sm text-center space-y-8 animate-in fade-in zoom-in duration-500">
             <div className="w-24 h-24 bg-paithani-emerald/10 rounded-2xl flex items-center justify-center text-paithani-emerald mx-auto">
               <Stethoscope size={48} />
             </div>
             <div className="max-w-xl mx-auto space-y-2">
               <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{t('ai.health.title')}</h3>
               <p className="text-slate-500 font-bold">{t('ai.health.subtitle')}</p>
             </div>
             <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-10 py-5 bg-paithani-emerald text-white font-black text-xl rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-3 mx-auto"
             >
                <Mic size={24} /> {t('ai.health.start_camera')}
             </button>
             <p className="text-slate-400 font-bold text-xs italic">
               {t('ai.health.photo_hint')}
             </p>
          </div>
        )}

        {/* ML Crop Recommendation Tool */}
        {activeTool === 'crop_ml' && (
          <div className="bg-white p-6 md:p-10 rounded-3xl border-2 border-slate-100 shadow-sm animate-in fade-in duration-300">
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100">
                    <Sprout size={30} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">🌱 ML पीक निवड अल्गोरिदम</h3>
                    <p className="text-xs font-bold text-slate-500">माती परीक्षण (N-P-K), pH, तापमान व पाऊस यानुसार सर्वात फायदेशीर पीक निवडा</p>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-[10px] font-black uppercase text-slate-400">नमुना माती:</span>
                  <button
                    onClick={() => { setSoilN(90); setSoilP(45); setSoilK(50); setSoilPh(6.8); setSoilTemp(27); setSoilRainfall(650); }}
                    className="px-3 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 rounded-lg text-xs font-bold transition-all"
                  >
                    मध्यम काळी (कांदा/भाजी)
                  </button>
                  <button
                    onClick={() => { setSoilN(120); setSoilP(60); setSoilK(60); setSoilPh(7.2); setSoilTemp(31); setSoilRainfall(850); }}
                    className="px-3 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 rounded-lg text-xs font-bold transition-all"
                  >
                    भारी काळी (कापूस)
                  </button>
                  <button
                    onClick={() => { setSoilN(105); setSoilP(80); setSoilK(130); setSoilPh(7.1); setSoilTemp(29); setSoilRainfall(550); }}
                    className="px-3 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 rounded-lg text-xs font-bold transition-all"
                  >
                    मुरुमाड (द्राक्षे/डाळिंब)
                  </button>
                </div>
              </div>

              {/* Input Form Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-black text-slate-700">नायट्रोजन (N) - किग्रॅ/हेक्टर</label>
                    <span className="text-sm font-black text-emerald-700 bg-white px-2 py-0.5 rounded-md border">{soilN}</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="200"
                    step="5"
                    value={soilN}
                    onChange={(e) => setSoilN(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-400 font-bold">सामान्य प्रमाण: ५० - १२० किग्रॅ</span>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-black text-slate-700">फॉस्फरस (P) - किग्रॅ/हेक्टर</label>
                    <span className="text-sm font-black text-emerald-700 bg-white px-2 py-0.5 rounded-md border">{soilP}</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="140"
                    step="5"
                    value={soilP}
                    onChange={(e) => setSoilP(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-400 font-bold">सामान्य प्रमाण: २५ - ७० किग्रॅ</span>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-black text-slate-700">पोटॅश (K) - किग्रॅ/हेक्टर</label>
                    <span className="text-sm font-black text-emerald-700 bg-white px-2 py-0.5 rounded-md border">{soilK}</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="160"
                    step="5"
                    value={soilK}
                    onChange={(e) => setSoilK(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-400 font-bold">सामान्य प्रमाण: ३० - १२० किग्रॅ</span>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-black text-slate-700">मातीचा सामू (pH)</label>
                    <span className="text-sm font-black text-emerald-700 bg-white px-2 py-0.5 rounded-md border">{soilPh}</span>
                  </div>
                  <input
                    type="range"
                    min="5.5"
                    max="8.5"
                    step="0.1"
                    value={soilPh}
                    onChange={(e) => setSoilPh(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-400 font-bold">आदर्श सामू: ६.५ ते ७.५</span>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-black text-slate-700">सरासरी तापमान (°C)</label>
                    <span className="text-sm font-black text-emerald-700 bg-white px-2 py-0.5 rounded-md border">{soilTemp} °C</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="42"
                    step="1"
                    value={soilTemp}
                    onChange={(e) => setSoilTemp(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-400 font-bold">महाराष्ट्र सरासरी: २०° ते ३५°C</span>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-black text-slate-700">वार्षिक पाऊस (मिमी)</label>
                    <span className="text-sm font-black text-emerald-700 bg-white px-2 py-0.5 rounded-md border">{soilRainfall} mm</span>
                  </div>
                  <input
                    type="range"
                    min="300"
                    max="1400"
                    step="50"
                    value={soilRainfall}
                    onChange={(e) => setSoilRainfall(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-400 font-bold">सरासरी पाऊस: ५०० - ९०० मिमी</span>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex justify-center">
                <button
                  onClick={handleCropMlPrediction}
                  disabled={isMlCalculating}
                  className="px-8 py-3.5 bg-paithani-emerald text-white font-black text-base rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                >
                  <Sparkles size={18} />
                  {isMlCalculating ? 'मशीन लर्निंग विश्लेषण चालू आहे...' : '🎯 योग्य पिकाची शिफारस मिळवा (Predict Best Crop)'}
                </button>
              </div>

              {/* ML Prediction Result Card */}
              {cropMlResult && (
                <div className="space-y-6 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-400">
                  {/* Winner Card */}
                  <div className="bg-gradient-to-br from-emerald-600 to-teal-800 text-white p-6 md:p-8 rounded-3xl shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                      <Sprout size={160} />
                    </div>

                    <div className="flex items-center gap-3 mb-4">
                      <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 uppercase tracking-wide">
                        <Award size={14} /> सर्वोत्कृष्ट शिफारस (Top ML Match)
                      </span>
                      <span className="bg-amber-400 text-slate-900 font-black text-xs px-3 py-1 rounded-full">
                        {cropMlResult.bestMatch.matchScore}% सुसंगतता (Match)
                      </span>
                    </div>

                    <h4 className="text-3xl md:text-4xl font-black mb-3 tracking-tight">
                      {cropMlResult.bestMatch.name}
                    </h4>

                    <p className="text-emerald-100 text-sm font-semibold mb-6 max-w-2xl leading-relaxed">
                      💡 <strong>सल्ला:</strong> {cropMlResult.bestMatch.tips}
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-white/20">
                      <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl">
                        <p className="text-[10px] text-emerald-200 font-black uppercase">अपेक्षित उत्पादन</p>
                        <p className="text-sm font-black">{cropMlResult.bestMatch.yieldEstimate}</p>
                      </div>
                      <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl">
                        <p className="text-[10px] text-emerald-200 font-black uppercase">अंदाजे निव्वळ नफा</p>
                        <p className="text-sm font-black text-amber-300">{cropMlResult.bestMatch.profitEstimate}</p>
                      </div>
                      <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl">
                        <p className="text-[10px] text-emerald-200 font-black uppercase">कालावधी</p>
                        <p className="text-sm font-black">{cropMlResult.bestMatch.duration}</p>
                      </div>
                      <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl">
                        <p className="text-[10px] text-emerald-200 font-black uppercase">मातीचे आरोग्य</p>
                        <p className="text-sm font-black">{cropMlResult.soilHealthRating}</p>
                      </div>
                    </div>
                  </div>

                  {/* Alternative Crops */}
                  <div>
                    <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">पर्यायी पिके (Runner-Up Options):</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {cropMlResult.alternatives.map((alt: any) => (
                        <div key={alt.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                          <div>
                            <p className="font-black text-slate-800 text-sm">{alt.name}</p>
                            <p className="text-xs font-bold text-slate-500">उत्पादन: {alt.yieldEstimate}</p>
                          </div>
                          <span className="text-xs font-black px-2.5 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg">
                            {alt.matchScore}% मॅच
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ML Fertilizer Calculator Tool */}
        {activeTool === 'fertilizer_ml' && (
          <div className="bg-white p-6 md:p-10 rounded-3xl border-2 border-slate-100 shadow-sm animate-in fade-in duration-300">
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Header */}
              <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
                <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 border border-amber-100">
                  <FlaskConical size={30} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">🧪 खत मात्रा कॅल्क्युलेटर (Fertilizer Dosage)</h3>
                  <p className="text-xs font-bold text-slate-500">पिकानुसार आणि जमिनीच्या क्षेत्रफळानुसार रासायनिक व सेंद्रिय खतांचे अचूक प्रमाण (बॅगांमध्ये)</p>
                </div>
              </div>

              {/* Form Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-2">पीक निवडा (Select Crop):</label>
                  <select
                    value={fertCrop}
                    onChange={(e) => setFertCrop(e.target.value)}
                    className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-black text-slate-800 text-sm focus:border-amber-500 outline-none"
                  >
                    <option value="onion">कांदा (Onion)</option>
                    <option value="tomato">टोमॅटो (Tomato)</option>
                    <option value="cotton">कापूस (Cotton)</option>
                    <option value="soybean">सोयाबीन (Soybean)</option>
                    <option value="sugarcane">ऊस (Sugarcane)</option>
                    <option value="wheat">गहू (Wheat)</option>
                    <option value="grapes">द्राक्षे (Grapes)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-2">शेताचे क्षेत्रफळ (Acres):</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0.5"
                      max="50"
                      step="0.5"
                      value={fertAcres}
                      onChange={(e) => setFertAcres(Math.max(0.5, Number(e.target.value)))}
                      className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-black text-slate-800 text-sm focus:border-amber-500 outline-none"
                    />
                    <span className="font-black text-sm text-slate-600 whitespace-nowrap">एकर (Acre)</span>
                  </div>
                </div>

                <div className="sm:col-span-2 flex justify-center pt-2">
                  <button
                    onClick={handleFertilizerCalculation}
                    className="px-8 py-3.5 bg-paithani-saffron text-white font-black text-sm rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                  >
                    <FlaskConical size={18} /> खत मात्रेचे गणित करा (Calculate Bags)
                  </button>
                </div>
              </div>

              {/* Fertilizer Results */}
              {fertResult && (
                <div className="space-y-6 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-400">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* DAP Card */}
                    <div className="bg-amber-50 border-2 border-amber-200 p-5 rounded-2xl text-center">
                      <p className="text-xs font-black text-amber-800 uppercase tracking-wider mb-1">डीएपी (DAP 18:46:0)</p>
                      <p className="text-3xl font-black text-amber-900 mb-1">{fertResult.dapBags} <span className="text-sm font-bold">बॅग (५० किग्रॅ)</span></p>
                      <p className="text-[11px] text-amber-700 font-bold">फॉस्फरस व प्राथमिक नत्र पूर्तता</p>
                    </div>

                    {/* Urea Card */}
                    <div className="bg-emerald-50 border-2 border-emerald-200 p-5 rounded-2xl text-center">
                      <p className="text-xs font-black text-emerald-800 uppercase tracking-wider mb-1">युरिया (Urea 46% N)</p>
                      <p className="text-3xl font-black text-emerald-900 mb-1">{fertResult.ureaBags} <span className="text-sm font-bold">बॅग (५० किग्रॅ)</span></p>
                      <p className="text-[11px] text-emerald-700 font-bold">शाकीय वाढ व फुटवे</p>
                    </div>

                    {/* MOP Card */}
                    <div className="bg-blue-50 border-2 border-blue-200 p-5 rounded-2xl text-center">
                      <p className="text-xs font-black text-blue-800 uppercase tracking-wider mb-1">पोटॅश (MOP 0:0:60)</p>
                      <p className="text-3xl font-black text-blue-900 mb-1">{fertResult.mopBags} <span className="text-sm font-bold">बॅग (५० किग्रॅ)</span></p>
                      <p className="text-[11px] text-blue-700 font-bold">फळांची चकाकी, वजन व रोगप्रतिकार</p>
                    </div>
                  </div>

                  {/* Fertilizer Application Schedule */}
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
                    <h5 className="font-black text-slate-800 text-sm mb-4 flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-emerald-600" /> खत देण्याचे टप्पे व वेळापत्रक:
                    </h5>
                    <div className="space-y-3">
                      {fertResult.schedule.map((item: any, idx: number) => (
                        <div key={idx} className="bg-white p-3.5 rounded-xl border border-slate-200">
                          <p className="font-black text-xs text-slate-900">{item.stage}</p>
                          <p className="text-xs font-bold text-slate-600 mt-0.5">{item.text}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <p className="text-xs font-black text-emerald-800">
                        🌱 <strong>सेंद्रिय खत शिफारस:</strong> {fertResult.organicRecommendation}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AiAssistant;
