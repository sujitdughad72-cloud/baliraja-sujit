
import React, { useState, useEffect } from 'react';
import { fetchRealTimeMarketRates, MarketRate } from '../src/services/marketService';
import { useTranslation } from 'react-i18next';

const MarketTicker: React.FC = () => {
  const { t } = useTranslation();
  const [prices, setPrices] = useState<MarketRate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRates = async () => {
      const rates = await fetchRealTimeMarketRates();
      if (rates && rates.length > 0) {
        setPrices(rates);
      }
      setLoading(false);
    };

    loadRates();
    const interval = setInterval(loadRates, 300000); // Update every 5 minutes

    return () => clearInterval(interval);
  }, []);

  if (loading && prices.length === 0) {
    return (
      <div className="bg-paithani-emerald py-3 border-y-4 border-paithani-gold overflow-hidden">
        <div className="flex justify-center items-center gap-3 text-white font-bold animate-pulse">
          <span>🔄 {t('market_ticker.loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-paithani-maroon py-2 overflow-hidden border-b-2 border-paithani-saffron shadow-inner relative group">
      <div className="absolute left-0 top-0 bottom-0 bg-paithani-maroon z-10 px-4 flex items-center border-r border-paithani-saffron/30">
        <span className="text-[10px] font-black text-paithani-saffron uppercase tracking-widest">{t('market_ticker.live_mandi')}</span>
      </div>
      <div className="flex whitespace-nowrap animate-marquee ml-12">
        {[...prices, ...prices].map((item, idx) => (
          <div key={idx} className="flex items-center gap-6 px-8 border-r border-white/10">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-white font-black text-[10px] uppercase tracking-wider leading-none">{item.name}</span>
                {item.source && (
                  <span className={`text-[6px] font-black px-1 rounded-[2px] uppercase tracking-tighter ${
                    item.source === 'live' ? 'bg-emerald-500/20 text-emerald-400' :
                    item.source === 'cached' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-amber-500/20 text-amber-400'
                  }`}>
                    {item.source}
                  </span>
                )}
              </div>
              <span className="text-[8px] font-bold text-paithani-saffron/60 uppercase">{item.location}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-paithani-saffron font-black text-sm">₹{item.price}</span>
              <span className="text-[8px] font-bold text-white/40">/{item.unit}</span>
            </div>
            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded flex items-center gap-1 ${
              item.trend === 'up' ? 'text-emerald-400' : 
              item.trend === 'down' ? 'text-red-400' : 
              'text-blue-400'
            }`}>
              {item.trend === 'up' ? '▲' : item.trend === 'down' ? '▼' : '●'} {item.change}
            </span>
          </div>
        ))}
      </div>
      <div className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-paithani-maroon to-transparent w-20 pointer-events-none z-10"></div>
    </div>
  );
};

export default MarketTicker;
