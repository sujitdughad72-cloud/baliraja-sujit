
import React, { useState, useEffect } from 'react';
import { Cloud, CloudRain, CloudLightning, Sun, Wind, Droplets, Thermometer, MapPin, AlertCircle, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';

const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;

const regions = [
  { id: 'pune', name: 'Pune' },
  { id: 'mumbai', name: 'Mumbai' },
  { id: 'nashik', name: 'Nashik' },
  { id: 'nagpur', name: 'Nagpur' },
  { id: 'aurangabad', name: 'Aurangabad' },
  { id: 'kolhapur', name: 'Kolhapur' },
  { id: 'solapur', name: 'Solapur' },
  { id: 'amravati', name: 'Amravati' },
  { id: 'latur', name: 'Latur' },
  { id: 'akola', name: 'Akola' },
];

const WeatherIcon = ({ code, size = 24 }: { code: string; size?: number }) => {
  if (code.startsWith('01')) return <Sun size={size} className="text-yellow-400" />;
  if (code.startsWith('02') || code.startsWith('03') || code.startsWith('04')) return <Cloud size={size} className="text-slate-400" />;
  if (code.startsWith('09') || code.startsWith('10')) return <CloudRain size={size} className="text-blue-400" />;
  if (code.startsWith('11')) return <CloudLightning size={size} className="text-purple-400" />;
  return <Cloud size={size} className="text-slate-400" />;
};

export const WeatherWidget: React.FC<{ user?: any }> = ({ user }) => {
  const { t } = useTranslation();
  const [selectedRegion, setSelectedRegion] = useState('pune');
  const [weatherData, setWeatherData] = useState<any>(null);
  const [forecastData, setForecastData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    const fetchWeather = async () => {
      if (!API_KEY) {
        setLoading(false);
        setIsDemo(true);
        loadMockData();
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setIsDemo(false);

        const regionName = regions.find(r => r.id === selectedRegion)?.name || selectedRegion;

        // Current Weather
        const currentRes = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${regionName},IN&appid=${API_KEY}&units=metric`
        );
        
        if (currentRes.status === 401) {
          throw new Error('401');
        }

        if (!currentRes.ok) {
          const errData = await currentRes.json();
          throw new Error(errData.message || 'Failed to fetch current weather');
        }
        const current = await currentRes.json();
        setWeatherData(current);

        // Forecast
        const forecastRes = await fetch(
          `https://api.openweathermap.org/data/2.5/forecast?q=${regionName},IN&appid=${API_KEY}&units=metric`
        );

        if (forecastRes.status === 401) {
          throw new Error('401');
        }

        if (!forecastRes.ok) {
          const errData = await forecastRes.json();
          throw new Error(errData.message || 'Failed to fetch forecast');
        }
        const forecast = await forecastRes.json();
        
        // Filter for 3 days (OpenWeather gives 5 days / 3 hours)
        // We take one reading per day (around noon)
        const dailyForecast = forecast.list.filter((item: any) => item.dt_txt.includes('12:00:00')).slice(0, 3);
        setForecastData(dailyForecast);

      } catch (err: any) {
        console.error('Weather fetch error:', err);
        if (err.message === '401') {
          setIsDemo(true);
          setError(null);
          loadMockData();
        } else {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    const loadMockData = () => {
      const regionName = regions.find(r => r.id === selectedRegion)?.name || selectedRegion;
      setWeatherData({
        name: regionName,
        main: { temp: 32, humidity: 45, feels_like: 34 },
        weather: [{ description: 'clear sky', icon: '01d' }],
        wind: { speed: 5.2 }
      });
      setForecastData([
        { dt: Date.now() + 86400000, main: { temp: 33 }, weather: [{ icon: '01d' }], dt_txt: 'Tomorrow' },
        { dt: Date.now() + 172800000, main: { temp: 31 }, weather: [{ icon: '02d' }], dt_txt: 'Day After' },
        { dt: Date.now() + 259200000, main: { temp: 34 }, weather: [{ icon: '01d' }], dt_txt: 'Next Day' }
      ]);
    };

    fetchWeather();
  }, [selectedRegion]);

  return (
    <div className="bg-white rounded-3xl border-2 border-slate-50 p-8 shadow-sm space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Sun className="text-paithani-gold" />
            {t('weather_widget.title')}
          </h2>
          <p className="text-slate-500 font-bold">{t('weather_widget.subtitle')}</p>
        </div>
        
        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100">
          <MapPin size={20} className="text-slate-400 ml-2" />
          <select 
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="bg-transparent border-none font-black text-slate-700 focus:ring-0 cursor-pointer pr-8"
          >
            {regions.map(region => (
              <option key={region.id} value={region.id}>
                {t(`weather_widget.${region.id}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isDemo && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-amber-50 border-2 border-amber-100 rounded-2xl flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3 text-amber-800">
            <AlertCircle size={20} />
            <div>
              <p className="font-bold text-sm">{t('weather_widget.demo_mode')}</p>
              <p className="text-xs opacity-80">{t('weather_widget.demo_note')}</p>
            </div>
          </div>
          <a 
            href="https://openweathermap.org/faq#error401" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs font-bold underline text-amber-600 hover:text-amber-700 whitespace-nowrap"
          >
            Fix API Key
          </a>
        </motion.div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Sun size={48} className="text-paithani-gold opacity-20" />
          </motion.div>
          <p className="text-slate-400 font-bold animate-pulse">{t('weather_widget.loading')}</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 p-6 rounded-2xl border border-red-100 flex flex-col gap-2 text-red-600">
          <div className="flex items-center gap-4">
            <AlertCircle size={24} />
            <p className="font-bold">{t('weather_widget.error')}</p>
          </div>
          <p className="text-xs opacity-70 ml-10">{error}</p>
        </div>
      ) : weatherData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Current Weather Card */}
          <div className="lg:col-span-1 bg-gradient-to-br from-paithani-emerald to-emerald-700 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <WeatherIcon code={weatherData.weather[0].icon} size={160} />
            </div>
            
            <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between">
                <span className="bg-white/20 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">
                  {t('weather_widget.current')}
                </span>
                <WeatherIcon code={weatherData.weather[0].icon} size={32} />
              </div>
              
              <div>
                <h3 className="text-6xl font-black tracking-tighter">
                  {Math.round(weatherData.main.temp)}°
                </h3>
                <p className="text-xl font-bold opacity-90 capitalize">
                  {weatherData.weather[0].description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <Droplets size={18} className="opacity-70" />
                  <div>
                    <p className="text-[10px] font-black uppercase opacity-60">{t('weather_widget.humidity')}</p>
                    <p className="font-bold">{weatherData.main.humidity}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Wind size={18} className="opacity-70" />
                  <div>
                    <p className="text-[10px] font-black uppercase opacity-60">{t('weather_widget.wind')}</p>
                    <p className="font-bold">{Math.round(weatherData.wind.speed * 3.6)} km/h</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Forecast Section */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Calendar size={20} className="text-paithani-emerald" />
              {t('weather_widget.forecast')}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {forecastData.map((day, idx) => (
                <div key={idx} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col items-center text-center space-y-4 hover:border-paithani-emerald/30 transition-all">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    {new Date(day.dt * 1000).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
                  </p>
                  <WeatherIcon code={day.weather[0].icon} size={40} />
                  <div>
                    <p className="text-2xl font-black text-slate-800">{Math.round(day.main.temp)}°</p>
                    <p className="text-[10px] font-bold text-slate-500 capitalize">{day.weather[0].description}</p>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-black text-slate-400">
                    <Droplets size={12} />
                    {day.main.humidity}%
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-start gap-3">
              <div className="bg-amber-100 p-2 rounded-xl text-amber-600">
                <Thermometer size={18} />
              </div>
              <div>
                <p className="text-xs font-black text-amber-800 uppercase tracking-widest mb-1">Agricultural Tip</p>
                <p className="text-sm text-amber-700 font-medium leading-relaxed">
                  {weatherData.main.temp > 35 
                    ? "High temperature alert! Increase irrigation frequency for sensitive crops like leafy vegetables."
                    : weatherData.weather[0].main === 'Rain'
                    ? "Rain expected. Postpone fertilizer application to avoid runoff and nutrient loss."
                    : "Optimal conditions for field work. Good time for weeding and soil preparation."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
