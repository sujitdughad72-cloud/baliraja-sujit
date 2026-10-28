import React, { useState, useEffect, useRef } from 'react';
import { 
  Droplets, Thermometer, CloudRain, Wind, Activity, 
  RefreshCw, Play, Pause, CheckCircle2, AlertTriangle, 
  Download, Code2, Wifi, Usb, Sparkles, Volume2, 
  ArrowRight, ShieldCheck, Copy, Check, Info, Sliders,
  Flame, ExternalLink, Send
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  Tooltip, CartesianGrid 
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { SensorReading, SensorPredictionResult } from '../types';
import { 
  SENSOR_PRESETS, 
  calculateSensorPredictions, 
  connectWebSerial, 
  getEsp8266DhtFirmwareCode,
  getEsp8266FirebaseRtdbFirmwareCode,
  getEsp32SoilDhtFirmwareCode 
} from '../services/soilSensorService';
import { api } from '../services/apiClient';
import { generateSpeech, playRawAudio } from '../services/geminiService';
import { db, rtdb } from '../firebase';
import { ref, onValue, set } from 'firebase/database';
import { collection, query, orderBy, limit, onSnapshot, addDoc, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../services/firestoreUtils';
import { toast } from 'sonner';

interface SoilSensorDashboardProps {
  onNavigateToCropPlan?: (cropName: string) => void;
}

export const SoilSensorDashboard: React.FC<SoilSensorDashboardProps> = ({ onNavigateToCropPlan }) => {
  const { t } = useTranslation();

  // Active Live Reading State (Pure Soil Moisture + DHT11)
  const [currentReading, setCurrentReading] = useState<SensorReading>({
    deviceId: 'farm001',
    deviceName: 'Firebase RTDB Node (farm001)',
    moisture: 49.0,
    temperature: 30.2,
    humidity: 41.0,
    rawAdc: 521,
    battery: 98,
    timestamp: new Date().toLocaleTimeString(),
    connectionType: 'firebase'
  });

  // History for charts
  const [history, setHistory] = useState<any[]>([
    { time: '१०:००', moisture: 50, temperature: 31.0, humidity: 43 },
    { time: '१०:०५', moisture: 50, temperature: 31.2, humidity: 42 },
    { time: '१०:१०', moisture: 49, temperature: 30.8, humidity: 41 },
    { time: '१०:१५', moisture: 49, temperature: 30.5, humidity: 41 },
    { time: '१०:२०', moisture: 49, temperature: 30.2, humidity: 41 }
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
  const [activeTab, setActiveTab] = useState<'prediction' | 'history' | 'firebase' | 'hardware' | 'manual'>('prediction');
  const [activeFirmwareTab, setActiveFirmwareTab] = useState<'rtdb' | 'local'>('rtdb');
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedRtdbCode, setCopiedRtdbCode] = useState<boolean>(false);
  const [copiedCurl, setCopiedCurl] = useState<boolean>(false);
  const [copiedFirebaseUrl, setCopiedFirebaseUrl] = useState<boolean>(false);

  // Firebase Real-time Database State
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(false);
  const [rtdbRawData, setRtdbRawData] = useState<any>(null);
  const [lastRtdbSyncTime, setLastRtdbSyncTime] = useState<string>('');
  const [isSendingPing, setIsSendingPing] = useState<boolean>(false);

  // Manual Calibration Adjusters (Soil Moisture & DHT11)
  const [manualMoisture, setManualMoisture] = useState<number>(currentReading.moisture);
  const [manualTemp, setManualTemp] = useState<number>(currentReading.temperature);
  const [manualHumidity, setManualHumidity] = useState<number>(currentReading.humidity || 60);

  const simulationTimerRef = useRef<any>(null);

  const rtdbBaseUrl = "https://gen-lang-client-0706599928-default-rtdb.firebaseio.com/";
  const rtdbEndpointUrl = "https://gen-lang-client-0706599928-default-rtdb.firebaseio.com/sensorData/farm001.json";

  // Process data incoming from Firebase Realtime Database
  const processRtdbData = (val: any) => {
    if (!val || typeof val !== 'object') return;
    setRtdbRawData(val);

    let farmKey = 'farm001';
    let farmData: any = val;

    if (val.farm001 && typeof val.farm001 === 'object') {
      farmKey = 'farm001';
      farmData = val.farm001;
    } else if (val.soilMoisturePercent !== undefined || val.moisture !== undefined) {
      farmData = val;
    } else {
      const keys = Object.keys(val);
      const matched = keys.find(k => val[k] && typeof val[k] === 'object' && (val[k].soilMoisturePercent !== undefined || val[k].moisture !== undefined));
      if (matched) {
        farmKey = matched;
        farmData = val[matched];
      }
    }

    if (!farmData) return;

    const moisture = Number(farmData.soilMoisturePercent ?? farmData.moisture ?? 50);
    const temperature = Number(farmData.temperature ?? farmData.temp ?? 28);
    const humidity = Number(farmData.humidity ?? 60);
    const rawAdc = farmData.soilRaw !== undefined ? Number(farmData.soilRaw) : farmData.rawAdc !== undefined ? Number(farmData.rawAdc) : undefined;

    let timeStr = new Date().toLocaleTimeString();
    if (farmData.updatedAt) {
      const num = Number(farmData.updatedAt);
      if (num > 1000000000) {
        timeStr = new Date(num).toLocaleTimeString();
      }
    }

    setIsFirebaseConnected(true);
    setLastRtdbSyncTime(new Date().toLocaleTimeString());

    const reading: SensorReading = {
      deviceId: farmKey,
      deviceName: `NodeMCU Firebase (${farmKey})`,
      moisture,
      temperature,
      humidity,
      rawAdc,
      battery: 98,
      timestamp: timeStr,
      connectionType: 'firebase'
    };

    setCurrentReading(reading);

    setHistory(prev => {
      const last = prev[prev.length - 1];
      if (last && last.moisture === moisture && last.temperature === temperature && last.humidity === humidity) {
        return prev;
      }
      return [...prev.slice(-14), {
        time: timeStr,
        moisture,
        temperature,
        humidity
      }];
    });
  };

  // 1. Live Firebase Realtime Database Listener & Poller
  useEffect(() => {
    let unsubscribeRtdb: (() => void) | null = null;
    try {
      const sensorDataRef = ref(rtdb, 'sensorData');
      unsubscribeRtdb = onValue(sensorDataRef, (snapshot) => {
        if (snapshot.exists()) {
          processRtdbData(snapshot.val());
        }
      }, (err) => {
        console.warn("Firebase RTDB listener:", err);
      });
    } catch (e) {
      console.warn("Firebase RTDB init:", e);
    }

    // Fast Companion Poller (every 3.5 seconds) to guarantee instant live stream
    let isMounted = true;
    const fetchLatestRtdb = async () => {
      try {
        const data = await api.sensors.getRtdbLatest();
        if (data && isMounted) {
          processRtdbData(data);
        }
      } catch (e) {}
    };

    fetchLatestRtdb();
    const pollInterval = setInterval(fetchLatestRtdb, 3500);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      if (unsubscribeRtdb) unsubscribeRtdb();
    };
  }, []);

  // 3. Update prediction whenever reading changes
  useEffect(() => {
    const newPred = calculateSensorPredictions(currentReading);
    setPrediction(newPred);
    setManualMoisture(currentReading.moisture);
    setManualTemp(currentReading.temperature);
    setManualHumidity(currentReading.humidity || 60);
  }, [currentReading]);

  // 4. Live Telemetry Simulation Engine
  useEffect(() => {
    if (isSimulating) {
      simulationTimerRef.current = setInterval(() => {
        setCurrentReading(prev => {
          const jitter = (val: number, delta: number, min: number, max: number) => {
            const change = (Math.random() - 0.5) * delta;
            return Math.max(min, Math.min(max, Math.round((val + change) * 10) / 10));
          };

          const newMoisture = jitter(prev.moisture, 0.8, 10, 95);
          const newTemp = jitter(prev.temperature, 0.4, 15, 45);
          const newHumidity = jitter(prev.humidity || 60, 1.2, 15, 98);
          const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

          const updated: SensorReading = {
            ...prev,
            moisture: newMoisture,
            temperature: newTemp,
            humidity: newHumidity,
            rawAdc: Math.round(950 - (newMoisture / 100) * 630),
            timestamp: nowTime,
            connectionType: 'simulated'
          };

          setHistory(h => [
            ...h.slice(-14),
            {
              time: nowTime,
              moisture: newMoisture,
              temperature: newTemp,
              humidity: newHumidity
            }
          ]);

          return updated;
        });
      }, 4000);
    } else {
      if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
    }
    return () => {
      if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
    };
  }, [isSimulating]);

  // Apply Presets
  const applyPreset = (index: number) => {
    setSelectedPreset(index);
    const preset = SENSOR_PRESETS[index];
    const reading: SensorReading = {
      ...preset.reading,
      timestamp: new Date().toLocaleTimeString(),
      connectionType: 'simulated'
    };
    setCurrentReading(reading);
    toast.success(`'${preset.name.split(' (')[0]}' सेन्सर प्रोफाईल लोड केले!`);
  };

  // Connect Web Serial (USB)
  const handleToggleSerial = async () => {
    if (isSerialConnected && serialDisconnectFn) {
      await serialDisconnectFn();
      setIsSerialConnected(false);
      setSerialDisconnectFn(null);
      toast.info('USB सेन्सर डिस्कनेक्ट केला');
      return;
    }

    try {
      const connection = await connectWebSerial((data) => {
        setCurrentReading(prev => {
          const updated: SensorReading = {
            ...prev,
            moisture: data.moisture ?? prev.moisture,
            temperature: data.temperature ?? prev.temperature,
            humidity: data.humidity ?? prev.humidity,
            rawAdc: data.rawAdc ?? prev.rawAdc,
            timestamp: new Date().toLocaleTimeString(),
            connectionType: 'serial'
          };

          setHistory(h => [
            ...h.slice(-14),
            {
              time: updated.timestamp,
              moisture: updated.moisture,
              temperature: updated.temperature,
              humidity: updated.humidity
            }
          ]);

          return updated;
        });
      });

      setIsSerialConnected(true);
      setSerialDisconnectFn(() => connection.disconnect);
      toast.success('USB NodeMCU सेन्सर यशस्वीपणे जोडला!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'USB सेन्सर जोडण्यात अयशस्वी');
    }
  };

  // Apply Manual Sliders
  const handleApplyManual = () => {
    const updated: SensorReading = {
      ...currentReading,
      moisture: manualMoisture,
      temperature: manualTemp,
      humidity: manualHumidity,
      rawAdc: Math.round(950 - (manualMoisture / 100) * 630),
      timestamp: new Date().toLocaleTimeString(),
      connectionType: 'simulated'
    };
    setCurrentReading(updated);
    toast.success('माती ओलावा व DHT11 रिडिंग्स अपडेट केल्या!');
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

  // Push Test Ping directly to Firebase Realtime Database
  const handleSendFirebaseTestPing = async () => {
    setIsSendingPing(true);
    try {
      const payload = {
        humidity: currentReading.humidity || 41.0,
        soilMoisturePercent: Math.round(currentReading.moisture),
        soilRaw: currentReading.rawAdc || 521,
        temperature: currentReading.temperature,
        updatedAt: Date.now()
      };

      try {
        await set(ref(rtdb, 'sensorData/farm001'), payload);
      } catch (e) {
        await api.sensors.syncRtdbReading('farm001', payload);
      }

      setIsFirebaseConnected(true);
      toast.success('🔥 रिडिंग थेट Firebase Realtime Database (sensorData/farm001) मध्ये साठवली!');
    } catch (error) {
      console.error(error);
      toast.error('Firebase Realtime Database मध्ये डेटा पाठवताना त्रुटी आली.');
    } finally {
      setIsSendingPing(false);
    }
  };

  // Copy Arduino Firmware (Local / Dashboard)
  const copyArduinoCode = () => {
    const code = getEsp8266DhtFirmwareCode(window.location.origin, currentReading.deviceId);
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    toast.success('NodeMCU ESP8266 कोड कॉपी झाला!');
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // Copy Arduino Firmware (Direct Firebase Realtime DB)
  const copyRtdbArduinoCode = () => {
    const code = getEsp8266FirebaseRtdbFirmwareCode('farm001');
    navigator.clipboard.writeText(code);
    setCopiedRtdbCode(true);
    toast.success('Firebase RTDB चा NodeMCU कोड कॉपी झाला!');
    setTimeout(() => setCopiedRtdbCode(false), 2500);
  };

  // Copy cURL command for RTDB
  const copyCurl = () => {
    const curlCommand = `curl -X PATCH "${rtdbEndpointUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{"humidity":${currentReading.humidity || 41.0},"soilMoisturePercent":${Math.round(currentReading.moisture)},"soilRaw":${currentReading.rawAdc || 521},"temperature":${currentReading.temperature},"updatedAt":${Date.now()}}'`;
    navigator.clipboard.writeText(curlCommand);
    setCopiedCurl(true);
    toast.success('Firebase RTDB cURL कमांड कॉपी झाली!');
    setTimeout(() => setCopiedCurl(false), 2500);
  };

  // Copy Firebase RTDB REST URL
  const copyFirebaseUrl = () => {
    navigator.clipboard.writeText(rtdbEndpointUrl);
    setCopiedFirebaseUrl(true);
    toast.success('Firebase RTDB REST URL कॉपी झाली!');
    setTimeout(() => setCopiedFirebaseUrl(false), 2500);
  };

  // Export History as CSV
  const exportCsv = () => {
    const rows = [
      ['Timestamp', 'Soil Moisture (%)', 'Temperature (°C)', 'Air Humidity (%)'],
      ...history.map(h => [h.time, h.moisture, h.temperature, h.humidity])
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `baliraja_soil_moisture_dht11_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV फाईल डाऊनलोड केली!');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* HERO BANNER: BALIRAJA AGRO-IOT TELEMETRY */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5 animate-pulse" />
                <span>माती ओलावा + DHT11 सेन्सर</span>
              </span>

              {isFirebaseConnected ? (
                <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 animate-pulse">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>Firebase RTDB थेट सिंक सुरू (farm001)</span>
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-slate-400" />
                  <span>Firebase RTDB सिंक...</span>
                </span>
              )}

              <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                🌱 2-Pin Resistive Probe + DHT11
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              स्मार्ट माती ओलावा व सूक्ष्म-हवामान डॅशबोर्ड
            </h1>
            <p className="text-emerald-100/80 text-xs sm:text-sm font-medium leading-relaxed">
              २-पिन रेझिस्टिव्ह सॉइल सेन्सर (Pin A0) आणि DHT11 तापमान/आर्द्रता (Pin D2) द्वारे रिअल-टाइम सिंचन नियोजन आणि पीक अंदाज.
            </p>
          </div>

          {/* Action Button Bar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* USB Serial Toggle */}
            <button
              onClick={handleToggleSerial}
              className={`px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md active:scale-95 ${
                isSerialConnected 
                  ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              <Usb className="w-4 h-4" />
              <span>{isSerialConnected ? 'USB डिस्कनेक्ट' : '🔌 USB ने जोडा'}</span>
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
              <span>{isSimulating ? 'सिम्युलेटर सुरू' : '⚡ सिम्युलेटर'}</span>
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
            <span>डिव्हाइस: <strong className="text-white">{currentReading.deviceId}</strong></span>
          </div>
          <div className="text-emerald-200">
            <span>जोडणी: <strong className="text-white uppercase">{currentReading.connectionType || 'WiFi'}</strong></span>
          </div>
          <div className="text-emerald-200">
            <span>अखेरचे रिडिंग: <strong className="text-white">{currentReading.timestamp}</strong></span>
          </div>
          <div className="text-emerald-200">
            <span>ADC व्हॅल्यू: <strong className="text-white">{currentReading.rawAdc || 560}</strong></span>
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
            <p className="text-xs text-slate-500 font-medium">वेगवेगळ्या ओलावा व हवामानात सेन्सरची चाचणी घ्या</p>
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

      {/* 3 CORE SENSOR GAUGES (Soil Moisture, Temperature, Humidity) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* 1. SOIL MOISTURE GAUGE */}
        <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-sm hover:shadow-lg transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Droplets className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <h4 className="font-black text-slate-800 text-base">मातीचा ओलावा</h4>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Resistive Soil Probe (A0)</span>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${prediction.moistureAnalysis.badgeColor}`}>
              {prediction.moistureAnalysis.status.split(' ')[0]}
            </span>
          </div>

          <div className="flex items-baseline gap-2 my-2">
            <span className="text-5xl font-black text-slate-900 tracking-tight">
              {currentReading.moisture}
            </span>
            <span className="text-xl font-bold text-slate-500">%</span>
          </div>

          {/* Moisture Bar */}
          <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden my-3 relative">
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

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-700">
            <span>सिंचन गरज:</span>
            <span>{prediction.moistureAnalysis.waterRequirementLitersPerAcre > 0 ? `${prediction.moistureAnalysis.waterRequirementLitersPerAcre.toLocaleString()} लिटर/एकर` : 'पाणी हवे नाही'}</span>
          </div>
        </div>

        {/* 2. TEMPERATURE (DHT11) */}
        <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-sm hover:shadow-lg transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <Thermometer className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-slate-800 text-base">तापमान (Temperature)</h4>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">DHT11 Sensor (Pin D2)</span>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-black ${
              currentReading.temperature > 35 
                ? 'bg-rose-100 text-rose-800' 
                : currentReading.temperature < 20 
                  ? 'bg-sky-100 text-sky-800' 
                  : 'bg-emerald-100 text-emerald-800'
            }`}>
              {currentReading.temperature > 35 ? 'उष्णता ताण' : currentReading.temperature < 20 ? 'थंड हवामान' : 'अनुकूल तापमान'}
            </span>
          </div>

          <div className="flex items-baseline gap-2 my-2">
            <span className="text-5xl font-black text-slate-900 tracking-tight">
              {currentReading.temperature}
            </span>
            <span className="text-xl font-bold text-slate-500">°C</span>
          </div>

          <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden my-3">
            <div 
              className="h-full bg-orange-500 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, (currentReading.temperature / 50) * 100)}%` }}
            />
          </div>

          <p className="text-xs font-bold text-slate-600 line-clamp-2 mt-2">
            {currentReading.temperature > 35 
              ? 'दुपारी तीव्र सूर्यप्रकाश व उष्णतेमुळे पिकातील पाण्याचे बाष्पीभवन वेगाने होत आहे.'
              : 'मुळांच्या वाढीसाठी आणि अन्नद्रव्ये शोषण्यासाठी तापमान अनुकूल आहे.'}
          </p>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-orange-700">
            <span>उष्णता निर्देशांक (Heat Index):</span>
            <span>{prediction.microclimateAnalysis?.heatIndexC || currentReading.temperature}°C</span>
          </div>
        </div>

        {/* 3. AIR HUMIDITY (DHT11) */}
        <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-sm hover:shadow-lg transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <Wind className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-slate-800 text-base">हवेतील आर्द्रता (Humidity)</h4>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">DHT11 Relative Humidity</span>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-black ${
              (currentReading.humidity || 60) > 80 
                ? 'bg-rose-100 text-rose-800' 
                : (currentReading.humidity || 60) < 30 
                  ? 'bg-amber-100 text-amber-800' 
                  : 'bg-teal-100 text-teal-800'
            }`}>
              {(currentReading.humidity || 60) > 80 ? 'बुरशीचा धोका' : (currentReading.humidity || 60) < 30 ? 'कोरडी हवा' : 'आदर्श आर्द्रता'}
            </span>
          </div>

          <div className="flex items-baseline gap-2 my-2">
            <span className="text-5xl font-black text-slate-900 tracking-tight">
              {currentReading.humidity || 60}
            </span>
            <span className="text-xl font-bold text-slate-500">% RH</span>
          </div>

          <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden my-3">
            <div 
              className="h-full bg-teal-500 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, (currentReading.humidity || 60))}%` }}
            />
          </div>

          <p className="text-xs font-bold text-slate-600 line-clamp-2 mt-2">
            {prediction.microclimateAnalysis?.diseaseWarningMr}
          </p>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-teal-700">
            <span>बाष्पोत्सर्जन तूट (VPD):</span>
            <span>{prediction.microclimateAnalysis?.vpdKpa || 1.1} kPa</span>
          </div>
        </div>
      </div>

      {/* AUXILIARY MICROCLIMATE & HEALTH METRICS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Soil Health Score */}
        <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-bold uppercase">आरोग्य स्कोअर</span>
            <div className="text-xl font-black text-slate-900">{prediction.soilHealthIndex}/१००</div>
            <span className="text-[10px] font-bold text-emerald-600">{prediction.soilHealthCategory.split(' ')[0]}</span>
          </div>
        </div>

        {/* Irrigation Urgency */}
        <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <CloudRain className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-bold uppercase">ठिबक सिंचन वेळ</span>
            <div className="text-xl font-black text-slate-900">
              {currentReading.moisture < 25 ? '३ तास' : currentReading.moisture < 40 ? '१.५ तास' : '० तास'}
            </div>
            <span className="text-[10px] font-bold text-blue-600">
              {currentReading.moisture < 40 ? 'सिंचन आवश्यक' : 'सध्या पुरेसा ओलावा'}
            </span>
          </div>
        </div>

        {/* Fungal Disease Risk */}
        <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-bold uppercase">बुरशी रोग धोका</span>
            <div className={`text-xl font-black ${
              prediction.microclimateAnalysis?.diseaseRisk === 'HIGH' ? 'text-rose-600' : 'text-purple-700'
            }`}>
              {prediction.microclimateAnalysis?.diseaseRisk === 'HIGH' ? 'जास्त (High)' : 'कमी (Safe)'}
            </div>
            <span className="text-[10px] font-bold text-slate-500">करपा / डाऊनी अलर्ट</span>
          </div>
        </div>

        {/* Firebase Live RTDB Status */}
        <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-bold uppercase">Firebase RTDB</span>
            <div className="text-xl font-black text-slate-900">
              {isFirebaseConnected ? 'सक्रिय (Live)' : 'कनेक्टेड'}
            </div>
            <span className="text-[10px] font-bold text-amber-600">/sensorData/farm001</span>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2 text-xs sm:text-sm font-black">
        <button
          onClick={() => setActiveTab('prediction')}
          className={`pb-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'prediction'
              ? 'border-paithani-emerald text-paithani-emerald'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>सिंचन व पीक अंदाज (Intelligence)</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'history'
              ? 'border-paithani-emerald text-paithani-emerald'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>रिअल-टाइम आलेख (Graphs)</span>
        </button>

        <button
          onClick={() => setActiveTab('firebase')}
          className={`pb-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'firebase'
              ? 'border-amber-500 text-amber-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Flame className="w-4 h-4 text-amber-500" />
          <span>🔥 Firebase क्लाउड सिंक</span>
        </button>

        <button
          onClick={() => setActiveTab('hardware')}
          className={`pb-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'hardware'
              ? 'border-paithani-emerald text-paithani-emerald'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>हार्डवेअर व Arduino कोड</span>
        </button>

        <button
          onClick={() => setActiveTab('manual')}
          className={`pb-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'manual'
              ? 'border-paithani-emerald text-paithani-emerald'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>मॅन्युअल सिम्युलेटर</span>
        </button>
      </div>

      {/* TAB 1: PREDICTIONS & IRRIGATION INTELLIGENCE */}
      {activeTab === 'prediction' && (
        <div className="space-y-6">
          {/* Critical Warnings */}
          {prediction.criticalAlerts.length > 0 && (
            <div className="space-y-2">
              {prediction.criticalAlerts.map((alert, i) => (
                <div key={i} className="p-4 bg-rose-50 border-2 border-rose-200 rounded-2xl flex items-start gap-3 text-rose-950 font-bold text-xs sm:text-sm shadow-sm">
                  <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span>{alert}</span>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Irrigation Schedule Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Droplets className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">सिंचन वेळापत्रक (Smart Drip Irrigation)</h3>
                  <p className="text-xs text-slate-500 font-bold">मातीतील ओलावा सेन्सरच्या अचूक वाचनानुसार पाण्याचे नियोजन</p>
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
                <div className="text-4xl font-black text-blue-950">{currentReading.moisture}% ओलावा</div>
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
                  <span className="text-slate-600">सिंचन वेळापत्रक (Schedule):</span>
                  <span className="text-emerald-700 font-black">
                    {prediction.moistureAnalysis.irrigationSchedule}
                  </span>
                </div>
              </div>

              {/* Agronomic Summary Quote */}
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 font-bold flex items-start gap-3">
                <Info className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-black block mb-0.5">माती व हवामान निष्कर्ष:</span>
                  <p className="font-normal text-emerald-800">{prediction.summaryMr}</p>
                </div>
              </div>
            </div>

            {/* Crop Suitability based on Moisture & DHT11 */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900">अनुकूल पिके (Crop Suitability Rankings)</h3>
                  <p className="text-xs text-slate-500 font-bold">सध्याच्या ओलावा व तापमान/आर्द्रतेनुसार सर्वात योग्य पिके</p>
                </div>
              </div>

              <div className="space-y-3">
                {prediction.topCrops.map((crop, idx) => (
                  <div 
                    key={crop.id}
                    className="p-4 rounded-2xl border-2 border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center">
                          #{idx + 1}
                        </span>
                        <h4 className="font-black text-slate-800 text-sm">{crop.cropNameMr}</h4>
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                          {crop.matchScore}% अनुकूल
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium pl-8">{crop.tips}</p>
                    </div>

                    <div className="sm:text-right pl-8 sm:pl-0 flex-shrink-0">
                      <div className="text-xs font-black text-slate-900">{crop.expectedYield}</div>
                      <div className="text-[11px] font-bold text-emerald-600">{crop.estimatedIncomePerAcre}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE TELEMETRY GRAPHS */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-100 shadow-sm space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-slate-900">सेन्सर ट्रेंड आलेख (Real-time Telemetry Graphs)</h3>
              <p className="text-xs text-slate-500 font-bold">मातीतील ओलावा, तापमान आणि हवेतील आर्द्रतेचे थेट वाचन</p>
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
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">मातीतील ओलावा ट्रेंड (Soil Moisture %)</h4>
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
                  <Area type="monotone" dataKey="moisture" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#moistureGrad)" name="ओलावा (%)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Temperature & Humidity Chart */}
          <div className="space-y-2 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">DHT11 तापमान (°C) व आर्द्रता (%) ट्रेंड</h4>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.7}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="humGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.7}/>
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip />
                  <Area type="monotone" dataKey="temperature" stroke="#ea580c" strokeWidth={2} fillOpacity={1} fill="url(#tempGrad)" name="तापमान (°C)" />
                  <Area type="monotone" dataKey="humidity" stroke="#0d9488" strokeWidth={2} fillOpacity={1} fill="url(#humGrad)" name="आर्द्रता (%)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FIREBASE REALTIME DATABASE LIVE STREAM */}
      {activeTab === 'firebase' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-100 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Flame className="w-6 h-6 text-amber-500 animate-pulse" />
                <h3 className="text-xl font-black text-slate-900">Firebase Realtime Database थेट डेटा सिंक (Live Cloud Stream)</h3>
              </div>
              <p className="text-xs text-slate-500 font-bold mt-1">
                तुमच्या शेतातील NodeMCU चे २-पिन सॉइल सेन्सर आणि DHT11 रिडिंग्स थेट Firebase Realtime Database वरून आपोआप सिंक होत आहेत.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSendFirebaseTestPing}
                disabled={isSendingPing}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-xs font-black flex items-center gap-2 transition-all shadow-md disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{isSendingPing ? 'पाठवत आहे...' : '🔥 चाचणी रिडिंग Firebase RTDB वर पाठवा'}</span>
              </button>
            </div>
          </div>

          {/* Active Firebase Realtime DB Configuration Box */}
          <div className="p-5 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100/50 rounded-2xl border-2 border-amber-200 space-y-4 text-xs font-bold text-amber-950">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="font-black uppercase tracking-wider text-amber-900">
                  सक्रिय Firebase Realtime Database तपशील
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black border border-emerald-300">
                  {isFirebaseConnected ? '🟢 Live RTDB Connected (sensorData/farm001)' : '🟡 Connecting to RTDB...'}
                </span>
                {lastRtdbSyncTime && (
                  <span className="text-[10px] text-amber-800 font-medium">
                    अखेरचा सिंक: {lastRtdbSyncTime}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-white rounded-xl border border-amber-200/80 shadow-xs">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Realtime Database URL</span>
                <span className="font-mono text-slate-800 font-black text-xs break-all">
                  https://gen-lang-client-0706599928-default-rtdb.firebaseio.com/
                </span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-amber-200/80 shadow-xs">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Active Data Node</span>
                <span className="font-mono text-amber-700 font-black text-xs">
                  /sensorData/farm001
                </span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-amber-200/80 shadow-xs">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Project ID</span>
                <span className="font-mono text-slate-800 font-black text-xs">
                  gen-lang-client-0706599928
                </span>
              </div>
            </div>

            {/* Current Real-time Values from RTDB */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-amber-200/60">
              <div className="bg-white/90 p-3 rounded-xl border border-blue-200">
                <span className="text-[10px] text-slate-500 block uppercase">माती ओलावा (soilMoisturePercent)</span>
                <span className="text-2xl font-black text-blue-600">{currentReading.moisture}%</span>
              </div>
              <div className="bg-white/90 p-3 rounded-xl border border-orange-200">
                <span className="text-[10px] text-slate-500 block uppercase">तापमान (temperature)</span>
                <span className="text-2xl font-black text-orange-600">{currentReading.temperature} °C</span>
              </div>
              <div className="bg-white/90 p-3 rounded-xl border border-teal-200">
                <span className="text-[10px] text-slate-500 block uppercase">हवेतील आर्द्रता (humidity)</span>
                <span className="text-2xl font-black text-teal-600">{currentReading.humidity || 60}%</span>
              </div>
              <div className="bg-white/90 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 block uppercase">ADC Raw Value (soilRaw)</span>
                <span className="text-2xl font-black text-slate-700">{currentReading.rawAdc || 521}</span>
              </div>
            </div>
          </div>

          {/* Raw JSON Received from Firebase RTDB */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-amber-600" />
                <span>Firebase Realtime Database मधून आलेला थेट Raw JSON:</span>
              </h4>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                🔴 Real-time Stream Active
              </span>
            </div>

            <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-2xl overflow-x-auto border border-slate-800 shadow-inner">
              {JSON.stringify(rtdbRawData || {
                humidity: currentReading.humidity,
                soilMoisturePercent: currentReading.moisture,
                soilRaw: currentReading.rawAdc || 521,
                temperature: currentReading.temperature,
                updatedAt: Date.now()
              }, null, 2)}
            </pre>
          </div>

          {/* Direct Firebase RTDB REST API URL */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                ESP8266 किंवा cURL साठी थेट Firebase RTDB REST API Endpoint:
              </h4>
              <button
                onClick={copyFirebaseUrl}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm"
              >
                {copiedFirebaseUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedFirebaseUrl ? 'कॉपी झाले!' : 'URL कॉपी करा'}</span>
              </button>
            </div>

            <pre className="p-4 bg-slate-900 text-amber-300 font-mono text-xs rounded-2xl overflow-x-auto border border-slate-800">
              {rtdbEndpointUrl}
            </pre>
          </div>

          {/* Direct cURL Command */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                टर्मिनलमधून थेट Firebase RTDB मध्ये डेटा टाकण्यासाठी cURL कमांड:
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
{`curl -X PATCH "${rtdbEndpointUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{"humidity":${currentReading.humidity || 41.0},"soilMoisturePercent":${Math.round(currentReading.moisture)},"soilRaw":${currentReading.rawAdc || 521},"temperature":${currentReading.temperature},"updatedAt":${Date.now()}}'`}
            </pre>
          </div>
        </div>
      )}

      {/* TAB 4: HARDWARE SETUP & NODEMCU CODE */}
      {activeTab === 'hardware' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-100 shadow-sm space-y-8">
          <div>
            <h3 className="text-xl font-black text-slate-900">हार्डवेअर जोडणी आणि NodeMCU ESP8266 कोड</h3>
            <p className="text-xs text-slate-500 font-bold">
              २-पिन रेझिस्टिव्ह सॉइल सेन्सर आणि DHT11 तापमान/आर्द्रता सेन्सर NodeMCU ESP8266 शी कसा जोडायचा आणि कोड कसा अपलोड करायचा ते पहा.
            </p>
          </div>

          {/* Voltage Safety Alert */}
          <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl flex items-start gap-3 text-xs font-bold text-amber-950">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="block font-black text-amber-900">⚠️ व्होल्टेज सुरक्षा नियम (Voltage Rule):</strong>
              NodeMCU ESP8266 चिपचे सर्व पिन्स <strong>3.3V लॉजिक</strong> वर चालतात. DHT11 आणि LM393 बोर्डला नेहमी NodeMCU च्या <strong>3V3 (3.3V)</strong> पिनवरून वीज द्या. बाहेरील 5V जोडू नका.
            </div>
          </div>

          {/* Wiring Pinout Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
              वायरिंग जोडणी तक्ता (NodeMCU ESP8266 + Soil Moisture + DHT11):
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border border-slate-200 rounded-2xl overflow-hidden">
                <thead className="bg-slate-100 font-black text-slate-700">
                  <tr>
                    <th className="p-3">घटक (Component)</th>
                    <th className="p-3">सेन्सर पिन / वायर</th>
                    <th className="p-3">NodeMCU ESP8266 पिन</th>
                    <th className="p-3">स्पष्टीकरण व टीप</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium text-slate-700">
                  <tr>
                    <td className="p-3 font-bold text-blue-700">२-पिन सॉइल प्रोब (2-Pin Soil Probe)</td>
                    <td className="p-3 font-bold">२ पिना (Two prongs)</td>
                    <td className="p-3 font-bold text-slate-800">LM393 ॲम्प्लिफायर बोर्डच्या २ पिनांना</td>
                    <td className="p-3">२ जंपर वायरने LM393 ड्रायव्हर बोर्डला जोडा (कोणत्याही क्रमाने)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-blue-700">LM393 ड्रायव्हर बोर्ड</td>
                    <td className="p-3 font-bold">VCC</td>
                    <td className="p-3 font-bold text-emerald-700">3V3 (3.3V)</td>
                    <td className="p-3">सुरक्षित 3.3V वीजपुरवठा</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-blue-700">LM393 ड्रायव्हर बोर्ड</td>
                    <td className="p-3 font-bold">GND</td>
                    <td className="p-3 font-bold text-slate-900">GND</td>
                    <td className="p-3">कॉमन ग्राउंड</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-blue-700">LM393 ड्रायव्हर बोर्ड</td>
                    <td className="p-3 font-bold">AO (Analog Out)</td>
                    <td className="p-3 font-bold text-emerald-700">Pin A0 (ADC0)</td>
                    <td className="p-3">मातीतील ओलाव्याचे अनलॉग व्होल्टेज रिडिंग (0 - 1024)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-teal-700">DHT11 सेन्सर (३ किंवा ४ पिन)</td>
                    <td className="p-3 font-bold">VCC / +</td>
                    <td className="p-3 font-bold text-emerald-700">3V3 (3.3V)</td>
                    <td className="p-3">तापमान व हवेतील आर्द्रता सेन्सर पॉवर</td>
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
                </tbody>
              </table>
            </div>
          </div>

          {/* Firmware Mode Selector */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-black text-slate-900">
                  NodeMCU ESP8266 Arduino IDE कोड निवडा:
                </h4>
                <p className="text-xs text-slate-500 font-medium">
                  थेट Firebase Realtime Database वर डेटा पाठवा किंवा Baliraja लोकल डॅशबोर्डवर पाठवा.
                </p>
              </div>

              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl">
                <button
                  onClick={() => setActiveFirmwareTab('rtdb')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    activeFirmwareTab === 'rtdb'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🔥 Firebase RTDB (थेट क्लाउड)
                </button>
                <button
                  onClick={() => setActiveFirmwareTab('local')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    activeFirmwareTab === 'local'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🌐 Baliraja Dashboard (HTTP REST)
                </button>
              </div>
            </div>

            {/* Arduino Code Box */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-600">
                  {activeFirmwareTab === 'rtdb' 
                    ? 'Target: https://gen-lang-client-0706599928-default-rtdb.firebaseio.com/sensorData/farm001.json' 
                    : `Target: ${window.location.origin}/api/sensors/reading`}
                </span>
                <button
                  onClick={activeFirmwareTab === 'rtdb' ? copyRtdbArduinoCode : copyArduinoCode}
                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm"
                >
                  {(activeFirmwareTab === 'rtdb' ? copiedRtdbCode : copiedCode) ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{(activeFirmwareTab === 'rtdb' ? copiedRtdbCode : copiedCode) ? 'कॉपी झाले!' : 'कोड कॉपी करा'}</span>
                </button>
              </div>

              <pre className="p-4 bg-slate-900 text-emerald-300 font-mono text-xs rounded-2xl overflow-x-auto max-h-96 border border-slate-800">
                {activeFirmwareTab === 'rtdb'
                  ? getEsp8266FirebaseRtdbFirmwareCode('farm001')
                  : getEsp8266DhtFirmwareCode(window.location.origin, currentReading.deviceId)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: MANUAL SIMULATOR */}
      {activeTab === 'manual' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-100 shadow-sm space-y-6">
          <div>
            <h3 className="text-xl font-black text-slate-900">मॅन्युअल सेन्सर कॅलिब्रेशन व चाचणी (Manual Simulator)</h3>
            <p className="text-xs text-slate-500 font-bold">
              हार्डवेअर जोडलेले नसताना वेगवेगळ्या ओलावा व हवामान पातळीवर पिकाचा सल्ला तपासा.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Moisture Slider */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-black text-slate-700">मातीतील ओलावा (%)</label>
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

            {/* Temp Slider */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-black text-slate-700">तापमान (°C - DHT11)</label>
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

            {/* Humidity Slider */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-black text-slate-700">हवेतील आर्द्रता (% - DHT11)</label>
                <span className="text-sm font-black text-teal-600">{manualHumidity}%</span>
              </div>
              <input 
                type="range" 
                min="10" 
                max="98" 
                value={manualHumidity} 
                onChange={(e) => setManualHumidity(Number(e.target.value))}
                className="w-full accent-teal-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 block mt-1">किमान 10% - कमाल 98%</span>
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
    </div>
  );
};

export default SoilSensorDashboard;
