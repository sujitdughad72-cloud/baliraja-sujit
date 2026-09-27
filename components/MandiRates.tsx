
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchVerifiedMandiPrices, VerifiedMandiResponse, fetchDirectGovApiMandiPrices, fetchRealTimeMarketRates, MarketRate } from '../src/services/marketService';
import { Search, TrendingUp, MapPin, Calendar, RefreshCw, ExternalLink, AlertCircle, Database, Info, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

const MandiRates: React.FC = () => {
  const { t } = useTranslation();
  
  // Overview State
  const [overviewRates, setOverviewRates] = useState<MarketRate[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(true);

  // Verified Search State
  const [verifiedCrop, setVerifiedCrop] = useState('');
  const [verifiedDistrict, setVerifiedDistrict] = useState('');
  const [verifiedState, setVerifiedState] = useState('Maharashtra');
  const [verifiedResult, setVerifiedResult] = useState<VerifiedMandiResponse | null>(null);
  const [verifiedLoading, setVerifiedLoading] = useState(false);
  const [searchType, setSearchType] = useState<'direct'>('direct');

  const [isSeeding, setIsSeeding] = useState(false);

  const seedInitialData = async () => {
    setIsSeeding(true);
    try {
      const commonCrops = ['Onion', 'Wheat', 'Tomato', 'Potato', 'Cotton', 'Soybean'];
      const district = 'Nashik';
      const state = 'Maharashtra';
      
      console.log("Seeding initial data for common crops...");
      for (const crop of commonCrops) {
        await fetchDirectGovApiMandiPrices(crop, state, district);
      }
      
      // Reload overview
      const rates = await fetchRealTimeMarketRates(true);
      setOverviewRates(rates);
    } catch (error) {
      console.error("Seeding failed:", error);
    } finally {
      setIsSeeding(false);
    }
  };

  useEffect(() => {
    const loadOverview = async () => {
      setOverviewLoading(true);
      try {
        const rates = await fetchRealTimeMarketRates();
        setOverviewRates(rates);
      } catch (error) {
        console.error("Failed to load market overview:", error);
      } finally {
        setOverviewLoading(false);
      }
    };
    loadOverview();
  }, []);

  const handleVerifiedSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedCrop || !verifiedDistrict) return;
    setVerifiedLoading(true);
    setVerifiedResult(null);
    try {
      const result = await fetchDirectGovApiMandiPrices(verifiedCrop, verifiedState, verifiedDistrict);
      setVerifiedResult(result);
    } catch (error) {
      console.error("Verified search failed:", error);
      setVerifiedResult({
        action: "no_data",
        status: "error",
        error: "Failed to connect to the Government API. Please try again later."
      });
    } finally {
      setVerifiedLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 pb-32">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-end justify-between gap-8 mb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-paithani-maroon rounded-2xl flex items-center justify-center text-white shadow-lg">
              <TrendingUp size={28} />
            </div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter">{t('mandi_rates.title', { defaultValue: 'बाजार भाव (APMC Rates)' })}</h2>
          </div>
          <p className="text-slate-500 font-bold">{t('mandi_rates.subtitle', { defaultValue: 'महाराष्ट्र शासनाच्या अधिकृत बाजार समित्यांचे दर' })}</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Live Market Overview */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <TrendingUp className="text-paithani-maroon" size={24} />
              {t('mandi_rates.overview_title', { defaultValue: 'थेट बाजार भाव (AI Market Rates)' })}
            </h3>
            <button 
              onClick={() => {
                setOverviewLoading(true);
                fetchRealTimeMarketRates(true).then(rates => {
                  setOverviewRates(rates);
                  setOverviewLoading(false);
                });
              }}
              className="p-2 text-slate-400 hover:text-paithani-maroon transition-all"
              title="Refresh Overview"
            >
              <RefreshCw size={20} className={overviewLoading ? 'animate-spin' : ''} />
            </button>
          </div>

          {overviewLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-48 bg-slate-50 animate-pulse rounded-[2.5rem] border-2 border-slate-100"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {overviewRates.length === 0 && !overviewLoading && (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-12 rounded-[2.5rem] text-center max-w-2xl mx-auto">
                  <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100">
                    <TrendingUp size={40} className="text-slate-300" />
                  </div>
                  <h4 className="text-2xl font-black text-slate-900 tracking-tight mb-2">No Market Data Available</h4>
                  <p className="text-slate-500 font-bold mb-8">
                    The market overview is currently empty. Click the refresh button to fetch the latest rates via AI Search.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {overviewRates.map((rate, idx) => (
                <div key={idx} className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-100 shadow-sm hover:shadow-xl transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-xl font-black text-slate-900 tracking-tight">{rate.name}</h4>
                        {rate.source && (
                          <div className="flex flex-col items-start gap-1">
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest ${
                              rate.source === 'live' ? 'bg-emerald-100 text-emerald-600' :
                              rate.source === 'ai_search' ? 'bg-purple-100 text-purple-600' :
                              rate.source === 'cached' ? 'bg-blue-100 text-blue-600' :
                              rate.source === 'database' ? 'bg-indigo-100 text-indigo-600' :
                              'bg-blue-50 text-blue-500'
                            }`}>
                              {rate.source === 'database' ? 'VERIFIED DB' : 
                               rate.source === 'ai_search' ? 'AI SEARCH' :
                               rate.source === 'live' ? 'GOV API' :
                               rate.source?.toUpperCase()}
                            </span>
                            <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter">
                              {rate.source === 'live' || rate.source === 'database' ? 'High Reliability' : 'AI Verified'}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-slate-400">
                        <MapPin size={12} className="text-paithani-maroon" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{rate.location}</span>
                      </div>
                    </div>
                    {rate.lastUpdated && (
                      <span className="text-[8px] font-bold text-slate-400 mt-1">
                        {rate.lastUpdated}
                      </span>
                    )}
                    <div className={`p-2 rounded-xl ${
                      rate.trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 
                      rate.trend === 'down' ? 'bg-red-50 text-red-600' : 
                      'bg-slate-50 text-slate-400'
                    }`}>
                      {rate.trend === 'up' ? <ArrowUpRight size={20} /> : 
                       rate.trend === 'down' ? <ArrowDownRight size={20} /> : 
                       <Minus size={20} />}
                    </div>
                  </div>

                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Price</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-paithani-maroon tracking-tighter">₹{rate.price.toLocaleString()}</span>
                        <span className="text-xs text-slate-400 font-bold">/{rate.unit}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Change</p>
                      <span className={`text-sm font-black ${
                        rate.trend === 'up' ? 'text-emerald-600' : 
                        rate.trend === 'down' ? 'text-red-600' : 
                        'text-slate-400'
                      }`}>{rate.change}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                    <button 
                      onClick={() => alert('Thank you for reporting. Our team will verify this price.')}
                      className="text-[8px] font-black text-slate-300 hover:text-paithani-maroon uppercase tracking-widest transition-colors"
                    >
                      Report Inaccuracy
                    </button>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                        Live Sync
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

        <div className="h-px bg-slate-100 w-full my-8"></div>

        {/* Top Performing Mandis - Only show if we have data */}
        {overviewRates.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-paithani-emerald" size={24} />
              <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Top Performing Mandis (प्रमुख बाजार समित्या)</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {overviewRates.slice(0, 3).map((item, idx) => (
                <div key={idx} className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm flex justify-between items-center group hover:border-paithani-gold/50 transition-all">
                  <div>
                    <h4 className="font-black text-slate-800">{item.name}</h4>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{item.location}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-paithani-emerald">₹{item.price.toLocaleString()}</p>
                    <span className={`text-[10px] font-black uppercase ${item.trend === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>
                      {item.trend === 'up' ? '↑ High Demand' : '↓ Stable'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="h-px bg-slate-100 w-full my-8"></div>

        {/* Search Type Selector - Removed for strict Gov API focus */}
          <div id="search-section" className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm">
            <div className="mb-6">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                AI-Powered Market Search
              </h3>
              <p className="text-slate-500 font-bold text-sm">
                Uses Google Search grounding to find the latest market rates from official sources.
              </p>
            </div>
            <form onSubmit={handleVerifiedSearch} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Crop Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Onion, Wheat"
                  className="w-full px-6 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-paithani-maroon outline-none font-bold"
                  value={verifiedCrop}
                  onChange={(e) => setVerifiedCrop(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">District</label>
                <input 
                  type="text" 
                  placeholder="e.g. Nashik, Pune"
                  className="w-full px-6 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-paithani-maroon outline-none font-bold"
                  value={verifiedDistrict}
                  onChange={(e) => setVerifiedDistrict(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">State</label>
                <select 
                  className="w-full px-6 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-paithani-maroon outline-none font-bold cursor-pointer"
                  value={verifiedState}
                  onChange={(e) => setVerifiedState(e.target.value)}
                >
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Gujarat">Gujarat</option>
                  <option value="Madhya Pradesh">Madhya Pradesh</option>
                  <option value="Karnataka">Karnataka</option>
                </select>
              </div>
              <button 
                type="submit"
                disabled={verifiedLoading}
                className="py-3 bg-paithani-maroon text-white font-black rounded-2xl shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {verifiedLoading ? <RefreshCw size={20} className="animate-spin" /> : <Search size={20} />}
                Search AI Rates
              </button>
            </form>
          </div>

          {/* Verified Results */}
          {verifiedResult && (
            <div className="space-y-6">
              {verifiedResult.action === 'no_data' && (
                <div className="bg-red-50 border-2 border-red-100 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-6 text-red-600">
                  <AlertCircle size={32} className="shrink-0" />
                  <div className="flex-grow">
                    <p className="font-black text-lg mb-2">{verifiedResult.error || "No market data available"}</p>
                    <p className="text-sm font-bold opacity-75">AI Search could not find recent verified data for this specific search. Please try a different crop or district.</p>
                  </div>
                </div>
              )}

              {verifiedResult.data && verifiedResult.data.mandis.length > 0 && (
                <div className="space-y-6">
                  {verifiedResult.action === 'use_previous' && (
                    <div className="bg-blue-50 border-2 border-blue-100 p-4 rounded-2xl flex items-center gap-3 text-blue-700">
                      <Info size={20} />
                      <p className="text-sm font-black uppercase tracking-widest">Showing last stored verified data from database</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {verifiedResult.data.mandis.map((item, idx) => (
                      <div key={idx} className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm hover:shadow-xl transition-all relative overflow-hidden">
                        {item.is_verified && (
                          <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[8px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest">
                            Verified
                          </div>
                        )}
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tighter leading-tight">{item.market_name}</h3>
                            <p className="text-xs font-black text-paithani-maroon uppercase tracking-widest mt-1">{verifiedResult.data?.crop}</p>
                            <div className="flex items-center gap-1 text-slate-400 mt-1">
                              <Calendar size={14} className="text-paithani-maroon" />
                              <span className="text-xs font-black uppercase tracking-widest">{item.arrival_date}</span>
                            </div>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${verifiedResult.source === 'api' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                            {verifiedResult.source === 'api' ? 'AI Search' : 'Stored Data'}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex justify-between items-end">
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Modal Price</p>
                              <p className="text-3xl font-black text-slate-900 tracking-tighter">₹{item.modal_price.toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Range</p>
                              <p className="text-sm font-bold text-slate-600">₹{item.min_price} - ₹{item.max_price}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-center gap-2 w-full py-3 bg-slate-50 text-slate-500 rounded-xl font-black text-xs border border-slate-100">
                            {verifiedResult.data?.state}, {verifiedResult.data?.district}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
      </div>

      {/* Footer Links */}
      <div className="mt-16 flex flex-col items-center gap-6">
        <p className="text-slate-400 font-bold text-center max-w-lg">
          {t('mandi_rates.disclaimer', { defaultValue: 'हे दर केवळ माहितीसाठी आहेत. प्रत्यक्ष व्यवहारापूर्वी आपल्या स्थानिक बाजार समितीशी संपर्क साधा.' })}
        </p>
        <div className="flex gap-4">
          <a 
            href="https://agmarknet.gov.in/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-sm hover:bg-slate-200 transition-all"
          >
            Agmarknet <ExternalLink size={14} />
          </a>
          <a 
            href="https://www.msamb.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-sm hover:bg-slate-200 transition-all"
          >
            MSAMB <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
};

export default MandiRates;
