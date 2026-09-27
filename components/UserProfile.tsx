import React, { useState } from 'react';
import { User, Product } from '../types';
import { User as UserIcon, Settings, History, Tractor, Globe, LogOut, ChevronRight, Shield, CreditCard, Bell, Languages, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface UserProfileProps {
  user: User;
  onLogout: () => void;
  products: Product[];
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onLogout, products }) => {
  const { t, i18n } = useTranslation();
  const [activeSection, setActiveSection] = useState<'profile' | 'history' | 'farm' | 'settings'>('profile');

  const farmerProducts = products.filter(p => p.farmerUid === user.uid);

  const menuItems = [
    { id: 'profile', label: t('profile.menu.profile'), icon: UserIcon },
    { id: 'history', label: t('profile.menu.history'), icon: History },
    ...(user.role === 'farmer' ? [{ id: 'farm', label: t('profile.menu.farm'), icon: Tractor }] : []),
    { id: 'settings', label: t('profile.menu.settings'), icon: Settings },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 pb-32">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full lg:w-64 shrink-0">
          <div className="bg-white rounded-3xl border-2 border-slate-50 shadow-sm overflow-hidden sticky top-24">
            <div className="p-6 bg-paithani-emerald text-white text-center">
              <div className="w-20 h-20 bg-white rounded-2xl mx-auto mb-4 flex items-center justify-center text-paithani-emerald text-3xl font-black shadow-lg">
                {user.name.charAt(0)}
              </div>
              <h2 className="text-xl font-black tracking-tight">{user.name}</h2>
              <p className="text-xs font-bold text-white/70 uppercase tracking-widest mt-1">
                {user.role === 'farmer' ? t('roles.farmer') : user.role === 'admin' ? t('roles.admin') : t('roles.buyer')}
              </p>
            </div>
            
            <nav className="p-4 space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id as any)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all font-black text-sm ${activeSection === item.id ? 'bg-paithani-emerald/10 text-paithani-emerald' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <item.icon size={18} />
                  {item.label}
                </button>
              ))}
              <div className="h-px bg-slate-100 my-4"></div>
              <button 
                onClick={onLogout}
                className="w-full flex items-center gap-3 p-4 text-paithani-maroon hover:bg-red-50 rounded-xl transition-all font-black text-sm"
              >
                <LogOut size={18} />
                {t('profile.logout')}
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="flex-grow bg-white rounded-3xl border-2 border-slate-50 shadow-sm p-8 md:p-12 min-h-[600px]">
          {activeSection === 'profile' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{t('profile.info.title')}</h3>
                <button className="text-paithani-emerald font-black text-sm underline underline-offset-4">{t('profile.info.edit')}</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-1">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('profile.info.full_name')}</p>
                  <p className="text-lg font-bold text-slate-800">{user.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('profile.info.email')}</p>
                  <p className="text-lg font-bold text-slate-800">{user.email || t('profile.info.not_available')}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('profile.info.mobile')}</p>
                  <p className="text-lg font-bold text-slate-800">{user.phone || t('profile.info.not_available')}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('profile.info.address')}</p>
                  <p className="text-lg font-bold text-slate-800">{t('profile.info.default_address')}</p>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-100">
                <h4 className="text-lg font-black text-slate-900 mb-6 tracking-tighter">{t('profile.security.title')}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-6 bg-emerald-50 rounded-2xl border-2 border-emerald-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-paithani-emerald shadow-sm">
                      <Shield size={24} />
                    </div>
                    <div>
                      <p className="font-black text-slate-900">{t('profile.security.aadhaar_verified')}</p>
                      <p className="text-[10px] font-bold text-paithani-emerald uppercase tracking-widest">{t('profile.security.identity_verified')}</p>
                    </div>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-2xl border-2 border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm">
                      <CreditCard size={24} />
                    </div>
                    <div>
                      <p className="font-black text-slate-900">{t('profile.security.bank_account')}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('profile.security.not_linked')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'farm' && user.role === 'farmer' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{t('profile.farm.title')}</h3>
                <div className="flex items-center gap-2 text-paithani-emerald font-black">
                  <Tractor size={20} /> ५.५ {t('units.acre')}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-100">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{t('profile.farm.total_crops')}</p>
                  <p className="text-3xl font-black text-slate-900">{farmerProducts.length}</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-100">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{t('profile.farm.sold_items')}</p>
                  <p className="text-3xl font-black text-slate-900">१२</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-100">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{t('profile.farm.total_income')}</p>
                  <p className="text-3xl font-black text-paithani-emerald">₹४५,२००</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-black text-slate-900 tracking-tighter">{t('profile.farm.current_crops')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {farmerProducts.map(p => (
                    <div key={p.id} className="flex items-center gap-4 p-4 bg-white border-2 border-slate-50 rounded-2xl hover:border-paithani-emerald transition-all">
                      <img src={p.image} className="w-16 h-16 rounded-xl object-cover" alt={p.name} />
                      <div>
                        <p className="font-black text-slate-900">{p.name}</p>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{p.category} • ₹{p.price}/{p.unit}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'history' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{t('profile.history.title')}</h3>
              <div className="space-y-4">
                {[
                  { id: '1', item: t('categories.grains'), date: '१५ मार्च २०२४', amount: '₹१२,५००', status: t('profile.history.completed') },
                  { id: '2', item: t('categories.spices'), date: '१० मार्च २०२४', amount: '₹३,२००', status: t('profile.history.completed') },
                  { id: '3', item: t('categories.vegetables'), date: '०५ मार्च २०२४', amount: '₹८५०', status: t('profile.history.completed') },
                ].map(order => (
                  <div key={order.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border-2 border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm">
                        <History size={24} />
                      </div>
                      <div>
                        <p className="font-black text-slate-900">{order.item}</p>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{order.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-slate-900">{order.amount}</p>
                      <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{order.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'settings' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{t('profile.settings.title')}</h3>
              
              <div className="space-y-6">
                <div className="space-y-4">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Globe size={14} /> {t('profile.settings.language')}
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    <button 
                      onClick={() => i18n.changeLanguage('mr')}
                      className={`py-4 rounded-2xl font-black text-lg transition-all border-2 ${i18n.language === 'mr' ? 'bg-paithani-emerald text-white border-paithani-emerald' : 'bg-slate-50 text-slate-500 border-slate-100'}`}
                    >
                      मराठी
                    </button>
                    <button 
                      onClick={() => i18n.changeLanguage('hi')}
                      className={`py-4 rounded-2xl font-black text-lg transition-all border-2 ${i18n.language === 'hi' ? 'bg-paithani-emerald text-white border-paithani-emerald' : 'bg-slate-50 text-slate-500 border-slate-100'}`}
                    >
                      हिन्दी
                    </button>
                    <button 
                      onClick={() => i18n.changeLanguage('en')}
                      className={`py-4 rounded-2xl font-black text-lg transition-all border-2 ${i18n.language === 'en' ? 'bg-paithani-emerald text-white border-paithani-emerald' : 'bg-slate-50 text-slate-500 border-slate-100'}`}
                    >
                      English
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Bell size={14} /> {t('profile.settings.notifications')}
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {[t('profile.settings.market_updates'), t('profile.settings.new_orders'), t('profile.settings.weather_alerts')].map((label, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border-2 border-slate-100">
                        <span className="font-bold text-slate-700">{label}</span>
                        <div className="w-12 h-6 bg-paithani-emerald rounded-full relative p-1">
                          <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
