
import React, { useState, useEffect } from 'react';
import { Zap, MapPin, Clock, AlertCircle, CheckCircle2, Info, Edit2, Save, X, Plus, Trash2 } from 'lucide-react';
import { db, auth } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { User } from '../types';
import { handleFirestoreError, OperationType } from '../services/firestoreUtils';
import { useTranslation } from 'react-i18next';

interface LightScheduleProps {
  user: User | null;
}

const MAHARASHTRA_DISTRICTS = [
  'पुणे (Pune)',
  'नाशिक (Nashik)',
  'अहमदनगर (Ahmednagar)',
  'सोलापूर (Solapur)',
  'छत्रपती संभाजीनगर (Chhatrapati Sambhajinagar)',
  'कोल्हापूर (Kolhapur)',
  'सांगली (Sangli)',
  'सातारा (Satara)',
  'जळगाव (Jalgaon)',
  'नागपूर (Nagpur)'
];

const TALUKAS: Record<string, string[]> = {
  'पुणे (Pune)': ['हवेली (Haveli)', 'बारामती (Baramati)', 'जुन्नर (Junnar)', 'खेड (Khed)', 'आंबेगाव (Ambegaon)', 'शिरूर (Shirur)', 'दौंड (Daund)', 'इंदापूर (Indapur)', 'पुरंदर (Purandar)', 'भोर (Bhor)', 'वेल्हे (Velhe)', 'मुळशी (Mulshi)', 'मावळ (Maval)'],
  'नाशिक (Nashik)': ['नाशिक (Nashik)', 'निफाड (Niphad)', 'yeola (Yeola)', 'सिन्नर (Sinnar)', 'चांदवड (Chandwad)', 'कळवण (Kalwan)', 'बागलाण (Baglan)', 'मालेगाव (Malegaon)', 'नांदगाव (Nandgaon)', 'देवळा (Deola)', 'दिंडोरी (Dindori)', 'इगतपुरी (Igatpuri)', 'त्र्यंबकेश्वर (Trimbakeshwar)', 'पेठ (Peint)', 'सुरगाणा (Surgana)'],
  'अहमदनगर (Ahmednagar)': ['नगर (Nagar)', 'पारनेर (Parner)', 'पाथर्डी (Pathardi)', 'शेवगाव (Shevgaon)', 'कर्जत (Karjat)', 'जामखेड (Jamkhed)', 'श्रीगोंदा (Shrigonda)', 'राहुरी (Rahuri)', 'नेवासा (Nevasa)', 'कोपरगाव (Kopargaon)', 'राहता (Rahata)', 'संगमनेर (Sangamner)', 'अकोले (Akole)', 'श्रीरामपूर (Shrirampur)']
};

const DEFAULT_TALUKAS = ['तालुका १', 'तालुका २', 'तालुका ३'];

