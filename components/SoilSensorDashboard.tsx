import React, { useState, useEffect, useRef } from 'react';
import { 
  Cpu, Droplets, Activity, Zap, Thermometer, Gauge, 
  RefreshCw, Play, Pause, CheckCircle2, AlertTriangle, 
  Download, Code2, Layers, Wifi, Usb, Radio, Sparkles, 
  Volume2, ArrowRight, ShieldCheck, HelpCircle, Copy, Check, Info, Sliders
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  Tooltip, CartesianGrid, BarChart, Bar, Legend 
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { SensorReading, SensorPredictionResult } from '../types';
import { 
  SENSOR_PRESETS, 
  calculateSensorPredictions, 
  connectWebSerial, 
  getArduinoFirmwareCode,
  getEsp32SoilDhtFirmwareCode,
  getEsp8266DhtFirmwareCode 
} from '../services/soilSensorService';
import { api } from '../services/apiClient';
import { generateSpeech, playRawAudio } from '../services/geminiService';
import { toast } from 'sonner';

interface SoilSensorDashboardProps {
  onNavigateToCropPlan?: (cropName: string) => void;
}

export const SoilSensorDashboard: React.FC<SoilSensorDashboardProps> = ({ onNavigateToCropPlan }) => {
  const { t, i18n } = useTranslation();

  // Active Live Reading State (Defaulted to optimal Maharashtra soil)
  const [currentReading, setCurrentReading] = useState<SensorReading>({
    deviceId: 'BALIRAJA-ESP32-01',
    deviceName: 'नाशिक शेत प्लॉट १ (Nashik Plot 1)',
    nitrogen: 55,
    phosphorus: 28,
    potassium: 42,
    moisture: 52,
    ph: 6.8,
    temperature: 26.5,
    ec: 410,
    battery: 94,
    timestamp: new Date().toLocaleTimeString(),
    connectionType: 'simulated'
  });

  // History for charts
  const [history, setHistory] = useState<any[]>([
    { time: '१०:००', moisture: 54, n: 56, p: 29, k: 43 },
    { time: '१०:०५', moisture: 53, n: 55, p: 28, k: 42 },
    { time: '१०:१०', moisture: 52, n: 55, p: 28, k: 42 },
    { time: '१०:१५', moisture: 52, n: 54, p: 28, k: 41 },
    { time: '१०:२०', moisture: 51, n: 55, p: 28, k: 42 }
  ]);

  // Derived Prediction Result
  const [prediction, setPrediction] = useState<SensorPredictionResult>(() => 
    calculateSensorPredictions(currentReading)
  );

  // Connection & Simulator States
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isSerialConnected, setIsSerialConnected] = useState<boolean>(false);
  const [serialDisconnectFn, setSerialDisconnectFn] = useState<(() => Promise<void>) | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'prediction' | 'history' | 'hardware' | 'manual'>('prediction');
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedCurl, setCopiedCurl] = useState<boolean>(false);
  const [firmwareMode, setFirmwareMode] = useState<'esp8266_dht' | 'soil_dht' | 'rs485_npk'>('esp8266_dht');

  // Manual Calibration Adjusters
  const [manualN, setManualN] = useState<number>(currentReading.nitrogen);
  const [manualP, setManualP] = useState<number>(currentReading.phosphorus);
  const [manualK, setManualK] = useState<number>(currentReading.potassium);
  const [manualMoisture, setManualMoisture] = useState<number>(currentReading.moisture);
  const [manualPh, setManualPh] = useState<number>(currentReading.ph);
  const [manualTemp, setManualTemp] = useState<number>(currentReading.temperature);

  const simulationTimerRef = useRef<any>(null);

  // Fetch initial latest reading from backend if present
  useEffect(() => {
    async function loadLatest() {
      try {
        const latest = await api.sensors.getLatest();
        if (latest && latest.nitrogen) {
          setCurrentReading(prev => ({ ...prev, ...latest, timestamp: new Date().toLocaleTimeString() }));
          setPrediction(calculateSensorPredictions({ ...currentReading, ...latest }));
        }
      } catch (e) {
        // Fallback to initial
      }
    }
    loadLatest();
  }, []);

  // Update prediction whenever reading changes
  useEffect(() => {
    const newPred = calculateSensorPredictions(currentReading);
    setPrediction(newPred);
    setManualN(currentReading.nitrogen);
    setManualP(currentReading.phosphorus);
    setManualK(currentReading.potassium);
    setManualMoisture(currentReading.moisture);
    setManualPh(currentReading.ph);
    setManualTemp(currentReading.temperature);
  }, [currentReading]);

  // Live Telemetry Simulation Engine
  useEffect(() => {
    if (isSimulating) {
      simulationTimerRef.current = setInterval(() => {
        setCurrentReading(prev => {
          // Add realistic probe noise (±1.5%)
          const jitter = (val: number, delta: number, min: number, max: number) => {
            const change = (Math.random() - 0.5) * delta;
            return Math.max(min, Math.min(max, Math.round((val + change) * 10) / 10));
          };

          const updated: SensorReading = {
            ...prev,
            nitrogen: jitter(prev.nitrogen, 2, 5, 140),
            phosphorus: jitter(prev.phosphorus, 1.5, 5, 80),
            potassium: jitter(prev.potassium, 2, 10, 100),
            moisture: jitter(prev.moisture, 1.8, 5, 95),
            temperature: jitter(prev.temperature, 0.4, 15, 45),
            ph: jitter(prev.ph, 0.05, 4.5, 9.0),
            timestamp: new Date().toLocaleTimeString(),
            connectionType: 'simulated'
          };

          // Append to chart history (keep last 12)
          setHistory(h => [
            ...h.slice(-11),
            {
              time: updated.timestamp,
              moisture: updated.moisture,
              n: updated.nitrogen,
              p: updated.phosphorus,
              k: updated.potassium
            }
          ]);

          return updated;
        });
      }, 3000);
    } else {
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current);
      }
    }

    return () => {
      if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
    };
  }, [isSimulating]);

  // Handle Preset Selection
  const applyPreset = (index: number) => {
    setSelectedPreset(index);
    const preset = SENSOR_PRESETS[index];
    if (preset) {
      const newReading: SensorReading = {
        ...preset.reading,
        timestamp: new Date().toLocaleTimeString(),
        connectionType: 'simulated'
      };
      setCurrentReading(newReading);
      toast.success(`लागू केले: ${preset.name}`);
    }
  };

  // Handle Web Serial Connection (USB - RS485 Modbus Adapter)
  const handleConnectSerial = async () => {
    if (isSerialConnected && serialDisconnectFn) {
      await serialDisconnectFn();
      setIsSerialConnected(false);
      setSerialDisconnectFn(null);
      toast.info('USB सेन्सर डिस्कनेक्ट केला');
      return;
    }

    try {
      toast.info('USB पोर्ट निवडा...');
      const connection = await connectWebSerial((data) => {
        setCurrentReading(prev => {
          const updated: SensorReading = {
            ...prev,
            nitrogen: data.nitrogen ?? prev.nitrogen,
            phosphorus: data.phosphorus ?? prev.phosphorus,
            potassium: data.potassium ?? prev.potassium,
            moisture: data.moisture ?? prev.moisture,
            ph: data.ph ?? prev.ph,
            temperature: data.temperature ?? prev.temperature,
            ec: data.ec ?? prev.ec,
            timestamp: new Date().toLocaleTimeString(),
            connectionType: 'serial'
          };

          setHistory(h => [
            ...h.slice(-11),
            {
              time: updated.timestamp,
              moisture: updated.moisture,
              n: updated.nitrogen,
              p: updated.phosphorus,
              k: updated.potassium
            }
          ]);

          return updated;
        });
      });

      setIsSerialConnected(true);
      setSerialDisconnectFn(() => connection.disconnect);
      toast.success('USB RS-485 सेन्सर यशस्वीपणे जोडला!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'USB सेन्सर जोडण्यात अयशस्वी');
    }
  };

  // Apply Manual Sliders
  const handleApplyManual = () => {
    const updated: SensorReading = {
      ...currentReading,
      nitrogen: manualN,
      phosphorus: manualP,
      potassium: manualK,
      moisture: manualMoisture,
      ph: manualPh,
      temperature: manualTemp,
      timestamp: new Date().toLocaleTimeString(),
      connectionType: 'simulated'
    };
    setCurrentReading(updated);
    toast.success('माती सेन्सर रिडिंग्स अपडेट केल्या!');
  };

  // Marathi Voice Speech Readout
  const handleSpeakAdvisory = async () => {
    if (isSpeaking) return;
    setIsSpeaking(true);
    try {
      const speechText = `${prediction.summaryMr}. सिंचन सल्ला: ${prediction.moistureAnalysis.actionRequired}. सर्वाधिक योग्य पीक ${prediction.topCrops[0]?.cropNameMr} असून मॅच स्कोअर ${prediction.topCrops[0]?.matchScore} टक्के आहे.`;
      const audioBase64 = await generateSpeech(speechText);
      if (audioBase64) {
        await playRawAudio(audioBase64);
      }
    } catch (err) {
      console.error(err);
      toast.error('आवाज प्ले करण्यात अडचण आली.');
    } finally {
      setIsSpeaking(false);
    }
  };

  // Copy Arduino / ESP Firmware
  const copyArduinoCode = () => {
    const code = firmwareMode === 'esp8266_dht'
      ? getEsp8266DhtFirmwareCode(window.location.origin, currentReading.deviceId)
      : firmwareMode === 'soil_dht'
      ? getEsp32SoilDhtFirmwareCode(window.location.origin, currentReading.deviceId)
      : getArduinoFirmwareCode(window.location.origin, currentReading.deviceId);
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    toast.success('ESP8266 / ESP32 कोड क्लिपबोर्डवर कॉपी झाला!');
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // Copy cURL command
  const copyCurl = () => {
    const curlCommand = `curl -X POST "${window.location.origin}/api/sensors/reading" \\
  -H "Content-Type: application/json" \\
  -d '{"deviceId":"${currentReading.deviceId}","nitrogen":${currentReading.nitrogen},"phosphorus":${currentReading.phosphorus},"potassium":${currentReading.potassium},"moisture":${currentReading.moisture},"ph":${currentReading.ph},"temperature":${currentReading.temperature}}'`;
    navigator.clipboard.writeText(curlCommand);
    setCopiedCurl(true);
    toast.success('cURL कमांड कॉपी झाली!');
    setTimeout(() => setCopiedCurl(false), 2500);
  };

  // Export History as CSV
  const exportCsv = () => {
    const rows = [
      ['Time', 'Moisture (%)', 'Nitrogen (mg/kg)', 'Phosphorus (mg/kg)', 'Potassium (mg/kg)', 'pH', 'Temperature (°C)'],
      ...history.map(h => [h.time, h.moisture, h.n, h.p, h.k, currentReading.ph, currentReading.temperature])
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `baliraja_soil_sensor_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV फाईल डाऊनलोड झाली!');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 pb-32">
      {/* Top Banner / Title */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden border border-emerald-500/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 rounded-full text-emerald-300 text-xs font-bold tracking-wide uppercase">
              <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
              <span>IoT स्मार्ट माती व NPK सेन्सर सिस्टीम</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              माती ओलावा व NPK सेन्सर
            </h1>
            <p className="text-emerald-100/80 text-sm sm:text-base max-w-2xl font-medium">
              RS485 Modbus NPK सेन्सर व Capacitive माती ओलावा सेन्सरचे थेट रिडिंग्स जोडून पिकांची अचूक शिफारस, सिंचन वेळ आणि संतुलित खतांचे प्रमाण मिळवा.
            </p>
          </div>

          {/* Connection Controls Button Cluster */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* USB Serial Connect */}
            <button
              onClick={handleConnectSerial}
              className={`px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md active:scale-95 ${
                isSerialConnected 
                  ? 'bg-rose-600 text-white hover:bg-rose-700' 
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              <Usb className="w-4 h-4" />
              <span>{isSerialConnected ? 'USB डिस्कनेक्ट' : '🔌 USB / RS485 ने जोडा'}</span>
            </button>

            {/* Live Simulator Toggle */}
            <button
              onClick={() => setIsSimulating(!isSimulating)}
              className={`px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md active:scale-95 ${
                isSimulating 
                  ? 'bg-amber-500 text-white animate-pulse' 
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
              }`}
            >
              {isSimulating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isSimulating ? 'लाईव्ह सिम्युलेटर सुरू' : '⚡ लाईव्ह सिम्युलेटर'}</span>
            </button>

            {/* Voice Readout Button */}
            <button
              onClick={handleSpeakAdvisory}
              disabled={isSpeaking}
              className="px-4 py-2.5 bg-paithani-saffron hover:bg-amber-600 text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md disabled:opacity-50"
              title="मराठीत ऑडिओ ऐका"
            >
              <Volume2 className={`w-4 h-4 ${isSpeaking ? 'animate-bounce' : ''}`} />
              <span>{isSpeaking ? 'बोलत आहे...' : '🔊 आवाज सल्ला'}</span>
            </button>
          </div>
        </div>

        {/* Live Device Status Bar */}
        <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-medium">
          <div className="flex items-center gap-2 text-emerald-200">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
            <span>डिव्हाइस आयडी: <strong className="text-white">{currentReading.deviceId}</strong></span>
          </div>
          <div className="text-emerald-200">
            <span>जोडणी प्रकार: <strong className="text-white uppercase">{currentReading.connectionType || 'Simulated'}</strong></span>
          </div>
          <div className="text-emerald-200">
            <span>अखेरचे रिडिंग: <strong className="text-white">{currentReading.timestamp}</strong></span>
          </div>
          <div className="text-emerald-200">
            <span>बॅटरी: <strong className="text-white">{currentReading.battery || 92}%</strong></span>
          </div>
        </div>
      </div>

      {/* Preset Condition Selector */}
      <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-sm">शेती परिस्थिती निवडा (Field Presets):</h3>
            <p className="text-xs text-slate-500 font-medium">वेगवेगळ्या माती प्रकारांमध्ये सेन्सरची अचूक चाचणी घ्या</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {SENSOR_PRESETS.map((p, idx) => (
            <button
              key={p.name}
              onClick={() => applyPreset(idx)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedPreset === idx 
                  ? 'bg-paithani-emerald text-white shadow-md' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {p.name.split(' (')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* 4 PRIMARY SENSOR GAUGES (Moisture, N, P, K) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* 1. SOIL MOISTURE GAUGE */}
        <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-sm hover:shadow-lg transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Droplets className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <h4 className="font-black text-slate-800 text-sm">मातीचा ओलावा</h4>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Soil Moisture</span>
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${prediction.moistureAnalysis.badgeColor}`}>
              {prediction.moistureAnalysis.status.split(' ')[0]}
            </span>
          </div>

          <div className="flex items-baseline gap-2 my-2">
            <span className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
              {currentReading.moisture}
            </span>
            <span className="text-lg font-bold text-slate-500">% VWC</span>
          </div>

          {/* Moisture Bar */}
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden my-3 relative">
            <div 
              className={`h-full rounded-full transition-all duration-700 ${
                currentReading.moisture < 25 
                  ? 'bg-rose-500' 
                  : currentReading.moisture <= 70 
                    ? 'bg-blue-500' 
                    : 'bg-indigo-600'
              }`}
              style={{ width: `${Math.min(100, currentReading.moisture)}%` }}
            />
          </div>

          <p className="text-xs font-bold text-slate-600 line-clamp-2 mt-2">
            {prediction.moistureAnalysis.actionRequired}
          </p>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-blue-700">
            <span>सिंचन गरज:</span>
            <span>{prediction.moistureAnalysis.waterRequirementLitersPerAcre > 0 ? `${prediction.moistureAnalysis.waterRequirementLitersPerAcre.toLocaleString()} लिटर/एकर` : 'पाणी हवे नाही'}</span>
          </div>
        </div>

        {/* 2. NITROGEN (N) GAUGE */}
        <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-sm hover:shadow-lg transition-all relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-slate-800 text-sm">नायट्रोजन (N)</h4>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Nitrogen mg/kg</span>
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
              prediction.npkAnalysis.nitrogen.status.includes('कमी') 
                ? 'bg-amber-100 text-amber-800' 
                : 'bg-emerald-100 text-emerald-800'
            }`}>
              {prediction.npkAnalysis.nitrogen.status}
            </span>
          </div>

          <div className="flex items-baseline gap-2 my-2">
            <span className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
              {currentReading.nitrogen}
            </span>
            <span className="text-xs font-bold text-slate-500">mg/kg (ppm)</span>
          </div>

          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden my-3">
            <div 
              className="h-full bg-emerald-500 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, (currentReading.nitrogen / 90) * 100)}%` }}
            />
          </div>

          <div className="text-xs font-bold text-slate-600 flex justify-between">
            <span>आदर्श प्रमाण: ६० mg/kg</span>
            <span className={prediction.npkAnalysis.nitrogen.deficit > 0 ? 'text-amber-600' : 'text-emerald-600'}>
              {prediction.npkAnalysis.nitrogen.deficit > 0 ? `कमतरता: ${prediction.npkAnalysis.nitrogen.deficit}` : 'संतुलित'}
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-emerald-700">
            <span>युरिया मात्रा:</span>
            <span>{prediction.fertilizerPrescription.ureaBags} बॅग / एकर</span>
          </div>
        </div>

        {/* 3. PHOSPHORUS (P) GAUGE */}
        <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-sm hover:shadow-lg transition-all relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-slate-800 text-sm">फॉस्फरस (P)</h4>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Phosphorus mg/kg</span>
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
              prediction.npkAnalysis.phosphorus.status.includes('कमी') 
                ? 'bg-amber-100 text-amber-800' 
                : 'bg-emerald-100 text-emerald-800'
            }`}>
              {prediction.npkAnalysis.phosphorus.status}
            </span>
          </div>

          <div className="flex items-baseline gap-2 my-2">
            <span className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
              {currentReading.phosphorus}
            </span>
            <span className="text-xs font-bold text-slate-500">mg/kg (ppm)</span>
          </div>

          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden my-3">
            <div 
              className="h-full bg-amber-500 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, (currentReading.phosphorus / 50) * 100)}%` }}
            />
          </div>

          <div className="text-xs font-bold text-slate-600 flex justify-between">
            <span>आदर्श प्रमाण: ३० mg/kg</span>
            <span className={prediction.npkAnalysis.phosphorus.deficit > 0 ? 'text-amber-600' : 'text-emerald-600'}>
              {prediction.npkAnalysis.phosphorus.deficit > 0 ? `कमतरता: ${prediction.npkAnalysis.phosphorus.deficit}` : 'संतुलित'}
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-amber-700">
            <span>डीएपी मात्रा:</span>
            <span>{prediction.fertilizerPrescription.dapBags} बॅग / एकर</span>
          </div>
        </div>

        {/* 4. POTASSIUM (K) GAUGE */}
        <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-sm hover:shadow-lg transition-all relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Gauge className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-slate-800 text-sm">पोटॅशियम (K)</h4>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Potassium mg/kg</span>
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
              prediction.npkAnalysis.potassium.status.includes('कमी') 
                ? 'bg-amber-100 text-amber-800' 
                : 'bg-emerald-100 text-emerald-800'
            }`}>
              {prediction.npkAnalysis.potassium.status}
            </span>
          </div>

          <div className="flex items-baseline gap-2 my-2">
            <span className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
              {currentReading.potassium}
            </span>
            <span className="text-xs font-bold text-slate-500">mg/kg (ppm)</span>
          </div>

          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden my-3">
            <div 
              className="h-full bg-purple-500 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, (currentReading.potassium / 60) * 100)}%` }}
            />
          </div>

          <div className="text-xs font-bold text-slate-600 flex justify-between">
            <span>आदर्श प्रमाण: ४० mg/kg</span>
            <span className={prediction.npkAnalysis.potassium.deficit > 0 ? 'text-amber-600' : 'text-emerald-600'}>
              {prediction.npkAnalysis.potassium.deficit > 0 ? `कमतरता: ${prediction.npkAnalysis.potassium.deficit}` : 'संतुलित'}
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-purple-700">
            <span>पोटॅश (MOP) मात्रा:</span>
            <span>{prediction.fertilizerPrescription.mopBags} बॅग / एकर</span>
          </div>
        </div>
      </div>

      {/* AUXILIARY METRICS (pH, Temp, EC, Soil Health Score) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* pH */}
        <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-sm">
            pH
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-bold uppercase">सामू (Soil pH)</span>
            <div className="text-xl font-black text-slate-900">{currentReading.ph}</div>
            <span className="text-[10px] font-bold text-teal-600">
              {currentReading.ph >= 6.5 && currentReading.ph <= 7.5 ? 'योग्य सामू' : currentReading.ph < 6.5 ? 'आम्लधर्मी' : 'क्षारधर्मी'}
            </span>
          </div>
        </div>

        {/* Temperature */}
        <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
            <Thermometer className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-bold uppercase">मातीचे तापमान</span>
            <div className="text-xl font-black text-slate-900">{currentReading.temperature} °C</div>
            <span className="text-[10px] font-bold text-orange-600">मुळांसाठी अनुकूल</span>
          </div>
        </div>

        {/* EC Salinity */}
        <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-bold uppercase">क्षारता (EC)</span>
            <div className="text-xl font-black text-slate-900">{currentReading.ec || 420} µS/cm</div>
            <span className="text-[10px] font-bold text-indigo-600">
              {(currentReading.ec || 420) < 1000 ? 'उत्कृष्ट (क्षारमुक्त)' : 'मध्यम क्षारता'}
            </span>
          </div>
        </div>

        {/* Soil Health Index */}
        <div className="bg-emerald-900 text-white p-4 rounded-2xl shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-700/60 flex items-center justify-center font-black text-emerald-300">
            {prediction.soilHealthIndex}
          </div>
          <div>
            <span className="text-[10px] text-emerald-300 font-bold uppercase">आरोग्य निर्देशांक</span>
            <div className="text-lg font-black text-white">{prediction.soilHealthCategory.split(' ')[0]}</div>
            <span className="text-[10px] text-emerald-200">{prediction.soilHealthIndex}/१०० गुण</span>
          </div>
        </div>
      </div>

      {/* Critical Alerts Banner if any */}
      {prediction.criticalAlerts.length > 0 && (
        <div className="space-y-2">
          {prediction.criticalAlerts.map((alert, i) => (
            <div key={i} className="bg-rose-50 border-2 border-rose-200 text-rose-900 p-4 rounded-2xl flex items-center gap-3 text-sm font-bold shadow-sm">
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
              <span>{alert}</span>
            </div>
          ))}
        </div>
      )}

      {/* TAB NAVIGATION: Prediction vs History vs Hardware Wiring vs Manual */}
      <div className="flex border-b-2 border-slate-200 gap-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('prediction')}
          className={`pb-3 px-2 font-black text-sm uppercase tracking-wider transition-all flex items-center gap-2 border-b-4 ${
            activeTab === 'prediction' 
              ? 'border-paithani-emerald text-paithani-emerald' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>अचूक अंदाज व पीक शिफारस (AI Predictions)</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-2 font-black text-sm uppercase tracking-wider transition-all flex items-center gap-2 border-b-4 ${
            activeTab === 'history' 
              ? 'border-paithani-emerald text-paithani-emerald' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>रिडिंग आलेख व ट्रेंड (Live Graphs)</span>
        </button>

        <button
          onClick={() => setActiveTab('manual')}
          className={`pb-3 px-2 font-black text-sm uppercase tracking-wider transition-all flex items-center gap-2 border-b-4 ${
            activeTab === 'manual' 
              ? 'border-paithani-emerald text-paithani-emerald' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>मॅन्युअल कॅलिब्रेशन (Manual Sliders)</span>
        </button>

        <button
          onClick={() => setActiveTab('hardware')}
          className={`pb-3 px-2 font-black text-sm uppercase tracking-wider transition-all flex items-center gap-2 border-b-4 ${
            activeTab === 'hardware' 
              ? 'border-paithani-emerald text-paithani-emerald' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>हार्डवेअर जोडणी व कोड (ESP32 / Arduino)</span>
        </button>
      </div>

      {/* TAB 1: AI PREDICTIONS ACCORDING TO SENSOR READINGS */}
      {activeTab === 'prediction' && (
        <div className="space-y-8">
          {/* 1. Crop Suitability Cards */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>या मातीनुसार सर्वाधिक योग्य पिके (Best Suited Crops)</span>
                </h3>
                <p className="text-xs text-slate-500 font-bold">
                  सध्याच्या NPK ({currentReading.nitrogen}:{currentReading.phosphorus}:{currentReading.potassium}) व ओलावा ({currentReading.moisture}%) नुसार संगणित केलेले पिके
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {prediction.topCrops.map((crop, index) => (
                <div 
                  key={crop.id}
                  className="bg-white rounded-3xl p-5 border-2 border-slate-100 hover:border-emerald-300 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black text-slate-400 uppercase">पर्याय #{index + 1}</span>
                      <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-black text-xs flex items-center gap-1 border border-emerald-200">
                        <span>{crop.matchScore}% मॅच</span>
                      </div>
                    </div>

                    <h4 className="text-xl font-black text-slate-900 mb-1">{crop.cropNameMr}</h4>
                    <span className="text-xs font-bold text-slate-400 block mb-4">{crop.cropName}</span>

                    <div className="space-y-2 text-xs font-bold bg-slate-50 p-3 rounded-2xl mb-4">
                      <div className="flex justify-between text-slate-700">
                        <span>अपेक्षित उत्पादन:</span>
                        <span className="text-emerald-700">{crop.expectedYield}</span>
                      </div>
                      <div className="flex justify-between text-slate-700">
                        <span>अंदाजे उत्पन्न:</span>
                        <span className="text-paithani-emerald">{crop.estimatedIncomePerAcre}</span>
                      </div>
                      <div className="flex justify-between text-slate-700">
                        <span>कालावधी:</span>
                        <span>{crop.durationDays} दिवस</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 font-medium line-clamp-3 mb-4">
                      {crop.tips}
                    </p>
                  </div>

                  {onNavigateToCropPlan && (
                    <button
                      onClick={() => onNavigateToCropPlan(crop.cropName)}
                      className="w-full py-2.5 bg-slate-900 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all"
                    >
                      <span>पीक नियोजन सुरू करा</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 2. Precision Fertilizer Prescription & Irrigation Schedule */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Fertilizer Prescription Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">संतुलित खत मात्रा (Fertilizer Prescription)</h3>
                  <p className="text-xs text-slate-500 font-bold">सेन्सरद्वारे आढळलेल्या कमतरतेवर आधारित प्रति एकर डोस</p>
                </div>
              </div>

              {/* Fertilizer Bag Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-2xl text-center">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase block">युरिया (Urea)</span>
                  <div className="text-2xl font-black text-emerald-900 my-1">
                    {prediction.fertilizerPrescription.ureaBags}
                  </div>
                  <span className="text-[10px] text-emerald-700 font-bold">बॅग (५० किलो)</span>
                </div>

                <div className="bg-amber-50 border border-amber-100 p-3.5 rounded-2xl text-center">
                  <span className="text-[11px] font-bold text-amber-800 uppercase block">डीएपी (DAP)</span>
                  <div className="text-2xl font-black text-amber-900 my-1">
                    {prediction.fertilizerPrescription.dapBags}
                  </div>
                  <span className="text-[10px] text-amber-700 font-bold">बॅग (५० किलो)</span>
                </div>

                <div className="bg-purple-50 border border-purple-100 p-3.5 rounded-2xl text-center">
                  <span className="text-[11px] font-bold text-purple-800 uppercase block">पोटॅश (MOP)</span>
                  <div className="text-2xl font-black text-purple-900 my-1">
                    {prediction.fertilizerPrescription.mopBags}
                  </div>
                  <span className="text-[10px] text-purple-700 font-bold">बॅग (५० किलो)</span>
                </div>
              </div>

              {/* Organic recommendation */}
              <div className="bg-amber-50/50 border border-amber-200/60 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold text-amber-950">
                <ShieldCheck className="w-5 h-5 text-amber-700 flex-shrink-0" />
                <span>
                  सेंद्रिय खत शिफारस: {prediction.fertilizerPrescription.organicManureTons} टन चांगले कुजलेले शेणखत किंवा १ टन गांडूळखत जमिनीत मिसळावे.
                </span>
              </div>

              {/* Fertilizer Application Schedule */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">खत देण्याचे ३ टप्पे (Schedule):</h4>
                {prediction.fertilizerPrescription.schedule.map((st, i) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                    <span className="font-black text-slate-800 block mb-1">{st.stage}</span>
                    <p className="text-slate-600 font-medium">{st.instruction}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Irrigation & Soil Moisture Intelligence */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Droplets className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">सिंचन व ओलावा सल्ला (Irrigation Intelligence)</h3>
                  <p className="text-xs text-slate-500 font-bold">ओलावा सेन्सरच्या अचूक वाचनानुसार पाण्याचे नियोजन</p>
                </div>
              </div>

              {/* Status Display */}
              <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-3xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-800 uppercase tracking-wide">सद्यस्थिती</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-black ${prediction.moistureAnalysis.badgeColor}`}>
                    {prediction.moistureAnalysis.status}
                  </span>
                </div>
                <div className="text-3xl font-black text-blue-950">{currentReading.moisture}% ओलावा</div>
                <p className="text-xs text-blue-900 font-bold">
                  {prediction.moistureAnalysis.actionRequired}
                </p>
              </div>

              {/* Specific Water Needs */}
              <div className="space-y-3 text-xs font-bold">
                <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl">
                  <span className="text-slate-600">अपेक्षित पाणी प्रमाण (Water Volume):</span>
                  <span className="text-slate-900 font-black">
                    {prediction.moistureAnalysis.waterRequirementLitersPerAcre > 0 
                      ? `${prediction.moistureAnalysis.waterRequirementLitersPerAcre.toLocaleString()} लिटर / एकर` 
                      : 'सध्या आवश्यक नाही'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl">
                  <span className="text-slate-600">ठिबक सिंचन वेळ (Drip Run Time):</span>
                  <span className="text-slate-900 font-black">
                    {currentReading.moisture < 25 ? '३ ते ४ तास' : currentReading.moisture < 40 ? '२ तास' : '० तास (बंद ठेवा)'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl">
                  <span className="text-slate-600">सिंचन वेळापत्रक (Timing):</span>
                  <span className="text-emerald-700 font-black">
                    {prediction.moistureAnalysis.irrigationSchedule}
                  </span>
                </div>
              </div>

              {/* Agronomic Summary Quote */}
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 font-bold flex items-start gap-3">
                <Info className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-black block mb-0.5">माती आरोग्य निष्कर्ष:</span>
                  <p className="font-normal text-emerald-800">{prediction.summaryMr}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE TELEMETRY GRAPHS & HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-100 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-slate-900">सेन्सर ट्रेंड आलेख (Real-time Telemetry Graph)</h3>
              <p className="text-xs text-slate-500 font-bold">मातीतील ओलावा व पोषणद्रव्यांचे रिअल-टाइम चढउतार</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={exportCsv}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>CSV डाऊनलोड</span>
              </button>
            </div>
          </div>

          {/* Moisture Chart */}
          <div className="space-y-2">
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">ओलावा ट्रेंड (Soil Moisture %)</h4>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="moistureGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} />
                  <Tooltip />
                  <Area type="monotone" dataKey="moisture" stroke="#2563eb" fillOpacity={1} fill="url(#moistureGrad)" name="ओलावा (%)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* NPK Chart */}
          <div className="space-y-2 pt-6 border-t border-slate-100">
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">NPK पोषणद्रव्य ट्रेंड (mg/kg)</h4>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="n" fill="#10b981" name="नायट्रोजन (N)" />
                  <Bar dataKey="p" fill="#f59e0b" name="फॉस्फरस (P)" />
                  <Bar dataKey="k" fill="#8b5cf6" name="पोटॅशियम (K)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MANUAL CALIBRATION SLIDERS */}
      {activeTab === 'manual' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-100 shadow-sm space-y-6">
          <div>
            <h3 className="text-xl font-black text-slate-900">मॅन्युअल सेन्सर कॅलिब्रेशन व चाचणी (Manual Sliders)</h3>
            <p className="text-xs text-slate-500 font-bold">
              भौतिक सेन्सर जोडण्यापूर्वी किंवा लॅब रिपोर्टनुसार स्लायडर फिरवून त्वरित अंदाज तपासा
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Moisture Slider */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-black text-slate-700">मातीचा ओलावा (%)</label>
                <span className="text-sm font-black text-blue-600">{manualMoisture}%</span>
              </div>
              <input 
                type="range" 
                min="5" 
                max="95" 
                value={manualMoisture} 
                onChange={(e) => setManualMoisture(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 block mt-1">किमान 5% - कमाल 95%</span>
            </div>

            {/* Nitrogen Slider */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-black text-slate-700">नायट्रोजन N (mg/kg)</label>
                <span className="text-sm font-black text-emerald-600">{manualN} mg/kg</span>
              </div>
              <input 
                type="range" 
                min="10" 
                max="120" 
                value={manualN} 
                onChange={(e) => setManualN(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 block mt-1">किमान 10 - कमाल 120 mg/kg</span>
            </div>

            {/* Phosphorus Slider */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-black text-slate-700">फॉस्फरस P (mg/kg)</label>
                <span className="text-sm font-black text-amber-600">{manualP} mg/kg</span>
              </div>
              <input 
                type="range" 
                min="5" 
                max="70" 
                value={manualP} 
                onChange={(e) => setManualP(Number(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 block mt-1">किमान 5 - कमाल 70 mg/kg</span>
            </div>

            {/* Potassium Slider */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-black text-slate-700">पोटॅशियम K (mg/kg)</label>
                <span className="text-sm font-black text-purple-600">{manualK} mg/kg</span>
              </div>
              <input 
                type="range" 
                min="10" 
                max="90" 
                value={manualK} 
                onChange={(e) => setManualK(Number(e.target.value))}
                className="w-full accent-purple-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 block mt-1">किमान 10 - कमाल 90 mg/kg</span>
            </div>

            {/* pH Slider */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-black text-slate-700">सामू (Soil pH)</label>
                <span className="text-sm font-black text-teal-600">{manualPh}</span>
              </div>
              <input 
                type="range" 
                min="4.5" 
                max="9.0" 
                step="0.1"
                value={manualPh} 
                onChange={(e) => setManualPh(Number(e.target.value))}
                className="w-full accent-teal-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 block mt-1">आदर्श: 6.5 - 7.5</span>
            </div>

            {/* Temp Slider */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-black text-slate-700">तापमान (°C)</label>
                <span className="text-sm font-black text-orange-600">{manualTemp} °C</span>
              </div>
              <input 
                type="range" 
                min="15" 
                max="45" 
                step="0.5"
                value={manualTemp} 
                onChange={(e) => setManualTemp(Number(e.target.value))}
                className="w-full accent-orange-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 block mt-1">किमान 15°C - कमाल 45°C</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={handleApplyManual}
              className="px-6 py-3 bg-paithani-emerald hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-lg transition-all"
            >
              रिडिंग्स लागू करा व अंदाज तपासा
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: HARDWARE SETUP & ARDUINO / ESP32 CODE */}
      {activeTab === 'hardware' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-100 shadow-sm space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-slate-900">हार्डवेअर जोडणी आणि ESP32 कोड (Hardware & Firmware)</h3>
              <p className="text-xs text-slate-500 font-bold">
                तुमचा सेन्सर ESP32 मायक्रोकंट्रोलरशी कसा जोडायचा व Arduino IDE द्वारे कसा फ्लॅश करायचा ते पहा.
              </p>
            </div>

            {/* Firmware Architecture Mode Switcher */}
            <div className="flex flex-wrap p-1 bg-slate-100 rounded-2xl border border-slate-200 gap-1">
              <button
                type="button"
                onClick={() => setFirmwareMode('esp8266_dht')}
                className={`px-3 py-2 rounded-xl text-xs font-black transition-all ${
                  firmwareMode === 'esp8266_dht'
                    ? 'bg-paithani-emerald text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📶 NodeMCU ESP8266 + DHT11 (टेस्टिंग)
              </button>
              <button
                type="button"
                onClick={() => setFirmwareMode('soil_dht')}
                className={`px-3 py-2 rounded-xl text-xs font-black transition-all ${
                  firmwareMode === 'soil_dht'
                    ? 'bg-paithani-emerald text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🌱 ESP32 माती ओलावा + DHT
              </button>
              <button
                type="button"
                onClick={() => setFirmwareMode('rs485_npk')}
                className={`px-3 py-2 rounded-xl text-xs font-black transition-all ${
                  firmwareMode === 'rs485_npk'
                    ? 'bg-paithani-emerald text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🧪 ESP32 RS-485 Modbus NPK
              </button>
            </div>
          </div>

          {/* Voltage Safety Alert */}
          <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl flex items-start gap-3 text-xs font-bold text-amber-950">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="block font-black text-amber-900">⚠️ व्होल्टेज सुरक्षा सूचना (Voltage Safety Rule):</strong>
              {firmwareMode === 'esp8266_dht' ? (
                <span>NodeMCU ESP8266 चिपचे सर्व GPIO पिन्स <strong>3.3V लॉजिक</strong> वर चालतात. DHT11 सेन्सरला NodeMCU च्या <strong>3V3 पिनवरून</strong> वीज द्या (VIN किंवा बाहेरील 5V जोडू नका).</span>
              ) : (
                <span>ESP32 GPIO इनपुटवर जास्तीत जास्त <strong>3.3V</strong> स्वीकारले जाते. 5V दिल्यास ESP32 चा ADC जळून खराब होऊ शकतो. सेन्सरला नेहमी ESP32 च्या <strong>3.3V पिनवरून</strong> वीज द्या किंवा व्होल्टेज डिव्हायडर वापरा.</span>
              )}
            </div>
          </div>

          {/* Resistive Sensor Pro-Tip Alert */}
          {firmwareMode === 'soil_dht' && (
            <div className="p-4 bg-teal-50 border-2 border-teal-200 rounded-2xl flex items-start gap-3 text-xs font-bold text-teal-950">
              <ShieldCheck className="w-5 h-5 text-teal-700 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block font-black text-teal-900">🛡️ रेझिस्टिव्ह सेन्सर गंज प्रतिबंध (Anti-Corrosion Pro-Tip for Resistive Probes):</strong>
                रेझिस्टिव्ह सेन्सरच्या २ कांड्या मातीत सतत विजेचा प्रवाह राहिल्यास ३-४ आठवड्यांत गंजून खराब होतात. 
                आमच्या कोडमध्ये <strong>GPIO 25</strong> द्वारे केवळ रिडिंग घेताना (४० मिलीसेकंद) वीज दिली जाते आणि लगेच बंद केली जाते. यामुळे तुमचा सेन्सर वर्षानुवर्षे टिकतो! (किंवा तुम्ही थेट 3.3V पिनलाही जोडू शकता).
              </div>
            </div>
          )}

          {/* Quick Bench Test Info for ESP8266 */}
          {firmwareMode === 'esp8266_dht' && (
            <div className="p-4 bg-sky-50 border-2 border-sky-200 rounded-2xl flex items-start gap-3 text-xs font-bold text-sky-950">
              <Info className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block font-black text-sky-900">⚡ क्विक टेस्ट आणि डॅशबोर्ड थेट डिस्प्ले:</strong>
                हा कोड केवळ <strong>NodeMCU ESP8266 आणि DHT11</strong> वापरून जलद बेंच टेस्टिंग करण्यासाठी डिझाइन केला आहे. दर ५ सेकंदांनी तापमान आणि हवेतील आर्द्रता रिडिंग पाठवली जाईल, आणि डॅशबोर्डवर तात्काळ थेट अपडेट दिसेल.
              </div>
            </div>
          )}

          {/* Wiring Pinout Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
              {firmwareMode === 'esp8266_dht'
                ? 'वायरिंग जोडणी तक्ता (NodeMCU ESP8266 + DHT11 Pinout):'
                : firmwareMode === 'soil_dht' 
                ? 'वायरिंग जोडणी तक्ता (Soil Moisture + DHT11/22 Pinout):' 
                : 'वायरिंग जोडणी तक्ता (MAX485 + NPK 7-in-1 Pinout):'}
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border border-slate-200 rounded-2xl overflow-hidden">
                <thead className="bg-slate-100 font-black text-slate-700">
                  <tr>
                    <th className="p-3">घटक (Component)</th>
                    <th className="p-3">सेन्सर पिन / वायर</th>
                    <th className="p-3">{firmwareMode === 'esp8266_dht' ? 'NodeMCU ESP8266 पिन' : 'ESP32 पिन'}</th>
                    <th className="p-3">स्पष्टीकरण व टीप</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium text-slate-700">
                  {firmwareMode === 'esp8266_dht' ? (
                    <>
                      <tr>
                        <td className="p-3 font-bold text-teal-700">DHT11 सेन्सर (३ किंवा ४ पिन)</td>
                        <td className="p-3 font-bold">VCC / +</td>
                        <td className="p-3 font-bold text-emerald-700">3V3 (3.3V)</td>
                        <td className="p-3">NodeMCU वरील 3.3V पिन (सुरक्षित वीजपुरवठा)</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-teal-700">DHT11 सेन्सर</td>
                        <td className="p-3 font-bold">GND / -</td>
                        <td className="p-3 font-bold text-slate-900">GND</td>
                        <td className="p-3">कॉमन ग्राउंड</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-teal-700">DHT11 सेन्सर</td>
                        <td className="p-3 font-bold">DATA / OUT / S</td>
                        <td className="p-3 font-bold text-emerald-700">Pin D2 (GPIO 4)</td>
                        <td className="p-3">1-Wire डिजिटल डेटा बस (कोडमध्ये #define DHT_PIN D2)</td>
                      </tr>
                    </>
                  ) : firmwareMode === 'soil_dht' ? (
                    <>
                      <tr>
                        <td className="p-3 font-bold text-blue-700">२-पिन सॉइल प्रोब (2-Pin Probe / FC-28)</td>
                        <td className="p-3 font-bold">२ पिना (Two prongs)</td>
                        <td className="p-3 font-bold text-slate-800">LM393 ड्रायव्हर बोर्डच्या २ पिनांना</td>
                        <td className="p-3">२ जंपर वायरने LM393 ॲम्प्लिफायर बोर्डला जोडा (कोणत्याही बाजूने)</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-blue-700">LM393 बोर्ड / 3-Pin Capacitive</td>
                        <td className="p-3 font-bold">VCC</td>
                        <td className="p-3 font-bold text-emerald-700">3.3V</td>
                        <td className="p-3">सुरक्षित 3.3V वीजपुरवठा (५V जोडू नका!)</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-blue-700">LM393 बोर्ड / 3-Pin Capacitive</td>
                        <td className="p-3 font-bold">GND</td>
                        <td className="p-3 font-bold text-slate-900">GND</td>
                        <td className="p-3">ESP32 सह कॉमन ग्राउंड</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-blue-700">LM393 बोर्ड / 3-Pin Capacitive</td>
                        <td className="p-3 font-bold">AO (Analog Out)</td>
                        <td className="p-3 font-bold text-emerald-700">GPIO 34 (ADC1)</td>
                        <td className="p-3">मातीतील ओलाव्याचे अनलॉग व्होल्टेज रिडिंग</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-slate-400">LM393 बोर्ड</td>
                        <td className="p-3 font-bold text-slate-400">DO (Digital Out)</td>
                        <td className="p-3 font-bold text-slate-400">NC (Not Connected)</td>
                        <td className="p-3 text-slate-400">मोकळी सोडा (Digital थ्रेशोल्डची गरज नाही)</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-teal-700">DHT11 / DHT22 सेन्सर</td>
                        <td className="p-3 font-bold">VCC</td>
                        <td className="p-3 font-bold text-emerald-700">3.3V</td>
                        <td className="p-3">तापमान व हवेतील आर्द्रता सेन्सर पॉवर</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-teal-700">DHT11 / DHT22 सेन्सर</td>
                        <td className="p-3 font-bold">GND</td>
                        <td className="p-3 font-bold text-slate-900">GND</td>
                        <td className="p-3">कॉमन ग्राउंड</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-teal-700">DHT11 / DHT22 सेन्सर</td>
                        <td className="p-3 font-bold">DATA / OUT</td>
                        <td className="p-3 font-bold text-emerald-700">GPIO 4</td>
                        <td className="p-3">डिजिटल 1-Wire डेटा (१०kΩ रेझिस्टर आवश्यक असल्यास)</td>
                      </tr>
                    </>
                  ) : (
                    <>
                      <tr>
                        <td className="p-3 font-bold">MAX485 TTL मॉड्यूल</td>
                        <td className="p-3">VCC / GND</td>
                        <td className="p-3 font-bold">5V / GND</td>
                        <td className="p-3">मॉड्यूलला पॉवर सप्लाय</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold">MAX485 TTL मॉड्यूल</td>
                        <td className="p-3">DE आणि RE (दोन्ही एकत्र)</td>
                        <td className="p-3 font-bold">GPIO 4</td>
                        <td className="p-3">RS485 Send / Receive कंट्रोल</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold">MAX485 TTL मॉड्यूल</td>
                        <td className="p-3">RO (Receiver Output)</td>
                        <td className="p-3 font-bold">GPIO 16 (RX2)</td>
                        <td className="p-3">UART2 सिरीयल डेटा स्वीकारणे</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold">MAX485 TTL मॉड्यूल</td>
                        <td className="p-3">DI (Driver Input)</td>
                        <td className="p-3 font-bold">GPIO 17 (TX2)</td>
                        <td className="p-3">UART2 सिरीयल डेटा पाठवणे</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-amber-700">RS485 NPK प्रोब</td>
                        <td className="p-3 text-amber-700 font-bold">Brown (तपकिरी)</td>
                        <td className="p-3 font-bold">9V ते 24V DC Adapter</td>
                        <td className="p-3">NPK सेन्सरला स्वतंत्र वीजपुरवठा</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-slate-800">RS485 NPK प्रोब</td>
                        <td className="p-3 font-bold">Black (काळी)</td>
                        <td className="p-3 font-bold">Common GND</td>
                        <td className="p-3">ESP32 सोबत कॉमन ग्राउंड</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-blue-700">RS485 NPK प्रोब</td>
                        <td className="p-3 text-blue-700 font-bold">Blue (निळी - A)</td>
                        <td className="p-3 font-bold">MAX485 - Pin A</td>
                        <td className="p-3">Modbus RTU Diff A+</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-amber-600">RS485 NPK प्रोब</td>
                        <td className="p-3 text-amber-600 font-bold">Yellow (पिवळी - B)</td>
                        <td className="p-3 font-bold">MAX485 - Pin B</td>
                        <td className="p-3">Modbus RTU Diff B-</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Arduino Code Box */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                {firmwareMode === 'esp8266_dht'
                  ? 'NodeMCU ESP8266 + DHT11 Arduino IDE कोड (5-Sec HTTP POST):'
                  : firmwareMode === 'soil_dht'
                  ? 'Arduino IDE कोड (Soil Moisture GPIO 34 + DHT GPIO 4, 5-Sec POST):'
                  : 'Arduino IDE कोड (RS-485 Modbus NPK + Soil):'}
              </h4>
              <button
                onClick={copyArduinoCode}
                className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'कॉपी झाले!' : 'कोड कॉपी करा'}</span>
              </button>
            </div>

            <pre className="p-4 bg-slate-900 text-emerald-300 font-mono text-xs rounded-2xl overflow-x-auto max-h-96 border border-slate-800">
              {firmwareMode === 'esp8266_dht'
                ? getEsp8266DhtFirmwareCode(window.location.origin, currentReading.deviceId)
                : firmwareMode === 'soil_dht'
                ? getEsp32SoilDhtFirmwareCode(window.location.origin, currentReading.deviceId)
                : getArduinoFirmwareCode(window.location.origin, currentReading.deviceId)}
            </pre>
          </div>


          {/* Direct cURL Command */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                टर्मिनलमधून थेट डेटा पाठवण्यासाठी cURL कमांड:
              </h4>
              <button
                onClick={copyCurl}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all"
              >
                {copiedCurl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCurl ? 'कॉपी झाले!' : 'cURL कॉपी करा'}</span>
              </button>
            </div>

            <pre className="p-4 bg-slate-100 text-slate-800 font-mono text-xs rounded-2xl overflow-x-auto border border-slate-200">
{`curl -X POST "${window.location.origin}/api/sensors/reading" \\
  -H "Content-Type: application/json" \\
  -d '{"deviceId":"${currentReading.deviceId}","nitrogen":${currentReading.nitrogen},"phosphorus":${currentReading.phosphorus},"potassium":${currentReading.potassium},"moisture":${currentReading.moisture},"ph":${currentReading.ph},"temperature":${currentReading.temperature}}'`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default SoilSensorDashboard;
