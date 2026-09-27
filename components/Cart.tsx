
import React, { useState } from 'react';
import { Product, User } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, ShoppingBag, X, Trash2, ArrowRight, Loader2, CreditCard, Smartphone, AlertCircle } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../services/firestoreUtils';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  items: { product: Product, quantity: number }[];
  onRemove: (productId: string) => void;
  onClear: () => void;
  enableOnlinePayment?: boolean;
  user: User | null;
}

const Cart: React.FC<CartProps> = ({ isOpen, onClose, items, onRemove, onClear, enableOnlinePayment = true, user }) => {
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false);
  const [showOnlineOptions, setShowOnlineOptions] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<{method: 'online' | 'cod', subMethod?: string} | null>(null);
  const total = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  const handleCheckout = () => {
    setShowPaymentConfirm(true);
  };

  const initiateOrder = (method: 'online' | 'cod', subMethod?: string) => {
    setPendingOrder({ method, subMethod });
    setShowFinalConfirm(true);
  };

  const confirmPayment = async () => {
    if (!user || !pendingOrder) {
      alert('कृपया ऑर्डर देण्यासाठी लॉगिन करा.');
      return;
    }

    const { method, subMethod } = pendingOrder;
    setIsProcessing(true);
    setShowFinalConfirm(false);
    try {
      // Simulate payment gateway delay for online payment
      if (method === 'online') {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      const farmerUids = Array.from(new Set(items.map(item => item.product.farmerUid)));
      
      const orderData = {
        buyerUid: user.uid,
        buyerName: user.name,
        items: items.map(item => ({
          productId: item.product.id,
          name: item.product.name,
          price: item.product.price,
          quantity: item.quantity,
          unit: item.product.unit,
          farmerUid: item.product.farmerUid,
          farmerName: item.product.farmerName,
          image: item.product.image
        })),
        total,
        status: 'pending',
        paymentMethod: method,
        onlinePaymentType: subMethod || null,
        farmerUids,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'orders'), orderData);
      
      setIsSuccess(true);
      setShowPaymentConfirm(false);
      setShowOnlineOptions(false);
      setTimeout(() => {
        onClear();
        setIsSuccess(false);
        onClose();
      }, 4000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'orders');
      alert('ऑर्डर देताना त्रुटी आली. कृपया पुन्हा प्रयत्न करा.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
        onClick={onClose}
      ></motion.div>
      
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="absolute right-0 top-0 h-full w-full max-w-md bg-[#FFFBF2] shadow-2xl flex flex-col"
      >
        <div className="p-6 paithani-pattern text-white flex justify-between items-center border-b-4 border-paithani-gold relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-paithani-saffron/20 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <h2 className="text-2xl font-black flex items-center gap-3 relative z-10">
            <ShoppingBag size={24} /> तुमची बॅग ({items.length})
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full relative z-10 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-6 space-y-6 relative">
          <AnimatePresence mode="wait">
            {isSuccess ? (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="h-full flex flex-col items-center justify-center text-center space-y-6"
              >
                <div className="w-32 h-32 bg-emerald-100 rounded-[3rem] flex items-center justify-center text-paithani-emerald shadow-inner relative">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                  >
                    <CheckCircle size={64} strokeWidth={3} />
                  </motion.div>
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 bg-paithani-emerald/20 rounded-[3rem]"
                  ></motion.div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-3xl font-black text-slate-900 tracking-tighter">ऑर्डर यशस्वी!</h3>
                  <p className="text-slate-500 font-bold">तुमची ऑर्डर शेतकऱ्याकडे पाठवली आहे. लवकरच संपर्क केला जाईल.</p>
                </div>
                <div className="w-full p-6 bg-white rounded-3xl border-2 border-slate-100 space-y-3">
                  <div className="flex justify-between text-sm font-bold text-slate-400 uppercase tracking-widest">
                    <span>ऑर्डर आयडी</span>
                    <span className="text-slate-800">#BR-{Math.floor(Math.random() * 10000)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-slate-400 uppercase tracking-widest">
                    <span>एकूण रक्कम</span>
                    <span className="text-paithani-emerald">₹{total}</span>
                  </div>
                </div>
              </motion.div>
            ) : showOnlineOptions ? (
              <motion.div
                key="online-options"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="h-full flex flex-col justify-center space-y-8"
              >
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-paithani-emerald/20 rounded-full flex items-center justify-center text-paithani-emerald mx-auto">
                    <Smartphone size={40} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900">ऑनलाईन पेमेंट निवडा</h3>
                  <p className="text-slate-500 font-bold">तुमच्या पसंतीचे अ‍ॅप निवडा</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <button 
                    onClick={() => initiateOrder('online', 'Google Pay')}
                    disabled={isProcessing}
                    className="p-6 bg-white border-2 border-slate-100 rounded-3xl flex items-center gap-4 hover:border-paithani-emerald transition-all group disabled:opacity-50"
                  >
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                      {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Smartphone size={24} />}
                    </div>
                    <div className="text-left">
                      <p className="font-black text-slate-800">Google Pay (GPay)</p>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">थेट बँक खात्यातून</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => initiateOrder('online', 'PhonePe')}
                    disabled={isProcessing}
                    className="p-6 bg-white border-2 border-slate-100 rounded-3xl flex items-center gap-4 hover:border-paithani-emerald transition-all group disabled:opacity-50"
                  >
                    <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                      {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Smartphone size={24} />}
                    </div>
                    <div className="text-left">
                      <p className="font-black text-slate-800">PhonePe</p>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">UPI द्वारे पेमेंट</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => initiateOrder('online', 'Card')}
                    disabled={isProcessing}
                    className="p-6 bg-white border-2 border-slate-100 rounded-3xl flex items-center gap-4 hover:border-paithani-emerald transition-all group disabled:opacity-50"
                  >
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-600 group-hover:scale-110 transition-transform">
                      {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <CreditCard size={24} />}
                    </div>
                    <div className="text-left">
                      <p className="font-black text-slate-800">डेबिट / क्रेडिट कार्ड</p>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Visa, Mastercard, RuPay</p>
                    </div>
                  </button>
                </div>

                <button 
                  onClick={() => setShowOnlineOptions(false)}
                  className="text-slate-400 font-bold hover:text-paithani-maroon transition-all text-center"
                >
                  मागे जा
                </button>
              </motion.div>
            ) : showPaymentConfirm ? (
              <motion.div
                key="payment"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="h-full flex flex-col justify-center space-y-8"
              >
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-paithani-gold/20 rounded-full flex items-center justify-center text-paithani-gold mx-auto">
                    <CheckCircle size={40} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900">पेमेंट पर्याय निवडा</h3>
                  <p className="text-slate-500 font-bold">तुम्ही ₹{total} ची ऑर्डर देत आहात. पेमेंट करायचे आहे का?</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {enableOnlinePayment && (
                    <button 
                      onClick={() => setShowOnlineOptions(true)}
                      disabled={isProcessing}
                      className="p-6 bg-white border-2 border-paithani-emerald rounded-3xl flex items-center gap-4 hover:bg-paithani-emerald/5 transition-all group disabled:opacity-50"
                    >
                      <div className="w-12 h-12 bg-paithani-emerald/10 rounded-2xl flex items-center justify-center text-paithani-emerald group-hover:scale-110 transition-transform">
                        {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <ArrowRight size={24} />}
                      </div>
                      <div className="text-left">
                        <p className="font-black text-paithani-emerald">हो, ऑनलाईन पेमेंट करा</p>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">UPI (GPay, PhonePe), कार्ड</p>
                      </div>
                    </button>
                  )}

                  <button 
                    onClick={() => initiateOrder('cod')}
                    disabled={isProcessing}
                    className={`p-6 bg-white border-2 border-paithani-saffron rounded-3xl flex items-center gap-4 hover:bg-paithani-saffron/5 transition-all group disabled:opacity-50 ${!enableOnlinePayment ? 'border-paithani-emerald bg-paithani-emerald/5' : ''}`}
                  >
                    <div className="w-12 h-12 bg-paithani-saffron/10 rounded-2xl flex items-center justify-center text-paithani-saffron group-hover:scale-110 transition-transform">
                      {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <ShoppingBag size={24} />}
                    </div>
                    <div className="text-left">
                      <p className="font-black text-paithani-saffron">{!enableOnlinePayment ? 'ऑर्डर निश्चित करा' : 'नाही, कॅश ऑन डिलिव्हरी'}</p>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">माल मिळाल्यावर पैसे द्या</p>
                    </div>
                  </button>
                </div>

                <button 
                  onClick={() => setShowPaymentConfirm(false)}
                  className="text-slate-400 font-bold hover:text-paithani-maroon transition-all text-center"
                >
                  मागे जा
                </button>
              </motion.div>
            ) : items.length > 0 ? (
              <motion.div 
                key="items"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                {items.map((item, idx) => (
                  <motion.div 
                    key={item.product.id} 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-white p-4 rounded-3xl border-2 border-slate-100 flex gap-4 shadow-sm relative group hover:border-paithani-emerald transition-all"
                  >
                    <img src={item.product.image} className="w-20 h-20 object-cover rounded-2xl border border-slate-200" alt={item.product.name} />
                    <div className="flex-grow">
                      <h4 className="font-black text-paithani-emerald text-lg">{item.product.name}</h4>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">मात्रा: {item.quantity} {item.product.unit}</p>
                      <p className="text-xl font-black text-paithani-saffron mt-1">₹{item.product.price * item.quantity}</p>
                    </div>
                    <button 
                      onClick={() => onRemove(item.product.id)}
                      className="p-2 text-slate-300 hover:text-paithani-maroon hover:bg-red-50 rounded-xl transition-all self-start"
                    >
                      <Trash2 size={18} />
                    </button>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20 space-y-6"
              >
                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mx-auto">
                  <ShoppingBag size={48} />
                </div>
                <div className="space-y-2">
                  <p className="text-2xl font-black text-slate-800 tracking-tighter">तुमची बॅग रिकामी आहे.</p>
                  <p className="text-slate-400 font-bold">खरेदी सुरू करण्यासाठी खालील बटण दाबा.</p>
                </div>
                <button 
                  onClick={onClose}
                  className="px-8 py-3 bg-paithani-emerald text-white font-black rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all"
                >
                  खरेदी सुरू करा
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {items.length > 0 && !isSuccess && !showPaymentConfirm && (
          <div className="p-8 bg-white border-t-4 border-paithani-gold shadow-[0_-10px_30px_rgba(0,0,0,0.05)] space-y-6">
            <div className="flex justify-between items-center">
              <span className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">एकूण देय (Total):</span>
              <span className="text-4xl font-black text-paithani-emerald">₹{total}</span>
            </div>
            <button 
              onClick={handleCheckout}
              className="w-full py-5 bg-paithani-emerald text-white font-black text-xl rounded-2xl shadow-xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-3 group"
            >
              ✅ ऑर्डर बुक करा
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              <CheckCircle size={12} /> सुरक्षित आणि थेट शेतकऱ्यांकडून डिलिव्हरी
            </div>
          </div>
        )}

        {/* Final Confirmation Modal */}
        <AnimatePresence>
          {showFinalConfirm && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                onClick={() => setShowFinalConfirm(false)}
              ></motion.div>
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative z-10 border-2 border-paithani-gold"
              >
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 bg-paithani-maroon/10 rounded-full flex items-center justify-center text-paithani-maroon mx-auto">
                    <AlertCircle size={40} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter">ऑर्डर निश्चित करा?</h3>
                    <p className="text-slate-500 font-bold">तुम्ही ₹{total} ची ऑर्डर देत आहात. तुम्ही खात्री बाळगता का?</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setShowFinalConfirm(false)}
                      className="py-4 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-all"
                    >
                      रद्द करा
                    </button>
                    <button 
                      onClick={confirmPayment}
                      className="py-4 bg-paithani-emerald text-white font-black rounded-2xl shadow-lg hover:brightness-110 transition-all"
                    >
                      हो, निश्चित करा
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default Cart;
