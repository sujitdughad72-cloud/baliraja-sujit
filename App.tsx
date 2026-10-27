
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Navbar from './components/Navbar';
import MarketTicker from './components/MarketTicker';
import Marketplace from './components/Marketplace';
import FarmerDashboard from './components/FarmerDashboard';
import AiAssistant from './components/AiAssistant';
import OrderHistory from './components/OrderHistory';
import Hero from './components/Hero';
import Login from './components/Login';
import Cart from './components/Cart';
import BottomNav from './components/BottomNav';
import LightSchedule from './components/LightSchedule';
import AlertSystem from './components/AlertSystem';
import AdminDashboard from './components/AdminDashboard';
import SmartCropInsights from './components/SmartCropInsights';
import MandiRates from './components/MandiRates';
import Chat from './components/Chat';
import { WeatherWidget } from './components/WeatherWidget';
import UserProfile from './components/UserProfile';
import SoilSensorDashboard from './components/SoilSensorDashboard';
import { Product, User } from './types';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, onSnapshot, setDoc, serverTimestamp, deleteDoc, query, orderBy, where, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';

import { handleFirestoreError, OperationType } from './services/firestoreUtils';
import { getOrCreateChat } from './src/services/chatService';
import { api } from './services/apiClient';

const App: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'home' | 'buy' | 'sell' | 'ai' | 'services' | 'admin' | 'insights' | 'profile' | 'mandi' | 'chat' | 'sensors'>('home');
  const [user, setUser] = useState<User | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<{product: Product, quantity: number}[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [settings, setSettings] = useState({ enableOnlinePayment: true });
  const [loading, setLoading] = useState(true);
  const [devClickCount, setDevClickCount] = useState(0);

  const handleDevBypass = () => {
    setDevClickCount(prev => {
      const next = prev + 1;
      if (next >= 5) {
        const mockUser: User = {
          uid: 'dev-bypass-uid',
          name: 'Developer Admin',
          role: 'admin',
          email: 'sujitdughad72@gmail.com',
          phone: '9325866935'
        };
        setUser(mockUser);
        setActiveTab('admin');
        alert('Developer Bypass Activated: Logged in as Admin (Mock Session)');
        return 0;
      }
      return next;
    });
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          let userData: User;
          if (userDoc.exists()) {
            userData = userDoc.data() as User;
            // Force admin role for developer email if not already set
            if (firebaseUser.email === 'sujitdughad72@gmail.com' && userData.role !== 'admin') {
              userData.role = 'admin';
              await setDoc(userDocRef, { ...userData, role: 'admin' }, { merge: true });
            }
          } else {
            // Create user if doesn't exist (e.g. first time login)
            userData = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || t('auth.default_name', { defaultValue: 'शेतकरी मित्र' }),
              role: firebaseUser.email === 'sujitdughad72@gmail.com' ? 'admin' : 'buyer',
              email: firebaseUser.email || '',
              phone: firebaseUser.phoneNumber || ''
            };
            await setDoc(userDocRef, userData);
          }
          setUser(userData);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Auth state change error:", error);
        handleFirestoreError(error, OperationType.GET, `users/${firebaseUser?.uid}`);
      }
      setLoading(false);
    });

    const unsubscribeProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      
      // Initialize with mock data if empty
      if (productsData.length === 0 && !loading) {
        const mockProducts: Omit<Product, 'id'>[] = [
          {
            name: 'Nashik Red Onions',
            category: 'Vegetables',
            price: 2450,
            unit: 'Quintal',
            description: 'Grade A quality red onions from Nashik. Well-dried and sorted.',
            image: 'https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&q=80&w=400',
            location: 'Nashik',
            farmerName: 'Suresh Patil',
            farmerUid: 'mock-farmer-1'
          },
          {
            name: 'Organic Soybean',
            category: 'Grains',
            price: 4680,
            unit: 'Quintal',
            description: 'High protein soybean, non-GMO, organic certified.',
            image: 'https://images.unsplash.com/photo-1594489428504-5c0c480a15fd?auto=format&fit=crop&q=80&w=400',
            location: 'Latur',
            farmerName: 'Rahul Deshmukh',
            farmerUid: 'mock-farmer-2'
          },
          {
            name: 'Premium Cotton',
            category: 'Grains',
            price: 7200,
            unit: 'Quintal',
            description: 'Long staple cotton, clean and high quality.',
            image: 'https://images.unsplash.com/photo-1594904351111-a072f80b1a71?auto=format&fit=crop&q=80&w=400',
            location: 'Akola',
            farmerName: 'Ganesh Pawar',
            farmerUid: 'mock-farmer-3'
          },
          {
            name: 'Alphonso Mangoes',
            category: 'Fruits',
            price: 1200,
            unit: 'Dozen',
            description: 'Original Ratnagiri Hapus. Naturally ripened.',
            image: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&q=80&w=400',
            location: 'Ratnagiri',
            farmerName: 'Vinayak Kadam',
            farmerUid: 'mock-farmer-4'
          }
        ];

        mockProducts.forEach(async (p) => {
          const ref = doc(collection(db, 'products'));
          await setDoc(ref, { ...p, id: ref.id, createdAt: serverTimestamp() });
        });
      }
      
      setProducts(productsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'global'), (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.data() as any);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/global');
    });

    return () => {
      unsubscribeAuth();
      unsubscribeProducts();
      unsubscribeSettings();
    };
  }, [t]);

  // Update lastSeen for active users
  useEffect(() => {
    if (!user || user.uid === 'dev-bypass-uid') return;

    const updatePresence = async () => {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          lastSeen: serverTimestamp()
        });
      } catch (e) {
        // Silent fail for presence updates
      }
    };

    updatePresence();
    const interval = setInterval(updatePresence, 120000); // Every 2 minutes

    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setOrders([]);
      return;
    }

    let ordersQuery;
    if (user.role === 'admin') {
      ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    } else if (user.role === 'farmer') {
      ordersQuery = query(collection(db, 'orders'), where('farmerUids', 'array-contains', user.uid), orderBy('createdAt', 'desc'));
    } else {
      ordersQuery = query(collection(db, 'orders'), where('buyerUid', '==', user.uid), orderBy('createdAt', 'desc'));
    }

    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as any));
      setOrders(ordersData);
    }, (error) => {
      // For non-admin users, if the query fails, it might be due to missing index or permissions.
      // We handle it gracefully.
      console.error("Orders subscription error:", error);
      // handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    return () => unsubscribeOrders();
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setActiveTab('home');
    setCart([]);
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const addProduct = async (newProduct: Omit<Product, 'id' | 'farmerName' | 'farmerUid'>) => {
    if (!user) return;
    const productRef = doc(collection(db, 'products'));
    const productData = {
      id: productRef.id,
      ...newProduct,
      farmerName: user.name,
      farmerUid: user.uid,
      image: newProduct.image || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=400',
      createdAt: serverTimestamp()
    };
    try {
      await setDoc(productRef, productData);
      // Synchronize with Spring Boot backend API
      try {
        const farmerId = Number(user.uid) || 1;
        await api.products.create(farmerId, {
          name: newProduct.name,
          nameMr: newProduct.name,
          categoryId: 1,
          description: newProduct.description,
          pricePerUnit: newProduct.price,
          unit: newProduct.unit,
          stockQuantity: 100,
          location: newProduct.location,
          imageUrl: productData.image
        });
      } catch (springErr) {
        console.info("Spring Boot backend offline; product stored in Firestore/local state:", springErr);
      }
      toast.success(t('farmer.modal.success_add'));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'products');
      toast.error('Failed to add product');
    }
  };

  const deleteProduct = async (productId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'products', productId));
      try {
        const numericId = Number(productId);
        if (!isNaN(numericId)) {
          await api.products.delete(numericId);
        }
      } catch (springErr) {
        console.info("Spring Boot delete skipped or backend offline:", springErr);
      }
      toast.success(t('farmer.modal.success_delete'));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${productId}`);
      toast.error('Failed to delete product');
    }
  };

  const handleMessageFarmer = async (farmerUid: string, farmerName: string) => {
    if (!user) {
      setShowLogin(true);
      return;
    }
    if (user.uid === farmerUid) {
      toast.error("You cannot message yourself");
      return;
    }
    try {
      await getOrCreateChat(farmerUid, farmerName);
      setActiveTab('chat');
    } catch (error) {
      console.error("Failed to initiate chat:", error);
      toast.error("Failed to start conversation");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFBF2]">
        <div className="text-2xl font-bold text-paithani-emerald animate-pulse">{t('common.loading')}</div>
      </div>
    );
  }

  const renderContent = () => {
    if (showLogin) {
      return (
        <Login 
          onLogin={(userData) => {
            setUser(userData);
            setShowLogin(false);
            setActiveTab(userData.role === 'farmer' ? 'sell' : 'buy');
          }} 
          onCancel={() => setShowLogin(false)} 
        />
      );
    }

    switch (activeTab) {
      case 'home':
        return (
          <Hero 
            onExplore={() => setActiveTab('buy')} 
            onSell={() => setActiveTab('sell')} 
            onAdmin={() => setActiveTab('admin')} 
            onSensors={() => setActiveTab('sensors')}
            onAi={() => setActiveTab('ai')}
            user={user} 
          />
        );
      case 'buy':
        return <Marketplace products={products} onAddToCart={addToCart} onMessageFarmer={handleMessageFarmer} />;
      case 'mandi':
        return <MandiRates />;
      case 'chat':
        return user ? (
          <Chat />
        ) : (
          <div className="p-20 text-center">
            <h2 className="text-2xl font-bold mb-4">{t('auth.please_login')}</h2>
            <button onClick={() => setShowLogin(true)} className="px-8 py-3 bg-paithani-saffron text-white rounded-xl font-bold shadow-lg">{t('auth.login')}</button>
          </div>
        );
      case 'sell':
        return (user?.role === 'farmer' || user?.role === 'admin') ? (
          <FarmerDashboard 
            products={products.filter(p => p.farmerUid === user.uid)} 
            orders={orders.filter(o => o.farmerUids?.includes(user.uid))}
            onAddProduct={addProduct} 
            onDeleteProduct={deleteProduct}
            user={user}
          />
        ) : (
          <div className="p-20 text-center">
            <h2 className="text-2xl font-bold mb-4">{t('auth.please_login_farmer')}</h2>
            <button onClick={() => setShowLogin(true)} className="px-8 py-3 bg-paithani-saffron text-white rounded-xl font-bold shadow-lg">{t('auth.login')}</button>
          </div>
        );
      case 'ai':
        return <AiAssistant />;
      case 'insights':
        return <SmartCropInsights user={user} />;
      case 'sensors':
        return <SoilSensorDashboard onNavigateToCropPlan={(crop) => setActiveTab('ai')} />;
      case 'profile':
        return user ? (
          <UserProfile user={user} onLogout={handleLogout} products={products} />
        ) : (
          <div className="p-20 text-center">
            <h2 className="text-2xl font-bold mb-4">{t('auth.please_login')}</h2>
            <button onClick={() => setShowLogin(true)} className="px-8 py-3 bg-paithani-saffron text-white rounded-xl font-bold shadow-lg">{t('auth.login')}</button>
          </div>
        );
      case 'services':
        return (
          <div className="max-w-7xl mx-auto px-4 py-12 space-y-12">
            <WeatherWidget user={user} />
            <AlertSystem user={user} />
            <LightSchedule user={user} />
          </div>
        );
      case 'admin':
        return (user?.role === 'admin' || user?.email === 'sujitdughad72@gmail.com') ? (
          <AdminDashboard currentUser={user!} />
        ) : (
          <div className="p-20 text-center">
            <h2 className="text-2xl font-bold mb-4">{t('auth.admin_only')}</h2>
            <button onClick={() => setActiveTab('home')} className="px-8 py-3 bg-paithani-saffron text-white rounded-xl font-bold">{t('common.go_home')}</button>
          </div>
        );
      default:
        return <Hero onExplore={() => setActiveTab('buy')} onSell={() => setActiveTab('sell')} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      <Navbar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        user={user} 
        onLoginClick={() => setShowLogin(true)} 
        onLogout={handleLogout}
        cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        onCartClick={() => setIsCartOpen(true)}
      />
      <MarketTicker />
      <main className="flex-grow pb-20 lg:pb-0">
        {renderContent()}
      </main>
      <footer className="bg-emerald-900 text-emerald-100 py-12 px-6 mb-16 lg:mb-0">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div>
            <h3 className="text-2xl font-bold text-white mb-4 italic">{t('brand')}</h3>
            <p className="text-emerald-300">{t('common.footer_description')}</p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4">{t('common.footer_links')}</h4>
            <ul className="space-y-2">
              <li><button onClick={() => setActiveTab('home')} className="hover:text-white">{t('nav.home')}</button></li>
              <li><button onClick={() => setActiveTab('buy')} className="hover:text-white">{t('nav.buy')}</button></li>
              <li><button onClick={() => setActiveTab('sell')} className="hover:text-white">{t('nav.sell')}</button></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4">{t('common.footer_info')}</h4>
            <p className="text-emerald-300">{t('common.footer_info_desc')}</p>
          </div>
        </div>
        <div 
          onClick={handleDevBypass}
          className="border-t border-emerald-800 mt-12 pt-8 text-center text-sm cursor-default select-none"
        >
          © २०२४ {t('brand')} मार्केटप्लेस. {t('common.all_rights_reserved')}
        </div>
      </footer>

      <Cart 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        items={cart} 
        onRemove={removeFromCart}
        onClear={() => setCart([])}
        enableOnlinePayment={settings.enableOnlinePayment}
        user={user}
      />
      
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} user={user} />
    </div>
  );
};

export default App;
