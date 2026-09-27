
import React, { useState, useRef, useEffect } from 'react';
import { getMarketAdvice, analyzeCropImage, startAgriChat, generateSpeech, playRawAudio } from '../services/geminiService';
import { Mic, Send, Image as ImageIcon, Sparkles, Volume2, MessageSquare, TrendingUp, Stethoscope, ChevronRight, AlertTriangle } from 'lucide-react';
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
  const [activeTool, setActiveTool] = useState<'market' | 'health' | 'chat'>('chat');
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const chatRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

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
        
        <div className="flex bg-slate-100 p-1 rounded-2xl w-full md:w-auto">
          {[
            { id: 'chat', label: t('ai.tools.chat'), icon: MessageSquare },
            { id: 'market', label: t('ai.tools.market'), icon: TrendingUp },
            { id: 'health', label: t('ai.tools.health'), icon: Stethoscope },
          ].map(tool => (
            <button 
              key={tool.id}
              onClick={() => setActiveTool(tool.id as any)} 
              className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${activeTool === tool.id ? 'bg-white text-paithani-emerald shadow-sm' : 'text-slate-400 hover:text-paithani-emerald'}`}
            >
              <tool.icon size={16} /> {tool.label}
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
      </div>
    </div>
  );
};

export default AiAssistant;
