/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { Button } from './common/Button';
import { Activity, Mail, Sparkles, AlertCircle, CheckCircle, RefreshCw, KeyRound, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function AuthGateway() {
  const sendOtpCode = useAppStore((state) => state.sendOtpCode);
  const verifyOtp = useAppStore((state) => state.verifyOtp);
  const signInWithGoogle = useAppStore((state) => state.signInWithGoogle);

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('يرجى كتابة البريد الإلكتروني الخاص بك أولاً.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const res = await sendOtpCode(email.trim());
    setLoading(false);

    if (res.success) {
      setSuccess(res.message);
      setStep('code');
    } else {
      setError(res.message);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('يرجى إدخال كود التحقق المكون من 6 أرقام.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const res = await verifyOtp(email.trim(), code.trim());
    setLoading(false);

    if (res.success) {
      setSuccess(res.message);
      // Store state listeners on session will auto login, no further actions needed!
    } else {
      setError(res.message);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    const res = await signInWithGoogle();
    if (!res.success) {
      setError(res.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100 font-sans select-none overflow-hidden">
      <div className="w-full max-w-[430px] bg-slate-900 border border-slate-800 rounded-[36px] shadow-2xl p-8 flex flex-col space-y-8 text-right relative overflow-hidden" dir="rtl">
        
        {/* Decorative ambient glowing ring */}
        <div className="absolute -top-16 -left-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Brand Header */}
        <div className="text-center space-y-4">
          <div className="relative w-23 h-23 mx-auto flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 rounded-full shadow-[0_4px_24px_rgba(16,185,129,0.1)]">
            <Activity className="w-9 h-9 text-emerald-400" />
            <Sparkles className="absolute top-1 right-1 w-4 h-4 text-emerald-300 animate-pulse" />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-black text-slate-100 tracking-wide">سكرك مظبوط</h1>
            <p className="text-xs text-slate-400">مساعد السكري السحابي الآمن والمنظم في سوريا</p>
          </div>
        </div>

        {/* Info alerts */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              key="err"
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }}
              className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-300 text-xs text-right"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
              <span>{error}</span>
            </motion.div>
          )}

          {success && (
            <motion.div 
              key="succ"
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }}
              className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-3 text-emerald-300 text-xs text-right"
            >
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
              <div className="space-y-1">
                <p className="font-bold">الحالة:</p>
                <p className="leading-relaxed">{success}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Steps Logic */}
        <AnimatePresence mode="wait">
          {step === 'email' ? (
            <motion.form 
              key="step-email"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              onSubmit={handleSendOtp} 
              className="space-y-5"
            >
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300 mr-1">البريد الإلكتروني الخاص بك</label>
                <div className="relative">
                  <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="email"
                    required
                    disabled={loading}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-2xl py-3.5 pr-12 pl-4 text-sm text-slate-100 placeholder-slate-600 font-sans focus:outline-none transition duration-200 text-right"
                    placeholder="your.email@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="emerald"
                className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-sm transition-all"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    جاري الإرسال...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    أرسل كود التحقق السري ⚡
                  </span>
                )}
              </Button>
            </motion.form>
          ) : (
            <motion.form 
              key="step-code"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              onSubmit={handleVerifyOtp} 
              className="space-y-5"
            >
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <button 
                    type="button" 
                    onClick={() => { setStep('email'); setError(null); setSuccess(null); }}
                    className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 focus:outline-none"
                  >
                    تعديل البريد <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                  </button>
                  <label className="block text-xs font-bold text-slate-300">أدخل كود التحقق (6 أرقام)</label>
                </div>
                <div className="relative">
                  <KeyRound className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    required
                    pattern="[0-9]*"
                    maxLength={6}
                    disabled={loading}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-2xl py-3.5 pr-12 pl-4 text-center text-lg tracking-[8px] text-slate-100 placeholder-slate-700 font-mono focus:outline-none transition duration-200"
                    placeholder="******"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="emerald"
                className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-sm transition-all"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    جاري التحقق...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    تأكيد وتسجيل الدخول 🔑
                  </span>
                )}
              </Button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-800"></div>
          <span className="flex-shrink mx-4 text-[10px] uppercase font-bold text-slate-600 tracking-wider">أو المتابعة باستخدام</span>
          <div className="flex-grow border-t border-slate-800"></div>
        </div>

        {/* OAuth Google trigger */}
        <Button
          type="button"
          variant="slate"
          onClick={handleGoogleSignIn}
          className="w-full py-3.5 rounded-2xl border border-slate-800 hover:bg-slate-800/50 flex items-center justify-center gap-3 text-slate-200 text-sm transition-all"
          disabled={loading}
        >
          {/* Circular clean vector google logo */}
          <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24" width="24" height="24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.87-2.6-2.87-4.53-6.19-4.53z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
          </svg>
          المتابعة بحساب Google
        </Button>

        <div className="text-center">
          <p className="text-[10px] text-slate-500 leading-relaxed">
            بياناتك الصحية مشفرة بالكامل محلياً وعلى سحابة Supabase تزامناً مع إرشادات الخصوصية الصارمة.
          </p>
        </div>

      </div>
    </div>
  );
}