const LightSchedule: React.FC<LightScheduleProps> = ({ user }) => {
  const { t } = useTranslation();
  const [district, setDistrict] = useState('');
  const [taluka, setTaluka] = useState('');
  const [schedule, setSchedule] = useState<{ start: string, end: string }[]>([]);
  const [isPowerOn, setIsPowerOn] = useState(false);
  const [nextPowerTime, setNextPowerTime] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editSchedule, setEditSchedule] = useState<{ start: string, end: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.email === 'sujitdughad72@gmail.com';

  useEffect(() => {
    if (!auth.currentUser) return;
    if (district && taluka) {
      const docId = `${district}_${taluka}`.replace(/\s+/g, '_');
      const unsubscribe = onSnapshot(doc(db, 'schedules', docId), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSchedule(data.slots || []);
          checkPowerStatus(data.slots || []);
        } else {
          // Default mock if no data exists
          const defaultSched = [
            { start: '06:00', end: '10:00' },
            { start: '18:00', end: '22:00' }
          ];
          setSchedule(defaultSched);
          checkPowerStatus(defaultSched);
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `schedules/${docId}`);
      });

      return () => unsubscribe();
    }
  }, [district, taluka]);

  const checkPowerStatus = (sched: { start: string, end: string }[]) => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    let on = false;
    let next = '';

    const sortedSched = [...sched].sort((a, b) => {
      const [ah, am] = a.start.split(':').map(Number);
      const [bh, bm] = b.start.split(':').map(Number);
      return (ah * 60 + am) - (bh * 60 + bm);
    });

    for (const slot of sortedSched) {
      const [startH, startM] = slot.start.split(':').map(Number);
      const [endH, endM] = slot.end.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      if (currentTimeInMinutes >= startMinutes && currentTimeInMinutes < endMinutes) {
        on = true;
        break;
      }
    }

    if (!on) {
      const upcoming = sortedSched.find(slot => {
        const [startH, startM] = slot.start.split(':').map(Number);
        return (startH * 60 + startM) > currentTimeInMinutes;
      });
      next = upcoming ? upcoming.start : (sortedSched.length > 0 ? sortedSched[0].start : '--:--');
    }

    setIsPowerOn(on);
    setNextPowerTime(next);
  };

  const handleStartEdit = () => {
    setEditSchedule([...schedule]);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!district || !taluka) return;
    setLoading(true);
    const docId = `${district}_${taluka}`.replace(/\s+/g, '_');
    try {
      await setDoc(doc(db, 'schedules', docId), {
        slots: editSchedule,
        updatedBy: user?.uid,
        updatedAt: new Date()
      });
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `schedules/${docId}`);
    } finally {
      setLoading(false);
    }
  };

  const addSlot = () => {
    setEditSchedule([...editSchedule, { start: '00:00', end: '00:00' }]);
  };

  const removeSlot = (index: number) => {
    setEditSchedule(editSchedule.filter((_, i) => i !== index));
  };

  const updateSlot = (index: number, field: 'start' | 'end', value: string) => {
    const newSched = [...editSchedule];
    newSched[index][field] = value;
    setEditSchedule(newSched);
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border-4 border-paithani-gold overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-paithani-saffron/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
      
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-paithani-saffron rounded-2xl flex items-center justify-center text-white shadow-lg shadow-paithani-saffron/30">
            <Zap className="w-8 h-8 fill-current" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-paithani-emerald">{t('light_schedule.title')}</h2>
            <p className="text-slate-500 font-bold">{t('light_schedule.subtitle')}</p>
          </div>
        </div>
        {isAdmin && district && taluka && !isEditing && (
          <button 
            onClick={handleStartEdit}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-paithani-saffron hover:text-white transition-all shadow-sm"
          >
            <Edit2 className="w-4 h-4" />
            {t('light_schedule.edit_button')}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="space-y-2">
          <label className="block text-sm font-black text-slate-500 uppercase tracking-widest">{t('light_schedule.state_label')}</label>
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-paithani-saffron" />
            <select className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold appearance-none cursor-not-allowed" disabled>
              <option>{t('light_schedule.state_value')}</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-black text-slate-500 uppercase tracking-widest">{t('light_schedule.district_label')}</label>
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-paithani-emerald" />
            <select 
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-paithani-emerald outline-none transition-all"
              value={district}
              onChange={(e) => { setDistrict(e.target.value); setTaluka(''); setIsEditing(false); }}
            >
              <option value="">{t('light_schedule.district_placeholder')}</option>
              {MAHARASHTRA_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-black text-slate-500 uppercase tracking-widest">{t('light_schedule.taluka_label')}</label>
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-paithani-maroon" />
            <select 
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-paithani-maroon outline-none transition-all"
              value={taluka}
              onChange={(e) => { setTaluka(e.target.value); setIsEditing(false); }}
              disabled={!district}
            >
              <option value="">{t('light_schedule.taluka_placeholder')}</option>
              {(TALUKAS[district] || DEFAULT_TALUKAS).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </div>

      {district && taluka ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {!isEditing && (
            <div className={`p-6 rounded-3xl flex items-center justify-between border-2 ${isPowerOn ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isPowerOn ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                  {isPowerOn ? <CheckCircle2 className="w-7 h-7" /> : <AlertCircle className="w-7 h-7" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{t('light_schedule.status_label')}</p>
                  <h3 className={`text-2xl font-black ${isPowerOn ? 'text-emerald-700' : 'text-red-700'}`}>
                    {isPowerOn ? t('light_schedule.power_on') : t('light_schedule.power_off')}
                  </h3>
                </div>
              </div>
              {!isPowerOn && (
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{t('light_schedule.next_time_label')}</p>
                  <h3 className="text-2xl font-black text-paithani-saffron">{nextPowerTime}</h3>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-6 h-6 text-paithani-emerald" />
                  <h4 className="font-black text-slate-800">{isEditing ? t('light_schedule.edit_title') : t('light_schedule.today_title')}</h4>
                </div>
                {isEditing && (
                  <button onClick={addSlot} className="p-2 bg-paithani-emerald text-white rounded-lg hover:bg-emerald-700">
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              <div className="space-y-3">
                {(isEditing ? editSchedule : schedule).map((slot, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm gap-4">
                    {isEditing ? (
                      <>
                        <div className="flex items-center gap-2 flex-grow">
                          <input 
                            type="time" 
                            value={slot.start} 
                            onChange={(e) => updateSlot(idx, 'start', e.target.value)}
                            className="w-full p-2 border rounded-lg font-bold text-paithani-emerald"
                          />
                          <span className="font-bold text-slate-400">-</span>
                          <input 
                            type="time" 
                            value={slot.end} 
                            onChange={(e) => updateSlot(idx, 'end', e.target.value)}
                            className="w-full p-2 border rounded-lg font-bold text-paithani-emerald"
                          />
                        </div>
                        <button onClick={() => removeSlot(idx)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="font-bold text-slate-600">{t('light_schedule.session')} {idx + 1}</span>
                        <span className="font-black text-paithani-emerald">{slot.start} - {slot.end}</span>
                      </>
                    )}
                  </div>
                ))}
                
                {isEditing && (
                  <div className="flex gap-3 mt-6">
                    <button 
                      onClick={handleSave}
                      disabled={loading}
                      className="flex-1 py-3 bg-paithani-emerald text-white rounded-xl font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
                    >
                      <Save className="w-5 h-5" />
                      {loading ? t('light_schedule.saving') : t('light_schedule.save_button')}
                    </button>
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="px-6 py-3 bg-slate-200 text-slate-600 rounded-xl font-black flex items-center justify-center gap-2"
                    >
                      <X className="w-5 h-5" />
                      {t('light_schedule.cancel_button')}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {!isEditing && (
              <div className="bg-paithani-emerald/5 p-6 rounded-3xl border-2 border-paithani-emerald/10">
                <div className="flex items-center gap-3 mb-4">
                  <Info className="w-6 h-6 text-paithani-emerald" />
                  <h4 className="font-black text-slate-800">{t('light_schedule.advisory_title')}</h4>
                </div>
                <p className="text-slate-600 font-medium leading-relaxed">
                  {isPowerOn 
                    ? t('light_schedule.advisory_on')
                    : t('light_schedule.advisory_off', { time: nextPowerTime })}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <MapPin className="w-10 h-10 text-slate-300" />
          </div>
          <p className="text-slate-400 font-bold text-lg">{t('light_schedule.select_prompt')}</p>
        </div>
      )}
    </div>
  );
};

export default LightSchedule;
