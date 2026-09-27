
import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Product } from '../types';
import { PlusCircle, Trash2, TrendingUp, Package, Star, DollarSign, LayoutGrid, List, MessageSquare, Sparkles, MapPin, Calendar, CheckCircle, ShoppingBag } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../services/firestoreUtils';

interface FarmerDashboardProps {
  products: Product[];
  orders: any[];
  onAddProduct: (product: Omit<Product, 'id' | 'farmerName' | 'farmerUid'>) => void;
  onDeleteProduct: (productId: string) => void;
  user?: any;
}

const FarmerDashboard: React.FC<FarmerDashboardProps> = ({ products, orders, onAddProduct, onDeleteProduct, user }) => {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'listings' | 'orders'>('listings');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('kg');
  const [category, setCategory] = useState<Product['category']>('Vegetables');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [location, setLocation] = useState('पुणे');
  const [uploading, setUploading] = useState(false);

  const salesData = [
    { month: 'जाने', sales: 4500 },
    { month: 'फेब्रु', sales: 5200 },
    { month: 'मार्च', sales: 4800 },
    { month: 'एप्रिल', sales: 6100 },
    { month: 'मे', sales: 5500 },
    { month: 'जून', sales: 6700 },
  ];

  const stats = useMemo(() => [
    { label: t('farmer.stats.total_sales'), value: '₹३२,८००', icon: DollarSign, color: 'bg-paithani-emerald', trend: '+१२%' },
    { label: t('farmer.stats.active_listings'), value: products.length.toString(), icon: Package, color: 'bg-paithani-saffron', trend: t('farmer.stats.stable') },
    { label: t('farmer.stats.today_orders'), value: orders.filter(o => {
      const today = new Date().toDateString();
      const orderDate = o.createdAt?.toDate?.().toDateString();
      return orderDate === today;
    }).length.toString(), icon: TrendingUp, color: 'bg-paithani-maroon', trend: `+${orders.filter(o => o.status === 'pending').length}` },
    { label: t('farmer.stats.rating'), value: '४.९', icon: Star, color: 'bg-paithani-gold', trend: t('farmer.stats.excellent') },
  ], [products, orders, t]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert("कृपया १MB पेक्षा कमी आकाराची इमेज निवडा.");
        return;
      }
      setUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && price && description) {
      onAddProduct({
        name,
        category,
        price: Number(price),
        unit,
        description,
        image,
        location
      });
      setShowModal(false);
      // Reset form
      setName('');
      setPrice('');
      setDescription('');
      setImage('');
      setUnit('kg');
      setCategory('Vegetables');
      setLocation('पुणे');
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
      toast.success(`Order ${newStatus} successfully!`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
      toast.error('Failed to update order status');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-12 pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">{t('farmer.greeting', { name: user?.name || t('farmer.default_name') })}</h1>
          <p className="text-slate-500 font-bold text-lg">{t('farmer.subtitle')}</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="px-8 py-4 bg-paithani-saffron text-white rounded-2xl font-black text-lg shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <PlusCircle size={24} />
          {t('farmer.add_new_product')}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-3xl border-2 border-slate-50 flex flex-col items-center text-center group hover:border-paithani-gold/50 transition-all">
            <div className={`w-12 h-12 ${stat.color} rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
              <stat.icon size={24} />
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <h4 className="text-2xl font-black text-slate-800">{stat.value}</h4>
            <div className="mt-2 text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full">
              {stat.trend}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b-2 border-slate-100">
        <button 
          onClick={() => setActiveTab('listings')}
          className={`pb-4 px-4 font-black text-lg transition-all relative ${activeTab === 'listings' ? 'text-paithani-emerald' : 'text-slate-400'}`}
        >
          {t('farmer.my_listings')}
          {activeTab === 'listings' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-paithani-emerald rounded-full" />}
        </button>
        <button 
          onClick={() => setActiveTab('orders')}
          className={`pb-4 px-4 font-black text-lg transition-all relative ${activeTab === 'orders' ? 'text-paithani-emerald' : 'text-slate-400'}`}
        >
          {t('farmer.orders', { defaultValue: 'Orders' })}
          {orders.filter(o => o.status === 'pending').length > 0 && (
            <span className="ml-2 bg-paithani-maroon text-white text-[10px] px-2 py-0.5 rounded-full">
              {orders.filter(o => o.status === 'pending').length}
            </span>
          )}
          {activeTab === 'orders' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-paithani-emerald rounded-full" />}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Chart */}
        <div className="lg:col-span-1 bg-white p-8 rounded-3xl border-2 border-slate-50 shadow-sm">
          <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-paithani-emerald" /> {t('farmer.sales_chart')}
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <YAxis hide />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="sales" radius={[6, 6, 0, 0]}>
                  {salesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 5 ? '#F27D26' : '#059669'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* My Listings / Orders */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border-2 border-slate-50 shadow-sm">
          {activeTab === 'listings' ? (
            <>
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-slate-800">{t('farmer.my_listings')}</h3>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button 
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-paithani-emerald shadow-sm' : 'text-slate-400'}`}
                  >
                    <LayoutGrid size={20} />
                  </button>
                  <button 
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-paithani-emerald shadow-sm' : 'text-slate-400'}`}
                  >
                    <List size={20} />
                  </button>
                </div>
              </div>

              <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 gap-6" : "space-y-4"}>
                {products.length > 0 ? products.map(p => (
                  <div key={p.id} className={`group border-2 border-slate-50 rounded-3xl overflow-hidden hover:border-paithani-saffron transition-all ${viewMode === 'list' ? 'flex items-center p-4 gap-6' : ''}`}>
                    <div className={viewMode === 'grid' ? "h-40 relative" : "w-24 h-24 shrink-0"}>
                      <img src={p.image || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=400'} className="w-full h-full object-cover" alt={p.name} />
                      {viewMode === 'grid' && (
                        <div className="absolute top-3 right-3 px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-[10px] font-black text-emerald-600 uppercase">{t('farmer.active')}</div>
                      )}
                    </div>
                    <div className={`flex-grow ${viewMode === 'grid' ? 'p-5' : ''}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-black text-slate-800 text-lg">{p.name}</h4>
                          <p className="text-xs font-bold text-paithani-saffron uppercase tracking-wider">{p.category}</p>
                        </div>
                        <button 
                          onClick={() => {
                            if (window.confirm(t('farmer.delete_confirm'))) {
                              onDeleteProduct(p.id!);
                            }
                          }}
                          className="p-2 text-slate-300 hover:text-paithani-maroon hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <p className="text-xl font-black text-paithani-emerald">₹{p.price}<span className="text-xs text-slate-400 font-bold">/{p.unit}</span></p>
                        {viewMode === 'list' && (
                          <span className="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-full text-[10px] font-black uppercase">{t('farmer.active')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="col-span-full py-20 text-center space-y-4">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                      <Package size={40} />
                    </div>
                    <p className="text-slate-400 font-bold">{t('farmer.no_listings')}</p>
                    <button onClick={() => setShowModal(true)} className="text-paithani-emerald font-black underline underline-offset-4">{t('farmer.add_first_product')}</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-6">
              <h3 className="text-xl font-black text-slate-800 mb-8">{t('farmer.orders_title', { defaultValue: 'Incoming Orders' })}</h3>
              {orders.length > 0 ? orders.map((order) => (
                <div key={order.id} className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-100 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Order ID: #{order.id.slice(0, 8)}</p>
                      <h4 className="text-lg font-black text-slate-800">{order.buyerName}</h4>
                      <p className="text-[10px] font-bold text-paithani-saffron uppercase tracking-widest mt-1">
                        {order.paymentMethod === 'online' ? (order.onlinePaymentType || 'Online') : order.paymentMethod}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      order.status === 'pending' ? 'bg-paithani-gold/20 text-paithani-gold' : 
                      order.status === 'confirmed' ? 'bg-paithani-emerald/20 text-paithani-emerald' : 
                      'bg-slate-200 text-slate-500'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {order.items.filter((item: any) => item.farmerUid === user.uid).map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm font-bold text-slate-600">
                        <span>{item.name} x {item.quantity} {item.unit}</span>
                        <span>₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                    <p className="text-lg font-black text-paithani-emerald">Total: ₹{order.items.filter((item: any) => item.farmerUid === user.uid).reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0)}</p>
                    <div className="flex gap-2">
                      {order.status === 'pending' && (
                        <button 
                          onClick={() => updateOrderStatus(order.id, 'confirmed')}
                          className="px-4 py-2 bg-paithani-emerald text-white rounded-xl font-black text-xs shadow-lg shadow-paithani-emerald/20"
                        >
                          Confirm
                        </button>
                      )}
                      {order.status === 'confirmed' && (
                        <button 
                          onClick={() => updateOrderStatus(order.id, 'shipped')}
                          className="px-4 py-2 bg-paithani-saffron text-white rounded-xl font-black text-xs shadow-lg shadow-paithani-saffron/20"
                        >
                          Ship Order
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )) : (
                <div className="py-20 text-center space-y-4">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                    <ShoppingBag size={40} />
                  </div>
                  <p className="text-slate-400 font-bold">No orders yet.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden transform animate-in zoom-in duration-300">
            <div className="bg-paithani-emerald p-8 text-white flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black tracking-tighter">{t('farmer.modal.title')}</h3>
                <p className="text-white/60 font-bold uppercase text-[10px] tracking-widest">{t('farmer.modal.subtitle')}</p>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  type="button"
                  onClick={() => {
                    setName('Fresh Alphonso Mangoes');
                    setPrice('1200');
                    setUnit('dozen');
                    setCategory('Fruits');
                    setDescription('Original Ratnagiri Hapus. Naturally ripened, sweet and aromatic. Direct from my farm.');
                    setLocation('Ratnagiri');
                    setImage('https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&q=80&w=400');
                  }}
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  {t('common.fill_sample', { defaultValue: 'Fill Sample' })}
                </button>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-black text-slate-500 uppercase tracking-widest">{t('farmer.modal.product_name')}</label>
                  <input 
                    type="text" 
                    placeholder={t('farmer.modal.product_name_placeholder')} 
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-paithani-saffron outline-none font-bold text-lg transition-all" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-black text-slate-500 uppercase tracking-widest">{t('farmer.modal.price', { defaultValue: 'Price (₹)' })}</label>
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-paithani-saffron outline-none font-bold text-lg transition-all" 
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                    min="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-black text-slate-500 uppercase tracking-widest">{t('farmer.modal.category')}</label>
                  <select 
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-paithani-saffron outline-none font-bold text-lg transition-all cursor-pointer"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                  >
                    <option value="Vegetables">{t('categories.vegetables')}</option>
                    <option value="Fruits">{t('categories.fruits')}</option>
                    <option value="Grains">{t('categories.grains')}</option>
                    <option value="Spices">{t('categories.spices')}</option>
                    <option value="Others">{t('categories.others', { defaultValue: 'Others' })}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-black text-slate-500 uppercase tracking-widest">{t('farmer.modal.location', { defaultValue: 'Location' })}</label>
                  <select 
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-paithani-saffron outline-none font-bold text-lg transition-all cursor-pointer"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  >
                    <option value="महाराष्ट्र">{t('smart_insights.region_selector.maharashtra')}</option>
                    <option value="पुणे">{t('smart_insights.region_selector.pune')}</option>
                    <option value="नाशिक">{t('smart_insights.region_selector.nashik')}</option>
                    <option value="सोलापूर">{t('smart_insights.region_selector.solapur')}</option>
                    <option value="Ratnagiri">Ratnagiri</option>
                    <option value="Latur">Latur</option>
                    <option value="Akola">Akola</option>
                  </select>
                </div>
              </div>
                <div className="space-y-2">
                  <label className="block text-sm font-black text-slate-500 uppercase tracking-widest">{t('farmer.modal.unit')}</label>
                  <select 
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-paithani-saffron outline-none font-bold text-lg transition-all cursor-pointer"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                  >
                    <option value="kg">{t('units.kg')}</option>
                    <option value="dozen">{t('units.dozen')}</option>
                    <option value="quintal">{t('units.quintal')}</option>
                    <option value="piece">{t('units.piece')}</option>
                  </select>
                </div>

              <div className="space-y-2">
                <label className="block text-sm font-black text-slate-500 uppercase tracking-widest">{t('farmer.modal.description')}</label>
                <textarea 
                  placeholder={t('farmer.modal.description_placeholder')} 
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl h-32 focus:border-paithani-saffron outline-none font-bold text-lg transition-all resize-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                ></textarea>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-black text-slate-500 uppercase tracking-widest">{t('farmer.modal.product_image')}</label>
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="flex-grow w-full">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="product-image"
                    />
                    <label 
                      htmlFor="product-image"
                      className="flex flex-col items-center justify-center gap-2 w-full p-8 border-4 border-dashed border-slate-100 rounded-3xl cursor-pointer hover:border-paithani-emerald hover:bg-emerald-50 transition-all group"
                    >
                      <PlusCircle size={32} className="text-slate-300 group-hover:text-paithani-emerald transition-all" />
                      <span className="text-sm font-black text-slate-400 uppercase tracking-widest group-hover:text-paithani-emerald transition-all">
                        {uploading ? t('farmer.modal.uploading') : image ? t('farmer.modal.change_photo') : t('farmer.modal.select_photo')}
                      </span>
                    </label>
                  </div>
                  {image && (
                    <div className="relative w-32 h-32 shrink-0">
                      <img src={image} alt="Preview" className="w-full h-full object-cover rounded-3xl border-4 border-white shadow-xl" />
                      <button 
                        type="button"
                        onClick={() => setImage('')}
                        className="absolute -top-2 -right-2 bg-paithani-maroon text-white rounded-full p-2 shadow-lg hover:scale-110 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t('farmer.modal.photo_hint')}</p>
              </div>

              <div className="pt-6">
                <button 
                  type="submit" 
                  disabled={uploading}
                  className={`w-full py-5 bg-paithani-emerald text-white font-black text-xl rounded-2xl shadow-xl hover:brightness-110 active:scale-95 transition-all ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {t('farmer.modal.submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmerDashboard;
