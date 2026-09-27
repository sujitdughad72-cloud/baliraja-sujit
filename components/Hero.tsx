
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShoppingBag, PlusCircle, MessageSquare, ArrowRight, Star, MapPin, TrendingUp } from 'lucide-react';

interface HeroProps {
  onExplore: () => void;
  onSell: () => void;
  onAdmin?: () => void;
  user?: any;
}

const Hero: React.FC<HeroProps> = ({ onExplore, onSell, onAdmin, user }) => {
  const { t } = useTranslation();

  const quickActions = [
    { id: 'sell', label: t('hero.quick_actions.sell'), sub: 'Sell Crop', icon: PlusCircle, color: 'bg-paithani-saffron', onClick: onSell },
    { id: 'buy', label: t('hero.quick_actions.buy'), sub: 'View Market', icon: ShoppingBag, color: 'bg-paithani-emerald', onClick: onExplore },
    { id: 'ai', label: t('hero.quick_actions.ai'), sub: 'AI Advisor', icon: MessageSquare, color: 'bg-paithani-maroon', onClick: () => {} },
  ];

  return (
    <div className="min-h-screen pb-12">
      {/* Hero Section */}
      <div className="relative bg-paithani-emerald pt-12 pb-32 px-4 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-10 left-10 w-64 h-64 bg-paithani-saffron rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-paithani-maroon rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="text-center md:text-left space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-paithani-saffron text-xs font-black uppercase tracking-widest">
                <Star size={14} fill="currentColor" /> {t('hero.motto')}
              </div>
              <h1 className="text-5xl md:text-7xl font-black text-white leading-[1.1] tracking-tighter">
                {t('hero.title_main')} <br/>
                <span className="text-paithani-saffron">{t('hero.title_sub')}</span>
              </h1>
              <p className="text-lg text-emerald-50/80 font-medium max-w-lg">
                {t('hero.description')}
              </p>
            </div>
            
            <div className="hidden md:block w-full max-w-md">
              <div className="bg-white/10 backdrop-blur-md p-2 transform rotate-3 hover:rotate-0 transition-transform duration-500 rounded-3xl border border-white/20">
                <img 
                  src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=600" 
                  alt="BaliRaja Digital Market" 
                  className="w-full h-80 object-cover rounded-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="max-w-7xl mx-auto px-4 -mt-16 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action) => (
            <button 
              key={action.id}
              onClick={action.onClick}
              className="bg-white p-8 rounded-3xl shadow-xl flex items-center justify-between group hover:scale-[1.02] transition-all cursor-pointer text-left border-2 border-slate-50"
            >
              <div className="flex items-center gap-6">
                <div className={`w-16 h-16 ${action.color} rounded-2xl flex items-center justify-center text-white shadow-lg transform group-hover:rotate-12 transition-transform`}>
                  <action.icon size={32} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 leading-none mb-1">{action.label}</h3>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">{action.sub}</p>
                </div>
              </div>
              <ArrowRight className="text-slate-300 group-hover:text-paithani-saffron group-hover:translate-x-2 transition-all" />
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};

export default Hero;
