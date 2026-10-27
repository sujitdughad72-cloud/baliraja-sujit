
import React from 'react';
import { useTranslation } from 'react-i18next';

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
  user: any;
  onLoginClick: () => void;
  onLogout: () => void;
  cartCount: number;
  onCartClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange, user, onLoginClick, onLogout, cartCount, onCartClick }) => {
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b-4 border-paithani-saffron shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onTabChange('home')}>
            <div className="w-12 h-12 bg-paithani-emerald rounded-2xl flex items-center justify-center text-white shadow-lg border-2 border-paithani-saffron/30 overflow-hidden transform group-hover:rotate-12 transition-transform">
               <span className="text-2xl font-black">{t('brand').charAt(0)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black text-paithani-emerald leading-none tracking-tighter">{t('brand')}</span>
              <span className="text-[10px] font-black text-paithani-maroon uppercase tracking-[0.2em]">{t('tagline')}</span>
            </div>
          </div>
          
          <div className="hidden lg:flex items-center space-x-2">
            {[
              { id: 'home', label: t('nav.home') },
              { id: 'mandi', label: t('nav.mandi', { defaultValue: 'बाजार भाव' }) },
              { id: 'buy', label: t('nav.buy') },
              { id: 'chat', label: t('nav.messages') },
              { id: 'sell', label: t('nav.sell') },
              { id: 'insights', label: t('nav.insights') },
              { id: 'sensors', label: t('nav.sensors', { defaultValue: 'माती सेन्सर (IoT)' }) },
              { id: 'services', label: t('nav.services') },
              { id: 'ai', label: t('nav.ai') },
              ...(user?.role === 'admin' || user?.email === 'sujitdughad72@gmail.com' ? [{ id: 'admin', label: t('nav.admin') }] : [])
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={() => onTabChange(tab.id as any)}
                className={`px-5 py-2 rounded-full text-sm font-black transition-all uppercase tracking-wider ${activeTab === tab.id ? 'bg-paithani-saffron text-white shadow-lg scale-105' : 'text-slate-600 hover:text-paithani-emerald hover:bg-slate-50'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center bg-slate-100 rounded-full p-1 border border-slate-200">
              <button 
                onClick={() => changeLanguage('mr')} 
                className={`px-2 py-1 text-[10px] font-bold rounded-full transition-all ${i18n.language === 'mr' ? 'bg-paithani-emerald text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
              >
                मराठी
              </button>
              <button 
                onClick={() => changeLanguage('hi')} 
                className={`px-2 py-1 text-[10px] font-bold rounded-full transition-all ${i18n.language === 'hi' ? 'bg-paithani-emerald text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
              >
                हिंदी
              </button>
              <button 
                onClick={() => changeLanguage('en')} 
                className={`px-2 py-1 text-[10px] font-bold rounded-full transition-all ${i18n.language === 'en' ? 'bg-paithani-emerald text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
              >
                EN
              </button>
            </div>

            <button 
              onClick={onCartClick}
              className="relative p-2 text-paithani-emerald hover:bg-slate-50 rounded-full transition-all"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-paithani-maroon text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                  {cartCount}
                </span>
              )}
            </button>

            {user ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-slate-400 uppercase leading-none">{t('auth.welcome')}</p>
                  <p className="font-black text-paithani-emerald leading-tight">{user.name}</p>
                </div>
                <button 
                  onClick={onLogout}
                  className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-paithani-maroon hover:text-white transition-all border border-slate-200"
                  title={t('auth.logout')}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                </button>
              </div>
            ) : (
              <button 
                onClick={onLoginClick}
                className="flex items-center gap-2 px-6 py-2 bg-paithani-emerald text-white font-bold rounded-full hover:bg-emerald-900 transition-all border-2 border-paithani-gold shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/></svg>
                {t('auth.login')}
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
