
import React, { useState, useEffect, useMemo } from 'react';
import { Users, ShoppingBasket, Zap, ShieldCheck, Trash2, UserPlus, Search, Settings, TrendingUp, DollarSign, Activity, AlertTriangle, Database } from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, query, deleteDoc, doc, updateDoc, setDoc, orderBy, limit, writeBatch, serverTimestamp } from 'firebase/firestore';
import { User, Product } from '../types';
import { handleFirestoreError, OperationType } from '../services/firestoreUtils';
import LightSchedule from './LightSchedule';
import AlertSystem from './AlertSystem';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useTranslation } from 'react-i18next';

interface AdminDashboardProps {
  currentUser: User;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser }) => {
  const { t } = useTranslation();
  const [activePanel, setActivePanel] = useState<'analytics' | 'users' | 'products' | 'infrastructure' | 'settings'>('analytics');
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState({ enableOnlinePayment: true });
  const [searchQuery, setSearchQuery] = useState('');

  const isAdmin = currentUser?.role === 'admin' || 
                  currentUser?.email === 'sujitdughad72@gmail.com' || 
                  currentUser?.phone === '9325866935';

  const stats = useMemo(() => {
    const totalFarmers = users.filter(u => u.role === 'farmer').length;
    const totalRevenue = products.reduce((acc, p) => acc + (Number(p.price) || 0), 0);
    
    // Active now = lastSeen within last 5 minutes
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    const activeNow = users.filter(u => {
      if (!u.lastSeen) return false;
      // Handle both Firestore Timestamp and Date objects
      const lastSeenTime = (u.lastSeen as any).seconds 
        ? (u.lastSeen as any).seconds * 1000 
        : new Date(u.lastSeen as any).getTime();
      return lastSeenTime > fiveMinutesAgo;
    }).length;

    return {
      farmers: totalFarmers,
      crops: products.length,
      revenue: totalRevenue.toLocaleString('en-IN'),
      activeNow: activeNow || 1 // At least the admin is active
    };
  }, [users, products]);

  const cropData = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach(p => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [products]);

  const COLORS = ['#059669', '#F59E0B', '#991B1B', '#1E40AF', '#7C3AED'];

  useEffect(() => {
    let unsubUsers = () => {};
    let unsubProducts = () => {};

    // Only start listeners if we have a real Firebase user
    // This prevents errors when using the Developer Bypass (mock session)
    if (auth.currentUser) {
      unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
        setUsers(snapshot.docs.map(doc => doc.data() as User));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));

      unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
        setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'products'));

      onSnapshot(doc(db, 'settings', 'global'), (snapshot) => {
        if (snapshot.exists()) {
          setSettings(snapshot.data() as any);
        }
      }, (error) => handleFirestoreError(error, OperationType.GET, 'settings/global'));
    }

    return () => {
      unsubUsers();
      unsubProducts();
    };
  }, []);

  const deleteUser = async (uid: string) => {
    if (window.confirm(t('admin.confirm.delete_user'))) {
      try {
        await deleteDoc(doc(db, 'users', uid));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
      }
    }
  };

  const toggleRole = async (user: User) => {
    const newRole = user.role === 'farmer' ? 'buyer' : 'farmer';
    try {
      await updateDoc(doc(db, 'users', user.uid), { role: newRole });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const deleteProduct = async (id: string) => {
    if (window.confirm(t('admin.confirm.delete_product'))) {
      try {
        await deleteDoc(doc(db, 'products', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
      }
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.farmerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const updateSettings = async (newSettings: any) => {
    try {
      await updateDoc(doc(db, 'settings', 'global'), newSettings);
    } catch (error) {
      // If doc doesn't exist, create it
      await setDoc(doc(db, 'settings', 'global'), newSettings);
    }
  };

  const seedInitialData = async () => {
    if (!window.confirm('This will add sample products to the marketplace. Continue?')) return;
    
    const batch = writeBatch(db);
    const sampleProducts = [
      {
        name: 'Fresh Red Onions (नाशिक लाल कांदा)',
        category: 'Vegetables',
        price: 2400,
        unit: 'Quintal',
        description: 'Premium quality export grade red onions from Lasalgaon. Well-dried and sorted.',
        location: 'Lasalgaon, Nashik',
        image: 'https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&q=80&w=400',
        farmerName: 'Suresh Patil',
        farmerUid: 'seed-farmer-1'
      },
      {
        name: 'Organic Alphonso Mangoes (हापूस आंबा)',
        category: 'Fruits',
        price: 1200,
        unit: 'Dozen',
        description: 'Naturally ripened Devgad Alphonso mangoes. GI Tagged and organic certified.',
        location: 'Ratnagiri, Maharashtra',
        image: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&q=80&w=400',
        farmerName: 'Anil Deshmukh',
        farmerUid: 'seed-farmer-2'
      },
      {
        name: 'Premium Basmati Rice (बासमती तांदूळ)',
        category: 'Grains',
        price: 8500,
        unit: 'Quintal',
        description: 'Long grain aromatic basmati rice. Aged for 2 years for best flavor.',
        location: 'Bhandara, Maharashtra',
        image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=400',
        farmerName: 'Vijay Pawar',
        farmerUid: 'seed-farmer-3'
      },
      {
        name: 'Turmeric Powder (हळद पावडर)',
        category: 'Spices',
        price: 180,
        unit: 'kg',
        description: 'Pure Sangli turmeric powder with high curcumin content. No additives.',
        location: 'Sangli, Maharashtra',
        image: 'https://images.unsplash.com/photo-1615485290382-441e4d0c9cb5?auto=format&fit=crop&q=80&w=400',
        farmerName: 'Meena Tai',
        farmerUid: 'seed-farmer-4'
      }
    ];

    sampleProducts.forEach(p => {
      const ref = doc(collection(db, 'products'));
      batch.set(ref, { ...p, id: ref.id, createdAt: serverTimestamp() });
    });

    try {
      await batch.commit();
      alert('Sample data seeded successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'products');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex items-center gap-4 mb-10">
        <div className="w-16 h-16 bg-paithani-maroon rounded-2xl flex items-center justify-center text-white shadow-xl">
          <ShieldCheck className="w-10 h-10" />
        </div>
        <div>
          <h1 className="text-4xl font-black text-paithani-emerald">{t('admin.title')}</h1>
          <p className="text-slate-500 font-bold">{t('admin.subtitle')}</p>
          {!auth.currentUser && (
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-paithani-gold/20 text-paithani-gold rounded-full text-[10px] font-black uppercase tracking-widest border border-paithani-gold/30">
              <AlertTriangle className="w-3 h-3" /> {t('admin.mock_session_warning', { defaultValue: 'Mock Session (No Live Data)' })}
            </div>
          )}
        </div>
      </div>

      {/* Panel Switcher */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <button 
          onClick={() => setActivePanel('users')}
          className={`p-8 rounded-[2.5rem] border-4 transition-all flex flex-col items-center gap-4 ${activePanel === 'users' ? 'bg-paithani-emerald text-white border-paithani-gold shadow-2xl scale-105' : 'bg-white text-paithani-emerald border-slate-100 hover:border-paithani-emerald'}`}
        >
          <Users className="w-12 h-12" />
          <span className="text-xl font-black">{t('admin.panels.users')}</span>
        </button>

        <button 
          onClick={() => setActivePanel('products')}
          className={`p-8 rounded-[2.5rem] border-4 transition-all flex flex-col items-center gap-4 ${activePanel === 'products' ? 'bg-paithani-saffron text-white border-paithani-gold shadow-2xl scale-105' : 'bg-white text-paithani-saffron border-slate-100 hover:border-paithani-saffron'}`}
        >
          <ShoppingBasket className="w-12 h-12" />
          <span className="text-xl font-black">{t('admin.panels.products')}</span>
        </button>

        <button 
          onClick={() => setActivePanel('infrastructure')}
          className={`p-8 rounded-[2.5rem] border-4 transition-all flex flex-col items-center gap-4 ${activePanel === 'infrastructure' ? 'bg-paithani-maroon text-white border-paithani-gold shadow-2xl scale-105' : 'bg-white text-paithani-maroon border-slate-100 hover:border-paithani-maroon'}`}
        >
          <Zap className="w-12 h-12" />
          <span className="text-xl font-black">{t('admin.panels.infrastructure')}</span>
        </button>

        <button 
          onClick={() => setActivePanel('settings')}
          className={`p-8 rounded-[2.5rem] border-4 transition-all flex flex-col items-center gap-4 ${activePanel === 'settings' ? 'bg-paithani-gold text-white border-paithani-gold shadow-2xl scale-105' : 'bg-white text-paithani-gold border-slate-100 hover:border-paithani-gold'}`}
        >
          <Settings className="w-12 h-12" />
          <span className="text-xl font-black">{t('admin.panels.settings', { defaultValue: 'Settings' })}</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="min-h-[600px]">
        {activePanel === 'analytics' && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="glass-card p-8 bg-paithani-emerald text-white">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-white/20 rounded-2xl">
                    <Users className="w-8 h-8" />
                  </div>
                  <TrendingUp className="text-emerald-300" />
                </div>
                <p className="text-sm font-black uppercase tracking-widest opacity-60">{t('admin.stats.farmers')}</p>
                <h3 className="text-4xl font-black tracking-tighter">{stats.farmers}</h3>
              </div>

              <div className="glass-card p-8 bg-paithani-saffron text-white">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-white/20 rounded-2xl">
                    <ShoppingBasket className="w-8 h-8" />
                  </div>
                  <TrendingUp className="text-orange-200" />
                </div>
                <p className="text-sm font-black uppercase tracking-widest opacity-60">{t('admin.stats.crops')}</p>
                <h3 className="text-4xl font-black tracking-tighter">{stats.crops}</h3>
              </div>

              <div className="glass-card p-8 bg-paithani-maroon text-white">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-white/20 rounded-2xl">
                    <DollarSign className="w-8 h-8" />
                  </div>
                  <TrendingUp className="text-red-200" />
                </div>
                <p className="text-sm font-black uppercase tracking-widest opacity-60">{t('admin.stats.revenue')}</p>
                <h3 className="text-4xl font-black tracking-tighter">₹{stats.revenue}</h3>
              </div>

              <div className="glass-card p-8 bg-paithani-gold text-white">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-white/20 rounded-2xl">
                    <Activity className="w-8 h-8" />
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Live</span>
                  </div>
                </div>
                <p className="text-sm font-black uppercase tracking-widest opacity-60">{t('admin.stats.active_now', { defaultValue: 'Active Now' })}</p>
                <h3 className="text-4xl font-black tracking-tighter">{stats.activeNow}</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Chart */}
              <div className="glass-card p-8">
                <h3 className="text-xl font-black text-slate-800 mb-8">{t('admin.charts.crop_distribution')}</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={cropData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {cropData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                        itemStyle={{ fontWeight: 'bold' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {cropData.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Activities */}
              <div className="glass-card p-8">
                <h3 className="text-xl font-black text-slate-800 mb-8">{t('admin.recent_activities.title')}</h3>
                <div className="space-y-6">
                  {products.slice(0, 5).map((p, idx) => (
                    <div key={idx} className="flex items-center gap-4 pb-4 border-b border-slate-100 last:border-0">
                      <div className="w-12 h-12 rounded-xl overflow-hidden shadow-sm">
                        <img src={p.image} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-grow">
                        <p className="text-sm font-black text-slate-800">{t('admin.recent_activities.new_crop', { name: p.name })}</p>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{p.farmerName} • {p.location}</p>
                      </div>
                      <span className="text-[10px] font-black text-paithani-emerald bg-paithani-emerald/10 px-2 py-1 rounded-full uppercase">{t('admin.recent_activities.new_tag')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activePanel !== 'analytics' && activePanel !== 'infrastructure' && (
          <div className="bg-white rounded-[3rem] p-8 border-4 border-slate-100 shadow-xl">
            <div className="mb-8 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder={t('admin.search_placeholder')} 
                className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-paithani-emerald transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {activePanel === 'users' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b-2 border-slate-100">
                      <th className="pb-4 font-black text-slate-400 uppercase tracking-widest text-sm">{t('admin.table.user')}</th>
                      <th className="pb-4 font-black text-slate-400 uppercase tracking-widest text-sm">{t('admin.table.role')}</th>
                      <th className="pb-4 font-black text-slate-400 uppercase tracking-widest text-sm text-right">{t('admin.table.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredUsers.map((user) => (
                      <tr key={user.uid} className="group hover:bg-slate-50 transition-all">
                        <td className="py-6">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-paithani-emerald/10 rounded-full flex items-center justify-center text-paithani-emerald font-black text-xl">
                              {user.name[0]}
                            </div>
                            <div>
                              <p className="font-black text-slate-800">{user.name}</p>
                              <p className="text-sm text-slate-400 font-bold">{user.email || user.phone}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-6">
                          <span className={`px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest ${user.role === 'farmer' ? 'bg-emerald-100 text-emerald-600' : user.role === 'admin' ? 'bg-paithani-maroon text-white' : 'bg-blue-100 text-blue-600'}`}>
                            {user.role === 'farmer' ? t('admin.roles.farmer') : user.role === 'admin' ? t('admin.roles.admin') : t('admin.roles.buyer')}
                          </span>
                        </td>
                        <td className="py-6 text-right">
                          <div className="flex justify-end gap-2">
                            {user.role !== 'admin' && (
                              <button 
                                onClick={() => toggleRole(user)}
                                className="p-2 text-slate-400 hover:text-paithani-emerald hover:bg-paithani-emerald/10 rounded-lg transition-all"
                                title={t('admin.tooltips.change_role')}
                              >
                                <Settings className="w-5 h-5" />
                              </button>
                            )}
                            <button 
                              onClick={() => deleteUser(user.uid)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title={t('admin.tooltips.delete_user')}
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activePanel === 'products' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="flex gap-4 p-4 bg-slate-50 rounded-3xl border-2 border-slate-100 group hover:border-paithani-saffron transition-all">
                    <img src={product.image} className="w-24 h-24 rounded-2xl object-cover shadow-sm" />
                    <div className="flex-grow">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-black text-slate-800">{product.name}</h4>
                          <p className="text-xs font-bold text-paithani-saffron uppercase">{product.category}</p>
                        </div>
                        <button 
                          onClick={() => deleteProduct(product.id!)}
                          className="p-2 text-slate-400 hover:text-red-600 transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-lg font-black text-paithani-emerald">₹{product.price}/{product.unit}</p>
                        <p className="text-xs font-bold text-slate-400">{t('admin.product.farmer', { name: product.farmerName })}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activePanel === 'infrastructure' && (
          <div className="space-y-12">
            <div className="bg-paithani-maroon/5 p-8 rounded-[2.5rem] border-2 border-paithani-maroon/10">
              <h3 className="text-2xl font-black text-paithani-maroon mb-6 flex items-center gap-3">
                <Zap className="w-8 h-8" /> {t('admin.infrastructure.schedule_title')}
              </h3>
              <LightSchedule user={currentUser} />
            </div>
            
            <div className="bg-paithani-emerald/5 p-8 rounded-[2.5rem] border-2 border-paithani-emerald/10">
              <h3 className="text-2xl font-black text-paithani-emerald mb-6 flex items-center gap-3">
                <ShieldCheck className="w-8 h-8" /> {t('admin.infrastructure.alerts_title')}
              </h3>
              <AlertSystem user={currentUser} />
              <p className="mt-4 text-sm text-slate-400 font-bold italic text-center">{t('admin.infrastructure.alerts_note')}</p>
            </div>
          </div>
        )}
        {activePanel === 'settings' && (
          <div className="bg-white rounded-[3rem] p-12 border-4 border-paithani-gold shadow-xl">
            <h3 className="text-3xl font-black text-paithani-emerald mb-8 flex items-center gap-4">
              <Settings className="w-10 h-10" /> {t('admin.settings.title', { defaultValue: 'Global Settings' })}
            </h3>
            
            <div className="space-y-8">
              <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border-2 border-slate-100">
                <div>
                  <h4 className="text-xl font-black text-slate-800">Seed Sample Data</h4>
                  <p className="text-sm text-slate-500 font-bold">Populate the marketplace with realistic sample products.</p>
                </div>
                <button 
                  onClick={seedInitialData}
                  className="px-6 py-3 bg-paithani-emerald text-white rounded-xl font-black text-sm hover:brightness-110 transition-all flex items-center gap-2"
                >
                  <Database size={18} /> Seed Data
                </button>
              </div>

              <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border-2 border-slate-100">
                <div>
                  <h4 className="text-xl font-black text-slate-800">Online Payment</h4>
                  <p className="text-sm text-slate-500 font-bold">Enable/Disable online payment options for buyers.</p>
                </div>
                <button 
                  onClick={() => updateSettings({ enableOnlinePayment: !settings.enableOnlinePayment })}
                  className={`w-20 h-10 rounded-full relative transition-all ${settings.enableOnlinePayment ? 'bg-paithani-emerald' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-1 w-8 h-8 bg-white rounded-full shadow-md transition-all ${settings.enableOnlinePayment ? 'left-11' : 'left-1'}`}></div>
                </button>
              </div>

              <div className="p-8 bg-paithani-saffron/10 border-2 border-paithani-saffron/20 rounded-3xl">
                <p className="text-paithani-saffron font-black flex items-center gap-2">
                  <AlertTriangle size={20} /> Important Note
                </p>
                <p className="text-sm text-slate-600 font-bold mt-2">
                  Disabling online payment will force all orders to be Cash on Delivery (COD).
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
