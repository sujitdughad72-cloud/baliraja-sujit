
import React from 'react';
import { Home, ShoppingBag, PlusCircle, MessageSquare, Bell, ShieldCheck, BarChart2, TrendingUp, ClipboardList, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
  user: any;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange, user }) => {
  const { t } = useTranslation();

  const tabs = [
    { id: 'home', label: t('bottom_nav.home', 'होम'), icon: Home },
    { id: 'mandi', label: t('bottom_nav.mandi', 'बाजार भाव'), icon: TrendingUp },
    { id: 'buy', label: t('bottom_nav.market', 'बाजार'), icon: ShoppingBag },
    { id: 'chat', label: t('bottom_nav.messages'), icon: MessageCircle },
    { id: 'sell', label: t('bottom_nav.sell', 'विक्री'), icon: PlusCircle },
    { id: 'insights', label: t('bottom_nav.advice', 'सल्ला'), icon: BarChart2 },
    { id: 'services', label: t('bottom_nav.services', 'सेवा'), icon: Bell },
    { id: 'ai', label: t('bottom_nav.ai', 'AI'), icon: MessageSquare },
    ...(user?.role === 'admin' || user?.email === 'sujitdughad72@gmail.com' ? [{ id: 'admin', label: t('nav.admin', 'अ‍ॅडमिन'), icon: ShieldCheck }] : [])
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-200 z-50 px-4 pb-6 pt-3 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center gap-1 group"
            >
              <div className={`p-2 rounded-xl transition-all ${
                isActive 
                  ? 'bg-paithani-saffron text-white shadow-lg scale-110' 
                  : 'text-slate-400 group-hover:text-paithani-emerald'
              }`}>
                <Icon size={22} strokeWidth={isActive ? 3 : 2} />
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${
                isActive ? 'text-paithani-saffron' : 'text-slate-400'
              }`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
