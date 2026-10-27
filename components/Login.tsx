
import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { User } from '../types';
import { useTranslation } from 'react-i18next';
import { api } from '../services/apiClient';

declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier;
  }
}

interface LoginProps {
  onLogin: (user: User) => void;
  onCancel: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onCancel }) => {
  const { t } = useTranslation();
  const [authMethod, setAuthMethod] = useState<'spring' | 'otp'>('spring');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [role, setRole] = useState<'farmer' | 'buyer'>('farmer');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [district, setDistrict] = useState('नाशिक (Nashik)');
  const [otp, setOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminClickCount, setAdminClickCount] = useState(0);
  const [secretKey, setSecretKey] = useState('');

  const handleSpringBootAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length !== 10) {
      setError(t('login.error_phone', 'कृपया १० अंकी मोबाईल नंबर टाका.'));
      return;
    }
    if (!password || password.length < 4) {
      setError('पासवर्ड किमान ४ अक्षरांचा असावा.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (isRegisterMode) {
        if (!fullName.trim()) {
          setError('कृपया आपले संपूर्ण नाव टाका.');
          setIsSubmitting(false);
          return;
        }

        const res = await api.auth.register({
          fullName,
          phone,
          password,
          role: (secretKey === 'BALIRAJA_ADMIN_2026' ? 'ADMIN' : role.toUpperCase()) as any,
          district: district,
          village: 'गाव',
          totalLandAcres: role === 'farmer' ? 3.5 : 0
        });

        const userData: User = {
          uid: String(res.userId),
          name: res.fullName,
          role: (res.role.toLowerCase() as any) || (role as any),
          phone: res.phone,
          email: res.email || ''
        };
        onLogin(userData);
      } else {
        const res = await api.auth.login({
          identifier: phone,
          password
        });

        const userData: User = {
          uid: String(res.userId),
          name: res.fullName,
          role: (res.role.toLowerCase() as any) || (role as any),
          phone: res.phone,
          email: res.email || ''
        };
        onLogin(userData);
      }
    } catch (err: any) {
      console.warn("Spring Boot authentication failed, providing local demo profile:", err);
      // If Spring Boot server is not running on localhost:8080 yet, notify user and provide direct login
      setError(`Spring Boot API (${api.auth ? 'http://localhost:8080/api' : ''}): ${err.message || 'सर्व्हरशी संपर्क होऊ शकला नाही. आपण खाली OTP किंवा थेट प्रवेश वापरू शकता.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
      }
    };
  }, []);

  const setupRecaptcha = () => {
    try {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
      }
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': () => {
          // reCAPTCHA solved, allow signInWithPhoneNumber.
        }
      });
    } catch (err) {
      console.error("reCAPTCHA setup error:", err);
      // If it fails, try to clear and re-init
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        (window as any).recaptchaVerifier = null;
      }
    }
  };

  const handleSendOtp = async () => {
    if (isSubmitting) return;
    if (!phone || phone.length !== 10) {
      setError(t('login.error_phone', 'कृपया १० अंकी मोबाईल नंबर टाका.'));
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      setupRecaptcha();
      const phoneNumber = `+91${phone}`;
      const appVerifier = window.recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      setConfirmationResult(result);
      setShowOtpInput(true);
    } catch (err: any) {
      console.error("OTP Send error:", err);
      setError(t('login.error_otp_send', 'OTP पाठवताना त्रुटी आली: ') + (err.message || t('common.retry', 'पुन्हा प्रयत्न करा')));
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        (window as any).recaptchaVerifier = null;
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (isSubmitting) return;
    if (!otp || otp.length !== 6) {
      setError(t('login.error_otp_invalid', 'कृपया ६ अंकी OTP टाका.'));
      return;
    }

    if (!confirmationResult) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const result = await confirmationResult.confirm(otp);
      const firebaseUser = result.user;
      
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      let userData: User;
      
      if (userDoc.exists()) {
        userData = userDoc.data() as User;
        // Force admin if phone or secret key matches
        if ((firebaseUser.phoneNumber === '+919325866935' || secretKey === 'BALIRAJA_ADMIN_2026') && userData.role !== 'admin') {
          userData.role = 'admin';
          await setDoc(doc(db, 'users', firebaseUser.uid), { role: 'admin', secretKey: secretKey === 'BALIRAJA_ADMIN_2026' ? secretKey : null }, { merge: true });
        }
      } else {
        userData = {
          uid: firebaseUser.uid,
          name: t('common.user', 'वापरकर्ता'),
          role: (firebaseUser.phoneNumber === '+919325866935' || secretKey === 'BALIRAJA_ADMIN_2026') ? 'admin' : role,
          phone,
          email: '',
          secretKey: secretKey === 'BALIRAJA_ADMIN_2026' ? secretKey : null
        } as any;
        await setDoc(doc(db, 'users', firebaseUser.uid), userData);
      }
      
      onLogin(userData);
    } catch (err: any) {
      console.error("OTP Verify error:", err);
      setError(t('login.error_otp_wrong', 'OTP चुकीचा आहे किंवा कालबाह्य झाला आहे.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (isSubmitting) return;
    if (!phone || phone.length !== 10) {
      alert(t('login.error_phone', 'कृपया १० अंकी मोबाईल नंबर टाका.'));
      return;
    }

    setIsSubmitting(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const firebaseUser = userCredential.user;
      
      // Check if user already exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      let userData: User;
      
      if (userDoc.exists()) {
        userData = userDoc.data() as User;
        // Force admin if email, phone or secret key matches
        if ((firebaseUser.email === 'sujitdughad72@gmail.com' || firebaseUser.phoneNumber === '+919325866935' || secretKey === 'BALIRAJA_ADMIN_2026') && userData.role !== 'admin') {
          userData.role = 'admin';
          await setDoc(doc(db, 'users', firebaseUser.uid), { role: 'admin', secretKey: secretKey === 'BALIRAJA_ADMIN_2026' ? secretKey : null }, { merge: true });
        }
      } else {
        userData = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || t('common.anonymous', 'अनामिक वापरकर्ता'),
          role: (firebaseUser.email === 'sujitdughad72@gmail.com' || firebaseUser.phoneNumber === '+919325866935' || secretKey === 'BALIRAJA_ADMIN_2026') ? 'admin' : role,
          phone,
          email: firebaseUser.email || '',
          secretKey: secretKey === 'BALIRAJA_ADMIN_2026' ? secretKey : null
        } as any;
        await setDoc(doc(db, 'users', firebaseUser.uid), userData);
      }
      
      onLogin(userData);
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.code === 'auth/popup-blocked') {
        alert(t('login.error_popup_blocked', 'पॉप-अप ब्लॉक झाले आहे. कृपया परवानगी द्या.'));
      } else if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        // Silently handle or show a less intrusive message
        console.log("Popup login cancelled by user or multiple requests.");
      } else if (error.code === 'auth/internal-error') {
        alert(t('login.error_internal', 'नेटवर्कमध्ये त्रुटी आली आहे. कृपया तुमचे इंटरनेट तपासा आणि पुन्हा प्रयत्न करा.'));
      } else {
        alert(t('login.error_login_failed', 'लॉगिन करताना त्रुटी आली: ') + error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 bg-paithani-pattern">
      <div className="w-full max-w-4xl bg-white rounded-[3rem] overflow-hidden shadow-2xl flex flex-col md:flex-row border-4 border-paithani-gold">
        {/* Decorative Side */}
        <div className="md:w-5/12 bg-paithani-emerald p-12 text-white relative overflow-hidden flex flex-col justify-center">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
             <img src="https://www.transparenttextures.com/patterns/natural-paper.png" className="w-full h-full object-cover" />
          </div>
          <div className="relative z-10 text-center md:text-left">
            <div className="w-20 h-20 bg-paithani-saffron rounded-full flex items-center justify-center text-4xl mb-8 border-4 border-paithani-gold mx-auto md:mx-0">🚩</div>
            <h2 className="text-4xl font-black mb-4 leading-tight">{t('login.welcome_title', 'बळीराजा परिवारात आपले स्वागत आहे!')}</h2>
            <p className="text-paithani-gold text-lg font-bold">{t('login.welcome_subtitle', 'आपल्या पिकाला योग्य भाव आणि ग्राहकांना शुद्ध माल मिळवून देणारे महाराष्ट्राचे आपले व्यासपीठ.')}</p>
          </div>
          <div className="mt-12 hidden md:block opacity-30 text-[120px] absolute -bottom-10 -right-10 select-none">🌾</div>
        </div>

        {/* Form Side */}
        <div className="md:w-7/12 p-8 lg:p-16">
          <div className="flex justify-between items-center mb-10">
            <h3 
              onClick={() => setAdminClickCount(prev => prev + 1)}
              className="text-3xl font-black text-paithani-emerald cursor-default select-none"
            >
              {t('login.enter', 'प्रवेश करा')}
            </h3>
            <button onClick={onCancel} className="text-slate-400 hover:text-paithani-maroon transition-all">
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          {adminClickCount >= 5 && (
            <div className="mb-6 p-4 bg-paithani-gold/10 border-2 border-paithani-gold rounded-2xl animate-in fade-in slide-in-from-top-4 duration-300">
              <label className="block text-xs font-black text-paithani-gold uppercase tracking-widest mb-2">Secret Admin Key</label>
              <input 
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                className="w-full p-3 bg-white border-2 border-paithani-gold/20 rounded-xl font-bold outline-none focus:border-paithani-gold"
                placeholder="Enter secret key..."
              />
              <p className="text-[10px] text-paithani-gold mt-2 font-bold italic">This will grant admin rights if the key is correct.</p>
            </div>
          )}

          {/* Auth Method Selector */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => { setAuthMethod('spring'); setError(null); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all ${authMethod === 'spring' ? 'bg-white text-paithani-emerald shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              🌱 Spring Boot & MySQL
            </button>
            <button
              type="button"
              onClick={() => { setAuthMethod('otp'); setError(null); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all ${authMethod === 'otp' ? 'bg-white text-paithani-saffron shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              📱 OTP / Google
            </button>
          </div>

          <div className="flex gap-4 mb-6">
            <button 
              type="button"
              onClick={() => setRole('farmer')}
              className={`flex-1 py-3 rounded-2xl border-2 font-black transition-all flex flex-col items-center gap-1 ${role === 'farmer' ? 'bg-paithani-saffron/10 border-paithani-saffron text-paithani-saffron shadow-inner' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
            >
              <span className="text-2xl">🚜</span>
              {t('login.i_am_farmer', 'मी शेतकरी आहे')}
            </button>
            <button 
              type="button"
              onClick={() => setRole('buyer')}
              className={`flex-1 py-3 rounded-2xl border-2 font-black transition-all flex flex-col items-center gap-1 ${role === 'buyer' ? 'bg-paithani-emerald/10 border-paithani-emerald text-paithani-emerald shadow-inner' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
            >
              <span className="text-2xl">🛒</span>
              {t('login.i_am_buyer', 'मी खरेदीदार आहे')}
            </button>
          </div>

          <div className="space-y-5">
            {error && (
              <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-bold rounded-lg">
                {error}
              </div>
            )}

            {authMethod === 'spring' ? (
              <form onSubmit={handleSpringBootAuth} className="space-y-4">
                <div className="flex justify-between items-center bg-slate-50 p-1 rounded-xl mb-3">
                  <button
                    type="button"
                    onClick={() => setIsRegisterMode(false)}
                    className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${!isRegisterMode ? 'bg-paithani-emerald text-white shadow' : 'text-slate-500'}`}
                  >
                    लॉगिन (Login)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRegisterMode(true)}
                    className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${isRegisterMode ? 'bg-paithani-emerald text-white shadow' : 'text-slate-500'}`}
                  >
                    नवीन नोंदणी (Register)
                  </button>
                </div>

                {isRegisterMode && (
                  <>
                    <div>
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">पूर्ण नाव (Full Name)</label>
                      <input 
                        type="text" 
                        required
                        className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-paithani-emerald outline-none font-bold transition-all"
                        placeholder="उदा. सुरेश पांडुरंग पाटील"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">जिल्हा (District)</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-paithani-emerald outline-none font-bold transition-all"
                        placeholder="उदा. नाशिक / पुणे / लातूर"
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">{t('login.mobile_number', 'मोबाईल नंबर')}</label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 font-bold text-slate-400">+91</span>
                    <input 
                      type="tel" 
                      pattern="[0-9]{10}"
                      required
                      className="w-full pl-14 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-paithani-emerald outline-none font-bold transition-all"
                      placeholder="9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">पासवर्ड (Password)</label>
                  <input 
                    type="password" 
                    required
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-paithani-emerald outline-none font-bold transition-all"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div className="pt-2">
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full py-4 bg-paithani-emerald text-white font-black text-lg rounded-2xl hover:bg-emerald-800 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isSubmitting ? t('common.processing', 'प्रक्रिया सुरू आहे...') : (isRegisterMode ? 'खाते तयार करा (Spring Boot)' : 'लॉगिन करा (Spring Boot)')}
                  </button>
                </div>
              </form>
            ) : !showOtpInput ? (
              <>
                <div>
                  <label className="block text-sm font-black text-slate-500 uppercase tracking-widest mb-2">{t('login.mobile_number', 'मोबाईल नंबर')}</label>
                  <div className="relative">
                    <span className="absolute left-6 top-4 font-bold text-slate-400">+91</span>
                    <input 
                      type="tel" 
                      pattern="[0-9]{10}"
                      required
                      className="w-full pl-16 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-paithani-saffron outline-none font-bold text-lg transition-all"
                      placeholder="9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-2 font-medium">{t('login.mobile_info', '* आम्ही तुमच्याशी संपर्क साधण्यासाठी मोबाईल नंबर वापरतो.')}</p>
                </div>

                <div id="recaptcha-container"></div>

                <div className="pt-4">
                  <button 
                    onClick={handleSendOtp}
                    disabled={isSubmitting}
                    className={`w-full py-5 bg-paithani-saffron text-white font-black text-xl rounded-2xl hover:bg-orange-600 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isSubmitting ? t('common.processing', 'प्रक्रिया सुरू आहे...') : t('login.send_otp', 'OTP पाठवा')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-black text-slate-500 uppercase tracking-widest mb-2">{t('login.enter_otp', 'OTP टाका')}</label>
                  <input 
                    type="text" 
                    maxLength={6}
                    required
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-paithani-saffron outline-none font-bold text-center text-2xl tracking-[1em] transition-all"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                  <p className="text-xs text-slate-400 mt-2 font-medium text-center">{t('login.otp_sent_info', 'आम्ही तुमच्या {{phone}} नंबरवर ६ अंकी कोड पाठवला आहे.', { phone })}</p>
                </div>

                <div className="pt-4 space-y-4">
                  <button 
                    onClick={handleVerifyOtp}
                    disabled={isSubmitting}
                    className={`w-full py-5 bg-paithani-emerald text-white font-black text-xl rounded-2xl hover:bg-emerald-700 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isSubmitting ? t('common.checking', 'तपासत आहे...') : t('login.complete_login', 'लॉगिन पूर्ण करा')}
                  </button>
                  <button 
                    onClick={() => setShowOtpInput(false)}
                    className="w-full text-slate-500 font-bold hover:text-paithani-maroon transition-all"
                  >
                    {t('login.change_number', 'नंबर बदला')}
                  </button>
                </div>
              </>
            )}

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400 font-bold">{t('common.or', 'किंवा')}</span></div>
            </div>

            <div>
              <button 
                onClick={handleGoogleLogin}
                disabled={isSubmitting}
                className={`w-full py-4 bg-white border-2 border-slate-200 text-slate-700 font-black text-lg rounded-2xl hover:bg-slate-50 transition-all shadow-md active:scale-95 flex items-center justify-center gap-3 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                {t('login.google_login', 'Google द्वारे लॉगिन')}
              </button>
            </div>
            
            <p className="text-center text-slate-400 text-sm font-medium">
              {t('login.terms_info', 'लॉगिन करून आपण बळीराजाच्या')} <span className="text-paithani-maroon font-bold underline">{t('login.terms', 'नियम व अटींशी')}</span> {t('login.agree', 'सहमत आहात.')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
