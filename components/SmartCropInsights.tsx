import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { AlertTriangle, TrendingUp, Info, CheckCircle, MapPin, PlusCircle, Calendar } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { User, CropInsight, AIAdvisory } from '../types';
import { getCropDistribution, getAIAdvisory, getLatestOfficialReport, seedOfficialReport } from '../services/cropIntelligence';
import { useTranslation } from 'react-i18next';

interface SmartCropInsightsProps {
  user: User | null;
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899'];

const SmartCropInsights: React.FC<SmartCropInsightsProps> = ({ user }) => {
  const { t } = useTranslation();
  const [insights, setInsights] = useState<CropInsight[]>([]);
  const [advisory, setAdvisory] = useState<AIAdvisory | null>(null);
  const [loading, setLoading] = useState(true);
  const [plannedCrop, setPlannedCrop] = useState('');
  const [region, setRegion] = useState('महाराष्ट्र');
  const [isSubmittingPlan, setIsSubmittingPlan] = useState(false);
  const [officialReport, setOfficialReport] = useState<any>(null);

  useEffect(() => {
    if (user?.role === 'admin') {
      seedOfficialReport();
    }
  }, [user]);

  useEffect(() => {
    const fetchReport = async () => {
      const data = await getLatestOfficialReport();
      setOfficialReport(data);
    };
    fetchReport();
  }, []);

  useEffect(() => {
    fetchInsights();
  }, [region]);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const data = await getCropDistribution(region);
      setInsights(data);
    } catch (error) {
      console.error("Error fetching insights:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGetAdvisory = async () => {
    if (!plannedCrop) return;
    setLoading(true);
    try {
      const data = await getAIAdvisory(plannedCrop, region, insights);
      setAdvisory(data);
    } catch (error) {
      console.error("Error getting advisory:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPlan = async () => {
    if (!user || !plannedCrop || !auth.currentUser) return;
    setIsSubmittingPlan(true);
    try {
      await addDoc(collection(db, 'farmerPlans'), {
        farmerUid: user.uid,
        farmerName: user.name,
        region,
        plannedCrop,
        season: 'खरीप (Kharif)',
        timestamp: serverTimestamp()
      });
      alert(t('smart_insights.plan.success'));
      fetchInsights();
    } catch (error) {
      console.error("Error submitting plan:", error);
    } finally {
      setIsSubmittingPlan(false);
    }
  };

  const highRiskCrops = insights.filter(i => i.riskLevel === 'High');
  const regionalInfo = officialReport?.regionalStatus?.[region];

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-12 pb-32">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-black text-slate-900 tracking-tighter">{t('smart_insights.title')}</h2>
        <p className="text-slate-500 font-bold text-lg max-w-2xl mx-auto">{t('smart_insights.subtitle')}</p>
      </div>

      {/* Region Selector & Contribution Stats */}
      <div className="flex flex-col items-center gap-6">
        <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 flex items-center gap-4 shadow-sm">
          <MapPin className="text-paithani-maroon" size={20} />
          <select 
            value={region} 
            onChange={(e) => setRegion(e.target.value)}
            className="bg-transparent font-black text-slate-800 focus:outline-none text-lg cursor-pointer"
          >
            <option value="महाराष्ट्र">{t('smart_insights.region_selector.maharashtra')}</option>
            <option value="कोकण">कोकण (Konkan)</option>
            <option value="नाशिक">नाशिक (Nashik)</option>
            <option value="पुणे">पुणे (Pune)</option>
            <option value="कोल्हापूर">कोल्हापूर (Kolhapur)</option>
            <option value="छत्रपती संभाजीनगर">छत्रपती संभाजीनगर (Sambhajinagar)</option>
            <option value="लातूर">लातूर (Latur)</option>
            <option value="अमरावती">अमरावती (Amravati)</option>
            <option value="नागपूर">नागपूर (Nagpur)</option>
          </select>
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-slate-400 font-bold text-sm">
            <CheckCircle size={16} className="text-paithani-emerald" />
            <span>
              {insights.reduce((sum, i) => sum + (i.realFarmerCount || 0), 0)} {t('smart_insights.real_contributions', { defaultValue: 'शेतकऱ्यांनी आपला डेटा शेअर केला आहे' })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-paithani-maroon font-black text-[10px] uppercase tracking-widest bg-paithani-maroon/5 px-3 py-1 rounded-full">
            <Calendar size={12} />
            <span>Official Report Date: {officialReport?.reportDate || 'Loading...'} (Source: Commissionerate of Agriculture, MS)</span>
          </div>
        </div>
      </div>

      {/* Regional Status Info */}
      {regionalInfo && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm space-y-2">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Weather Status (हवामान स्थिती)</h4>
            <p className="font-bold text-slate-700">{regionalInfo.weatherStatus}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm space-y-2">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Harvesting & Maturity (काढणी आणि परिपक्वता)</h4>
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-700"><span className="text-paithani-maroon">Harvesting (काढणी):</span> {regionalInfo.harvestingCrops.length > 0 ? regionalInfo.harvestingCrops.join(', ') : 'None'}</p>
              <p className="text-sm font-bold text-slate-700"><span className="text-paithani-emerald">Maturity (परिपक्वता):</span> {regionalInfo.maturityCrops.length > 0 ? regionalInfo.maturityCrops.join(', ') : 'None'}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm space-y-2">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Sowing Progress (पेरणी प्रगती)</h4>
            <div className="flex gap-4">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase">Rabi (रब्बी)</span>
                <p className="font-black text-paithani-emerald">{regionalInfo.rabiSowingPercentage}%</p>
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase">Summer (उन्हाळी)</span>
                <p className="font-black text-paithani-emerald">{regionalInfo.summerSowingPercentage}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Natural Calamity Alert */}
      {regionalInfo && regionalInfo.weatherStatus.toLowerCase().includes('unseasonal rain') && (
        <div className="bg-amber-50 border-2 border-amber-100 p-8 rounded-3xl flex flex-col md:flex-row items-center gap-6 animate-in slide-in-from-top duration-500">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 shrink-0">
            <AlertTriangle size={32} />
          </div>
          <div className="flex-grow text-center md:text-left">
            <h3 className="text-xl font-black text-amber-900 mb-1">Weather Alert: Unseasonal Rain (हवामान इशारा: अवकाळी पाऊस)</h3>
            <p className="text-amber-700 font-bold">Official report indicates unseasonal rain/hailstorm in this region. This may affect harvesting crops like Wheat, Gram, and Grapes. Please take necessary precautions. (अधिकृत अहवालानुसार या भागात अवकाळी पाऊस/गारपिटीची शक्यता आहे. याचा गहू, हरभरा आणि द्राक्षे यांसारख्या काढणीला आलेल्या पिकांवर परिणाम होऊ शकतो. कृपया आवश्यक खबरदारी घ्या.)</p>
          </div>
        </div>
      )}

      {/* Warning Banner */}
      {highRiskCrops.length > 0 && (
        <div className="bg-red-50 border-2 border-red-100 p-8 rounded-3xl flex flex-col md:flex-row items-center gap-6 animate-in slide-in-from-top duration-500">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 shrink-0">
            <AlertTriangle size={32} />
          </div>
          <div className="flex-grow text-center md:text-left">
            <h3 className="text-xl font-black text-red-900 mb-1">{t('smart_insights.oversupply_alert.title')}</h3>
            <p className="text-red-700 font-bold">{t('smart_insights.oversupply_alert.message', { crops: highRiskCrops.map(c => c.cropName).join(', ') })}</p>
          </div>
          <button className="px-8 py-3 bg-red-600 text-white font-black rounded-xl hover:bg-red-700 transition-all shadow-lg">{t('smart_insights.oversupply_alert.view_alternatives')}</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Charts Section */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-3xl border-2 border-slate-100 h-[400px] flex flex-col shadow-sm relative overflow-hidden">
            {loading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-paithani-emerald border-t-transparent rounded-full animate-spin"></div>
                  <p className="font-black text-slate-900 animate-pulse">{t('smart_insights.loading_data', { defaultValue: 'Analyzing Regional Data...' })}</p>
                </div>
              </div>
            )}
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><Info size={20} className="text-paithani-emerald" /> {t('smart_insights.distribution.title')}</h3>
              <span className="px-3 py-1 bg-paithani-emerald/10 text-paithani-emerald rounded-full text-[10px] font-black uppercase tracking-widest">
                Official Data Source (अधिकृत डेटा स्रोत)
              </span>
            </div>
            <div className="flex-grow">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={insights}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="percentage"
                    nameKey="cropName"
                    label={(props: any) => `${props.cropName}`}
                  >
                    {insights.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border-2 border-slate-100 h-[400px] flex flex-col shadow-sm">
            <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><TrendingUp size={20} className="text-paithani-emerald" /> {t('smart_insights.farmer_count.title')}</h3>
            <div className="flex-grow">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={insights}>
                  <XAxis dataKey="cropName" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 'bold' }} />
                  <YAxis hide />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="farmerCount" radius={[8, 8, 0, 0]}>
                    {insights.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* AI Advisory Section */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-3xl border-2 border-slate-100 shadow-sm">
            <h3 className="text-xl font-black text-slate-800 mb-2 flex items-center gap-2"><PlusCircle size={20} className="text-paithani-maroon" /> {t('smart_insights.plan.title')}</h3>
            <p className="text-slate-500 font-bold text-sm mb-6">{t('smart_insights.plan.help_text', { defaultValue: 'तुमची योजना शेअर करा आणि इतर शेतकऱ्यांना ओव्हरसप्लाय टाळण्यास मदत करा.' })}</p>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-black text-slate-500 uppercase tracking-widest">{t('smart_insights.plan.label')}</label>
                <input 
                  type="text" 
                  value={plannedCrop}
                  onChange={(e) => setPlannedCrop(e.target.value)}
                  placeholder={t('smart_insights.plan.placeholder')}
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-paithani-maroon focus:outline-none font-bold text-lg transition-all"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={handleGetAdvisory}
                  disabled={loading || !plannedCrop}
                  className="flex-grow py-4 bg-paithani-maroon text-white font-black rounded-2xl shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? t('smart_insights.plan.thinking') : t('smart_insights.plan.get_advisory')}
                </button>
                <button 
                  onClick={handleSubmitPlan}
                  disabled={isSubmittingPlan || !plannedCrop || !user}
                  className="px-8 py-4 bg-paithani-emerald text-white font-black rounded-2xl shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSubmittingPlan ? t('smart_insights.plan.saving') : t('smart_insights.plan.save_plan')}
                </button>
              </div>
            </div>
          </div>

          {advisory && (
            <div className="bg-paithani-emerald p-8 rounded-3xl text-white shadow-xl space-y-6 animate-in zoom-in duration-500">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white">
                  <TrendingUp size={24} />
                </div>
                <h3 className="text-2xl font-black tracking-tighter">{t('smart_insights.advisory.title')}</h3>
              </div>
              
              <div className="space-y-6">
                <div className="bg-white/10 p-6 rounded-2xl border border-white/20">
                  <h4 className="font-black text-paithani-gold mb-2 uppercase text-xs tracking-widest">{t('smart_insights.advisory.risk_analysis')}</h4>
                  <p className="font-bold">{advisory.riskExplanation}</p>
                </div>

                <div className="bg-white/10 p-6 rounded-2xl border border-white/20">
                  <h4 className="font-black text-paithani-gold mb-2 uppercase text-xs tracking-widest">{t('smart_insights.advisory.advice')}</h4>
                  <p className="text-xl font-black leading-tight">{advisory.marathiAdvice}</p>
                </div>

                <div className="space-y-4">
                  <h4 className="font-black text-paithani-gold uppercase text-xs tracking-widest ml-2">{t('smart_insights.advisory.alternative_crops')}</h4>
                  <div className="grid grid-cols-1 gap-4">
                    {advisory.alternativeCrops.map((crop, idx) => (
                      <div key={idx} className="bg-white p-6 rounded-2xl flex items-center justify-between group hover:scale-[1.02] transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-paithani-emerald/10 rounded-xl flex items-center justify-center text-paithani-emerald text-2xl">
                            {crop.name.includes('मका') ? '🌽' : crop.name.includes('तूर') ? '🫘' : '🌾'}
                          </div>
                          <div>
                            <h5 className="font-black text-slate-900 text-lg leading-none mb-1">{crop.name}</h5>
                            <p className="text-xs text-slate-500 font-bold">{crop.benefit}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="px-3 py-1 bg-paithani-emerald/10 text-paithani-emerald rounded-full text-[10px] font-black uppercase tracking-widest">
                            {t('smart_insights.advisory.demand_gap')}: {crop.demandGap}
                          </span>
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

export default SmartCropInsights;
