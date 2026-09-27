
import React, { useState, useEffect } from 'react';
import { Bell, CloudRain, Zap, Droplets, Plus, Edit2, Trash2, X, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { db, auth } from '../firebase';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { User, Alert } from '../types';
import { handleFirestoreError, OperationType } from '../services/firestoreUtils';

interface AlertSystemProps {
  user?: User | null;
}

const AlertSystem: React.FC<AlertSystemProps> = ({ user }) => {
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentAlert, setCurrentAlert] = useState<Partial<Alert> | null>(null);
  const [saving, setSaving] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.email === 'sujitdughad72@gmail.com';

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'alerts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const alertsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Alert[];
      setAlerts(alertsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'alerts');
    });

    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    if (!currentAlert?.type || !currentAlert?.title || !currentAlert?.message || !currentAlert?.severity) return;
    setSaving(true);
    try {
      if (currentAlert.id) {
        const { id, ...data } = currentAlert;
        await updateDoc(doc(db, 'alerts', id), data);
      } else {
        await addDoc(collection(db, 'alerts'), {
          ...currentAlert,
          time: currentAlert.time || t('alerts.mock.power_time'), // Default time if not provided
          createdAt: serverTimestamp()
        });
      }
      setIsEditing(false);
      setCurrentAlert(null);
    } catch (error) {
      handleFirestoreError(error, currentAlert.id ? OperationType.UPDATE : OperationType.CREATE, 'alerts');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(t('alerts.admin.confirm_delete_alert'))) {
      try {
        await deleteDoc(doc(db, 'alerts', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `alerts/${id}`);
      }
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'power': return <Zap className="w-6 h-6" />;
      case 'weather': return <CloudRain className="w-6 h-6" />;
      case 'irrigation': return <Droplets className="w-6 h-6" />;
      default: return <Bell className="w-6 h-6" />;
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border-4 border-paithani-emerald overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-paithani-emerald/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
      
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-paithani-emerald rounded-2xl flex items-center justify-center text-white shadow-lg shadow-paithani-emerald/30">
            <Bell className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-paithani-emerald">{t('alerts.title')}</h2>
            <p className="text-slate-500 font-bold">{t('alerts.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <button 
              onClick={() => {
                setCurrentAlert({ type: 'power', severity: 'medium' });
                setIsEditing(true);
              }}
              className="p-3 bg-paithani-emerald/10 text-paithani-emerald rounded-xl hover:bg-paithani-emerald hover:text-white transition-all shadow-sm"
              title={t('alerts.admin.add_alert')}
            >
              <Plus className="w-6 h-6" />
            </button>
          )}
          <span className="bg-paithani-maroon text-white px-4 py-1 rounded-full text-sm font-black animate-pulse">
            {t('alerts.new_tag', { count: alerts.length })}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {alerts.length === 0 ? (
          <div className="text-center py-10 text-slate-400 font-bold italic">
            {t('alerts.no_alerts', { defaultValue: 'No active alerts' })}
          </div>
        ) : (
          alerts.map((alert) => (
            <div 
              key={alert.id} 
              className={`flex gap-4 p-6 rounded-3xl border-2 transition-all hover:scale-[1.01] bg-white shadow-sm border-slate-100 group relative`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                alert.type === 'power' ? 'bg-emerald-100 text-emerald-600' : 
                alert.type === 'weather' ? 'bg-blue-100 text-blue-600' : 
                'bg-paithani-saffron/10 text-paithani-saffron'
              }`}>
                {getIcon(alert.type)}
              </div>
              <div className="flex-grow">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-black text-slate-800 text-lg">{alert.title}</h4>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{alert.time}</span>
                    {isAdmin && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setCurrentAlert(alert);
                            setIsEditing(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-paithani-emerald hover:bg-paithani-emerald/10 rounded-lg transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(alert.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-slate-600 font-medium leading-relaxed">{alert.message}</p>
                
                <div className="mt-3 flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    alert.severity === 'high' ? 'bg-red-100 text-red-600' : 
                    alert.severity === 'medium' ? 'bg-orange-100 text-orange-600' : 
                    'bg-emerald-100 text-emerald-600'
                  }`}>
                    {t(`alerts.severity.${alert.severity}`)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Admin Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl border-4 border-paithani-emerald animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-paithani-emerald">
                {currentAlert?.id ? t('alerts.admin.edit_alert') : t('alerts.admin.add_alert')}
              </h3>
              <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{t('alerts.admin.alert_type')}</label>
                  <select 
                    value={currentAlert?.type}
                    onChange={(e) => setCurrentAlert({ ...currentAlert, type: e.target.value as any })}
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-paithani-emerald transition-all"
                  >
                    <option value="power">Power</option>
                    <option value="weather">Weather</option>
                    <option value="irrigation">Irrigation</option>
                    <option value="market">Market</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{t('alerts.admin.alert_severity')}</label>
                  <select 
                    value={currentAlert?.severity}
                    onChange={(e) => setCurrentAlert({ ...currentAlert, severity: e.target.value as any })}
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-paithani-emerald transition-all"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{t('alerts.admin.alert_title')}</label>
                <input 
                  type="text"
                  value={currentAlert?.title || ''}
                  onChange={(e) => setCurrentAlert({ ...currentAlert, title: e.target.value })}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-paithani-emerald transition-all"
                  placeholder="e.g. Heavy Rain Alert"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{t('alerts.admin.alert_message')}</label>
                <textarea 
                  value={currentAlert?.message || ''}
                  onChange={(e) => setCurrentAlert({ ...currentAlert, message: e.target.value })}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-paithani-emerald transition-all h-32 resize-none"
                  placeholder="Enter detailed message..."
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{t('alerts.admin.alert_time')}</label>
                <input 
                  type="text"
                  value={currentAlert?.time || ''}
                  onChange={(e) => setCurrentAlert({ ...currentAlert, time: e.target.value })}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-paithani-emerald transition-all"
                  placeholder="e.g. Just now, 10 min ago"
                />
              </div>

              <button 
                onClick={handleSave}
                disabled={saving}
                className="w-full py-5 bg-paithani-emerald text-white font-black text-xl rounded-2xl shadow-xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Save className="w-6 h-6" />
                    {t('alerts.admin.save_alert')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertSystem;
