import React, { useState, useEffect } from 'react';
import { Settings, Save, AlertCircle, CheckCircle, XCircle, Loader2, LogOut } from 'lucide-react';
import { GeminiService } from '../lib/gemini';

interface SettingsPageProps {
  onLogout?: () => void;
}

export default function SettingsPage({ onLogout }: SettingsPageProps) {
  const [apiKey, setApiKey] = useState('');
  const [klingApiKey, setKlingApiKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('GEMINI_API_KEY');
    if (stored) setApiKey(stored);
    const storedKling = localStorage.getItem('KLING_API_KEY');
    if (storedKling) setKlingApiKey(storedKling);
  }, []);

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem('GEMINI_API_KEY', apiKey.trim());
      localStorage.removeItem('GEMINI_IMAGE_API_KEY');
      localStorage.removeItem('GEMINI_VIDEO_API_KEY');
    } else {
      localStorage.removeItem('GEMINI_API_KEY');
    }

    if (klingApiKey.trim()) {
      localStorage.setItem('KLING_API_KEY', klingApiKey.trim());
    } else {
      localStorage.removeItem('KLING_API_KEY');
    }
      
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setTestStatus('idle');
  };

  const handleTest = async () => {
    if (apiKey.trim()) localStorage.setItem('GEMINI_API_KEY', apiKey.trim());
    
    setTestStatus('testing');
    setErrorMessage('');
    
    try {
        await GeminiService.testConnection();
        setTestStatus('success');
    } catch (error: any) {
        setTestStatus('error');
        setErrorMessage(error.message || 'فشل الاتصال. تأكد من صحة المفتاح وصلاحياته.');
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto space-y-6 pb-24">
      <header className="flex items-center gap-3 pt-2">
        <div className="w-10 h-10 bg-primary rounded-xl text-primary-foreground shadow-md shadow-primary/20 flex items-center justify-center">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">إعدادات التطبيق</h1>
          <p className="text-muted-foreground text-xs">إدارة مفاتيح الربط والاتصال</p>
        </div>
      </header>

      <div className="bg-card p-6 rounded-2xl border border-border/60 space-y-5">
        
        {/* General Key */}
        <div>
          <label className="block text-sm font-bold text-card-foreground mb-2">
            مفتاح Gemini API (Google AI Studio)
          </label>
          <div className="relative">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full p-3.5 border border-border rounded-xl focus:ring-2 focus:ring-ring/30 focus:border-primary outline-none font-mono text-sm bg-secondary/50 transition-all"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              {saved && <CheckCircle className="w-5 h-5 text-emerald-500" />}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            يستخدم هذا المفتاح لجميع خدمات التطبيق: تحليل النصوص، توليد الصور، وتوليد الفيديو.
            <br/>
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium">
              احصل على مفتاحك من هنا
            </a>
          </p>
        </div>

        {/* Kling AI Key */}
        <div className="pt-4 border-t border-border/60">
          <label className="block text-sm font-bold text-card-foreground mb-2">
            مفتاح fal.ai (Kling AI Motion Control)
          </label>
          <div className="relative">
            <input
              type="password"
              value={klingApiKey}
              onChange={(e) => setKlingApiKey(e.target.value)}
              placeholder="key:secret..."
              className="w-full p-3.5 border border-border rounded-xl focus:ring-2 focus:ring-ring/30 focus:border-primary outline-none font-mono text-sm bg-secondary/50 transition-all"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            مطلوب لميزة Motion Control (نقل الحركة). يستخدم Kling 2.6 عبر fal.ai مع دعم رفع الملفات مباشرة.
            <br/>
            <a href="https://fal.ai/dashboard/keys" target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium">
              سجل واحصل على مفتاحك من fal.ai
            </a>
            <span className="mx-1.5 text-muted-foreground/40">|</span>
            <span className="text-muted-foreground/60">Standard: $0.07/ث | Pro: $0.112/ث</span>
          </p>
        </div>

        <div className="flex gap-2.5 pt-3 border-t border-border/60">
            <button
            onClick={handleTest}
            disabled={!apiKey || testStatus === 'testing'}
            className="flex-1 py-3 bg-secondary text-secondary-foreground rounded-xl font-bold text-sm hover:bg-muted transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
            {testStatus === 'testing' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            <span>فحص الاتصال</span>
            </button>

            <button
            onClick={handleSave}
            className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-md shadow-primary/20"
            >
            <Save className="w-4 h-4" />
            <span>حفظ التغييرات</span>
            </button>
        </div>

        {testStatus === 'success' && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-4 rounded-xl text-sm flex items-center gap-3">
                <div className="p-1.5 bg-emerald-100 rounded-full">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-sm">الاتصال ناجح!</p>
                  <p className="text-xs opacity-80 mt-0.5">المفتاح يعمل بشكل صحيح مع خدمات Google AI.</p>
                </div>
            </div>
        )}

        {testStatus === 'error' && (
            <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-xl text-sm flex items-start gap-3">
                <div className="p-1.5 bg-red-100 rounded-full mt-0.5">
                  <XCircle className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-sm">فشل الاتصال</p>
                  <p className="text-xs opacity-90 mt-0.5">{errorMessage}</p>
                </div>
            </div>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl flex gap-3">
        <div className="p-2 bg-white rounded-full shadow-sm h-fit">
          <AlertCircle className="w-5 h-5 text-amber-600" />
        </div>
        <div className="space-y-1.5">
          <h3 className="font-bold text-amber-900 text-sm">متطلبات التشغيل الاحترافي</h3>
          <p className="text-xs text-amber-800 leading-relaxed">
            للحصول على أفضل النتائج (صور 4K، فيديو عالي الدقة)، تأكد من أن مشروع Google Cloud المرتبط بالمفتاح يحتوي على حساب فوترة مفعل. النماذج المجانية قد تكون محدودة في السرعة والجودة.
          </p>
        </div>
      </div>
    </div>
  );
}
