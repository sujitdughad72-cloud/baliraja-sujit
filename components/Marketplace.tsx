
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Product } from '../types';
import { Search, Filter, MapPin, ShoppingCart, MessageCircle, ArrowRight, ShoppingBag } from 'lucide-react';

interface MarketplaceProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  onMessageFarmer: (farmerUid: string, farmerName: string) => void;
}

const Marketplace: React.FC<MarketplaceProps> = ({ products, onAddToCart, onMessageFarmer }) => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<string>('सर्व');
  const [search, setSearch] = useState<string>('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [showFilters, setShowFilters] = useState(false);

  const catMap: Record<string, string> = { 
    'सर्व': t('marketplace.categories.all'), 
    'Vegetables': t('marketplace.categories.vegetables'), 
    'Fruits': t('marketplace.categories.fruits'), 
    'Grains': t('marketplace.categories.grains'), 
    'Spices': t('marketplace.categories.spices') 
  };

  const filteredProducts = products.filter(p => {
    const matchesFilter = filter === 'सर्व' || p.category === filter;
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      p.name.toLowerCase().includes(searchLower) || 
      p.description.toLowerCase().includes(searchLower) ||
      p.category.toLowerCase().includes(searchLower) ||
      p.location.toLowerCase().includes(searchLower);
    
    const matchesPrice = p.price >= priceRange[0] && p.price <= priceRange[1];
    
    return matchesFilter && matchesSearch && matchesPrice;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 pb-32">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-end justify-between gap-8 mb-12">
        <div className="space-y-2">
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter">{t('marketplace.title')}</h2>
          <p className="text-slate-500 font-bold">{t('marketplace.subtitle')}</p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-grow md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder={t('marketplace.search_placeholder')}
              className="w-full pl-12 pr-4 py-3 bg-white border-2 border-slate-100 rounded-2xl focus:border-paithani-emerald outline-none transition-all font-bold"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-3 rounded-2xl border-2 transition-all ${showFilters ? 'bg-paithani-emerald text-white border-paithani-emerald' : 'bg-white text-slate-400 border-slate-100'}`}
          >
            <Filter size={20} />
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="bg-white p-8 rounded-3xl border-2 border-slate-50 shadow-sm mb-12 animate-in slide-in-from-top duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('marketplace.filters.price_range')}</p>
              <div className="flex items-center gap-4">
                <input 
                  type="number" 
                  placeholder="Min"
                  className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none font-bold"
                  value={priceRange[0]}
                  onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                />
                <span className="text-slate-300 font-black">-</span>
                <input 
                  type="number" 
                  placeholder="Max"
                  className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none font-bold"
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('marketplace.filters.location')}</p>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder={t('marketplace.filters.location_placeholder')}
                  className="w-full pl-12 pr-4 py-2 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none font-bold"
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-end">
              <button 
                onClick={() => {
                  setFilter('सर्व');
                  setSearch('');
                  setPriceRange([0, 10000]);
                }}
                className="w-full py-2 text-paithani-maroon font-black hover:bg-red-50 rounded-xl transition-all"
              >
                {t('marketplace.filters.reset')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-12 scrollbar-hide">
        {Object.entries(catMap).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`whitespace-nowrap px-6 py-3 rounded-2xl text-sm font-black transition-all border-2 ${filter === key ? 'bg-paithani-emerald text-white border-paithani-emerald shadow-lg shadow-paithani-emerald/20' : 'bg-white text-slate-500 border-slate-100 hover:border-paithani-emerald'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {filteredProducts.map(product => (
          <div key={product.id} className="bg-white rounded-3xl overflow-hidden border-2 border-slate-50 shadow-sm hover:shadow-xl transition-all group flex flex-col h-full">
            <div className="relative h-48 overflow-hidden">
              <img src={product.image} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt={product.name} />
              <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-slate-900 text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest shadow-sm">
                {product.category}
              </div>
              <div className="absolute bottom-3 right-3 bg-paithani-saffron text-white px-3 py-1 rounded-xl shadow-lg">
                <p className="text-lg font-black tracking-tighter">₹{product.price}</p>
                <p className="text-[8px] font-bold uppercase tracking-widest text-white/70 leading-none">{t('marketplace.product.per')} {product.unit}</p>
              </div>
            </div>

            <div className="p-6 flex flex-col flex-grow">
              <div className="mb-4">
                <h3 className="font-black text-xl text-slate-900 tracking-tighter">{product.name}</h3>
                <div className="flex items-center gap-1 text-slate-400">
                  <MapPin size={12} />
                  <p className="text-[10px] font-bold uppercase tracking-widest">{product.location}</p>
                </div>
              </div>

              <p className="text-xs text-slate-500 font-bold leading-relaxed line-clamp-2 mb-6 flex-grow">
                {product.description}
              </p>
              
              <div className="pt-4 border-t border-slate-50 flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-sm">
                    {product.image.includes('fruit') ? '🍎' : product.image.includes('veg') ? '🥦' : '🌾'}
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-900 leading-none">{product.farmerName}</p>
                    <p className="text-[8px] font-bold text-paithani-emerald uppercase tracking-widest">{t('marketplace.product.farmer')}</p>
                  </div>
                </div>
                <button 
                  onClick={() => onMessageFarmer(product.farmerUid, product.farmerName)}
                  className="p-2 text-slate-400 hover:text-paithani-emerald hover:bg-slate-50 rounded-lg transition-all"
                >
                  <MessageCircle size={18} />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => onAddToCart(product)}
                  className="py-3 bg-slate-100 text-slate-900 rounded-xl font-black text-xs hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                >
                  <ShoppingCart size={14} /> {t('marketplace.product.add_to_cart')}
                </button>
                <button 
                  onClick={() => onAddToCart(product)}
                  className="py-3 bg-paithani-emerald text-white rounded-xl font-black text-xs hover:brightness-110 transition-all shadow-lg shadow-paithani-emerald/20 flex items-center justify-center gap-2"
                >
                  {t('marketplace.product.buy_now')} <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-24 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
           <p className="text-slate-400 font-bold">{t('marketplace.no_products')}</p>
           <button 
             onClick={() => {
               setFilter('सर्व');
               setSearch('');
               setPriceRange([0, 10000]);
             }}
             className="mt-4 text-paithani-emerald font-black underline underline-offset-4"
           >
             {t('marketplace.view_all_crops')}
           </button>
        </div>
      )}
    </div>
  );
};

export default Marketplace;
