import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShoppingBag, Package, CheckCircle, Clock, Truck, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fetchRealTimeMarketRates, MarketRate } from '../src/services/marketService';

interface OrderHistoryProps {
  orders: any[];
  user: any;
}

const OrderHistory: React.FC<OrderHistoryProps> = ({ orders, user }) => {
  const { t } = useTranslation();
  const [marketTrends, setMarketTrends] = useState<MarketRate[]>([]);

  useEffect(() => {
    const loadTrends = async () => {
      const rates = await fetchRealTimeMarketRates();
      setMarketTrends(rates.slice(0, 4));
    };
    loadTrends();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="text-paithani-gold" size={20} />;
      case 'confirmed': return <CheckCircle className="text-paithani-emerald" size={20} />;
      case 'shipped': return <Truck className="text-paithani-saffron" size={20} />;
      default: return <Package className="text-slate-400" size={20} />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-paithani-emerald/10 rounded-2xl flex items-center justify-center text-paithani-emerald">
          <ShoppingBag size={24} />
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-800">{t('orders.my_orders', { defaultValue: 'My Orders' })}</h2>
          <p className="text-slate-500 font-bold">{t('orders.track_status', { defaultValue: 'Track your recent purchases' })}</p>
        </div>
      </div>

      {/* Live Market Trends Section - Moved from Marketplace */}
      <div className="bg-white rounded-3xl border-2 border-slate-50 p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-paithani-emerald/10 rounded-xl flex items-center justify-center text-paithani-emerald">
            <TrendingUp size={20} />
          </div>
          <h3 className="text-xl font-black text-slate-900 tracking-tighter">{t('marketplace.trends.title', { defaultValue: "Today's Market Trends" })}</h3>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {marketTrends.length > 0 ? marketTrends.map((item, i) => (
            <div key={i} className="bg-slate-50 p-6 rounded-2xl border-2 border-transparent hover:border-paithani-emerald transition-all">
              <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.name}</p>
                <div className={`px-1.5 py-0.5 rounded text-[8px] font-black flex items-center gap-1 ${item.trend === 'up' ? 'bg-emerald-50 text-emerald-500' : item.trend === 'down' ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-400'}`}>
                  {item.trend === 'up' ? '▲' : item.trend === 'down' ? '▼' : '●'} {item.change}
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900">₹{item.price}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{item.location}</p>
            </div>
          )) : (
            [1, 2, 3, 4].map(i => (
              <div key={i} className="bg-slate-50 p-6 rounded-2xl animate-pulse h-24"></div>
            ))
          )}
        </div>
        <p className="mt-6 text-[10px] text-slate-400 font-bold italic">
          {t('marketplace.trends.source', { defaultValue: "Data sourced from official APMC market reports" })}
        </p>
      </div>

      <div className="space-y-6">
        {orders.length > 0 ? orders.map((order) => (
          <motion.div 
            key={order.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-3xl border-2 border-slate-50 shadow-sm space-y-4"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Order #{order.id.slice(0, 8)}</p>
                <p className="text-xs font-bold text-slate-500">{order.createdAt?.toDate?.().toLocaleString()}</p>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                order.status === 'pending' ? 'bg-paithani-gold/10 text-paithani-gold' : 
                order.status === 'confirmed' ? 'bg-paithani-emerald/10 text-paithani-emerald' : 
                'bg-paithani-saffron/10 text-paithani-saffron'
              }`}>
                {getStatusIcon(order.status)}
                {order.status}
              </div>
            </div>

            <div className="space-y-3">
              {order.items.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center gap-4">
                  <img src={item.image} alt={item.name} className="w-12 h-12 rounded-xl object-cover border border-slate-100" />
                  <div className="flex-grow">
                    <p className="font-black text-slate-800 text-sm">{item.name}</p>
                    <p className="text-xs font-bold text-slate-400">{item.quantity} {item.unit} • {item.farmerName}</p>
                  </div>
                  <p className="font-black text-slate-800 text-sm">₹{item.price * item.quantity}</p>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Method</p>
                <p className="text-xs font-bold text-slate-600 uppercase">
                  {order.paymentMethod === 'online' ? (order.onlinePaymentType || 'Online') : order.paymentMethod}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Amount</p>
                <p className="text-xl font-black text-paithani-emerald">₹{order.totalAmount}</p>
              </div>
            </div>
          </motion.div>
        )) : (
          <div className="py-20 text-center space-y-6 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto text-slate-300 shadow-sm">
              <ShoppingBag size={40} />
            </div>
            <div>
              <p className="text-slate-800 font-black text-xl">{t('orders.no_orders', { defaultValue: 'No orders yet' })}</p>
              <p className="text-slate-400 font-bold">{t('orders.start_shopping', { defaultValue: 'Your purchases will appear here' })}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderHistory;
