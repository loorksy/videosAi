import React, { useState, useEffect } from 'react';
import { Settings, Save, AlertCircle, CheckCircle, XCircle, Loader2, LogOut, Zap, Brain, ImageIcon, Video } from 'lucide-react';
import { GeminiService } from '../lib/gemini';

interface SettingsPageProps {
  onLogout?: () => void;
}

const KIE_TEXT_MODELS = [
  { value: 'deepseek-r1', label: 'DeepSeek R1' },
  { value: 'deepseek-v3', label: 'DeepSeek V3' },
  { value: 'gpt-5.2-chat-latest', label: 'GPT-5.2 Chat' },
];

const KIE_IMAGE_MODELS = [
  { value: 'gpt-image-1', label: 'GPT-Image-1 (4o)' },
  { value: 'nano-banana-2', label: 'Nano Banana 2' },
  { value: 'flux-kontext-pro', label: 'FLUX Kontext Pro' },
  { value: 'flux-kontext-max', label: 'FLUX Kontext Max' },
];

const KIE_VIDEO_MODELS = [
  { value: 'veo3_fast', label: 'Veo 3 Fast' },
  { value: 'veo3', label: 'Veo 3' },
  { value: 'sora2', label: 'Sora 2' },
  { value: 'wan2.5-t2v-preview', label: 'Wan 2.5' },
  { value: 'kling2.6', label: 'Kling 2.6' },
  { value: 'runway', label: 'Runway' },
];

const GEMINI_TEXT_MODELS = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
];

const GEMINI_IMAGE_MODELS = [
  { value: 'gemini-3-pro-image-preview', label: 'Gemini 3 Pro Image' },
];

const API = window.location.origin;

export default function SettingsPage({ onLogout }: SettingsPageProps) {
  const [geminiKey, setGeminiKey] = useState('');
  const [kieKey, setKieKey] = useState('');
  const [provider, setProvider] = useState<'gemini' | 'kie'>('gemini');
  const [textModel, setTextModel] = useState('gemini-2.5-flash');
  const [imageModel, setImageModel] = useState('gemini-3-pro-image-preview');
  const [videoModel, setVideoModel] = useState('veo3_fast');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Load Gemini key from localStorage
    const storedGemini = localStorage.getItem('GEMINI_API_KEY');
    if (storedGemini) setGeminiKey(storedGemini);

    // Load settings from backend
    fetch(`${API}/api/settings`)
      .then(r => r.json())
      .then(data => {
        setProvider(data.provider || 'gemini');
        setTextModel(data.text_model || 'gemini-2.5-flash');
        setImageModel(data.image_model || 'gemini-3-pro-image-preview');
        setVideoModel(data.video_model || 'veo3_fast');
      })
      .catch(() => {});

    // Load kie key from localStorage
    const storedKie = localStorage.getItem('KIE_API_KEY');
    if (storedKie) setKieKey(storedKie);
  }, []);

  // When provider changes, reset models to defaults for that provider
  useEffect(() => {
    if (provider === 'kie') {
      setTextModel('deepseek-r1');
      setImageModel('gpt-image-1');
      setVideoModel('veo3_fast');
    } else {
      setTextModel('gemini-2.5-flash');
      setImageModel('gemini-3-pro-image-preview');
      setVideoModel('veo3_fast');
    }
  }, [provider]);

  const handleSave = async () => {
    setSaving(true);

    // Save Gemini key to localStorage
    if (geminiKey.trim()) {
      localStorage.setItem('GEMINI_API_KEY', geminiKey.trim());
    } else {
      localStorage.removeItem('GEMINI_API_KEY');
    }

    // Save kie key to localStorage
    if (kieKey.trim()) {
      localStorage.setItem('KIE_API_KEY', kieKey.trim());
    } else {
      localStorage.removeItem('KIE_API_KEY');
    }

    // Save provider settings + kie key to backend
    try {
      await fetch(`${API}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kie_api_key: kieKey.trim() || null,
          provider,
          text_model: textModel,
          image_model: imageModel,
          video_model: videoModel,
        }),
      });
    } catch (e) {
      console.error('Failed to save settings:', e);
    }

    // Save provider settings to localStorage for frontend services
    localStorage.setItem('AI_PROVIDER', provider);
    localStorage.setItem('AI_TEXT_MODEL', textModel);
    localStorage.setItem('AI_IMAGE_MODEL', imageModel);
    localStorage.setItem('AI_VIDEO_MODEL', videoModel);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setTestStatus('idle');
  };

  const handleTest = async () => {
    setTestStatus('testing');
    setErrorMessage('');

    if (provider === 'gemini') {
      if (geminiKey.trim()) localStorage.setItem('GEMINI_API_KEY', geminiKey.trim());
      try {
        await GeminiService.testConnection();
        setTestStatus('success');
      } catch (error: any) {
        setTestStatus('error');
        setErrorMessage(error.message || 'فشل الاتصال. تأكد من صحة المفتاح.');
      }
    } else {
      // Save key to backend first, then test
      if (kieKey.trim()) {
        localStorage.setItem('KIE_API_KEY', kieKey.trim());
        try {
          await fetch(`${API}/api/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kie_api_key: kieKey.trim() }),
          });
        } catch {}
      }
      try {
        const resp = await fetch(`${API}/api/kie/test-connection`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        if (resp.ok) {
          setTestStatus('success');
        } else {
          const err = await resp.json().catch(() => ({}));
          throw new Error(err.detail || `خطأ ${resp.status}`);
        }
      } catch (error: any) {
        setTestStatus('error');
        setErrorMessage(error.message || 'فشل الاتصال بـ kie.ai');
      }
    }
  };

  const textModels = provider === 'kie' ? KIE_TEXT_MODELS : GEMINI_TEXT_MODELS;
  const imageModels = provider === 'kie' ? KIE_IMAGE_MODELS : GEMINI_IMAGE_MODELS;
  const videoModels = KIE_VIDEO_MODELS; // Video always through kie.ai

  return (
    <div className="p-4 max-w-lg mx-auto space-y-5 pb-24" data-testid="settings-page">
      <header className="flex items-center gap-3 pt-2">
        <div className="w-10 h-10 bg-primary rounded-xl text-primary-foreground shadow-md shadow-primary/20 flex items-center justify-center">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">الإعدادات</h1>
          <p className="text-muted-foreground text-xs">مفاتيح API والمزودين والنماذج</p>
        </div>
      </header>

      {/* Provider Toggle */}
      <div className="bg-card p-5 rounded-2xl border border-border/60 space-y-4">
        <h2 className="text-sm font-bold text-card-foreground flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          المزود الرئيسي
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            data-testid="provider-gemini"
            onClick={() => setProvider('gemini')}
            className={`py-3 px-4 rounded-xl border-2 text-sm font-bold transition-all ${
              provider === 'gemini'
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                : 'border-border bg-secondary/50 text-muted-foreground hover:border-indigo-200'
            }`}
          >
            Google Gemini
          </button>
          <button
            data-testid="provider-kie"
            onClick={() => setProvider('kie')}
            className={`py-3 px-4 rounded-xl border-2 text-sm font-bold transition-all ${
              provider === 'kie'
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                : 'border-border bg-secondary/50 text-muted-foreground hover:border-emerald-200'
            }`}
          >
            kie.ai (الكل في واحد)
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          {provider === 'kie'
            ? 'kie.ai سيكون المزود الرئيسي لكل شيء: النصوص والصور والفيديو.'
            : 'Gemini للنصوص والصور، kie.ai للفيديو.'}
        </p>
      </div>

      {/* API Keys */}
      <div className="bg-card p-5 rounded-2xl border border-border/60 space-y-4">
        <h2 className="text-sm font-bold text-card-foreground">مفاتيح API</h2>

        {/* Gemini Key */}
        {provider === 'gemini' && (
          <div>
            <label className="block text-xs font-bold text-card-foreground mb-1.5">
              مفتاح Gemini API
            </label>
            <input
              data-testid="gemini-api-key-input"
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full p-3 border border-border rounded-xl focus:ring-2 focus:ring-ring/30 focus:border-primary outline-none font-mono text-sm bg-secondary/50"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-primary hover:underline">
                احصل على مفتاحك من Google AI Studio
              </a>
            </p>
          </div>
        )}

        {/* kie.ai Key */}
        <div>
          <label className="block text-xs font-bold text-card-foreground mb-1.5">
            مفتاح kie.ai API
          </label>
          <input
            data-testid="kie-api-key-input"
            type="password"
            value={kieKey}
            onChange={(e) => setKieKey(e.target.value)}
            placeholder="kie.ai API Key..."
            className="w-full p-3 border border-border rounded-xl focus:ring-2 focus:ring-ring/30 focus:border-primary outline-none font-mono text-sm bg-secondary/50"
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            {provider === 'kie' ? (
              <span className="text-amber-600 font-medium">مطلوب - </span>
            ) : (
              <span>مطلوب لتوليد الفيديو - </span>
            )}
            <a href="https://kie.ai/api-key" target="_blank" rel="noreferrer" className="text-primary hover:underline">
              احصل على مفتاحك من kie.ai
            </a>
          </p>
        </div>
      </div>

      {/* Model Selection */}
      <div className="bg-card p-5 rounded-2xl border border-border/60 space-y-4">
        <h2 className="text-sm font-bold text-card-foreground flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-500" />
          اختيار النماذج
        </h2>

        {/* Text Model */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
            <Brain className="w-3 h-3" /> نموذج النصوص (السيناريو والأفكار)
          </label>
          <select
            data-testid="text-model-select"
            value={textModel}
            onChange={(e) => setTextModel(e.target.value)}
            className="w-full p-2.5 border border-border rounded-xl bg-secondary/50 text-sm focus:ring-2 focus:ring-ring/30 outline-none"
          >
            {textModels.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* Image Model */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
            <ImageIcon className="w-3 h-3" /> نموذج الصور (المشاهد والشخصيات)
          </label>
          <select
            data-testid="image-model-select"
            value={imageModel}
            onChange={(e) => setImageModel(e.target.value)}
            className="w-full p-2.5 border border-border rounded-xl bg-secondary/50 text-sm focus:ring-2 focus:ring-ring/30 outline-none"
          >
            {imageModels.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* Video Model */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
            <Video className="w-3 h-3" /> نموذج الفيديو
          </label>
          <select
            data-testid="video-model-select"
            value={videoModel}
            onChange={(e) => setVideoModel(e.target.value)}
            className="w-full p-2.5 border border-border rounded-xl bg-secondary/50 text-sm focus:ring-2 focus:ring-ring/30 outline-none"
          >
            {videoModels.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Save & Test */}
      <div className="flex gap-2.5">
        <button
          data-testid="test-connection-btn"
          onClick={handleTest}
          disabled={testStatus === 'testing' || (provider === 'gemini' && !geminiKey) || (provider === 'kie' && !kieKey)}
          className="flex-1 py-3 bg-secondary text-secondary-foreground rounded-xl font-bold text-sm hover:bg-muted transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {testStatus === 'testing' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          <span>فحص الاتصال</span>
        </button>
        <button
          data-testid="save-settings-btn"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-md shadow-primary/20"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>حفظ التغييرات</span>
        </button>
      </div>

      {saved && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-3 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span className="font-medium">تم الحفظ بنجاح!</span>
        </div>
      )}

      {testStatus === 'success' && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-3 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <div>
            <p className="font-bold text-sm">الاتصال ناجح!</p>
            <p className="text-xs opacity-80">المفتاح يعمل بشكل صحيح.</p>
          </div>
        </div>
      )}

      {testStatus === 'error' && (
        <div className="bg-red-50 border border-red-100 text-red-700 p-3 rounded-xl text-sm flex items-start gap-2">
          <XCircle className="w-4 h-4 mt-0.5" />
          <div>
            <p className="font-bold text-sm">فشل الاتصال</p>
            <p className="text-xs opacity-90">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h3 className="font-bold text-amber-900 text-xs">ملاحظة</h3>
          <p className="text-[10px] text-amber-800 leading-relaxed">
            {provider === 'kie'
              ? 'عند اختيار kie.ai كمزود رئيسي، كل عمليات التوليد (نصوص، صور، فيديو) ستتم عبر kie.ai. تأكد من وجود رصيد كافٍ في حسابك.'
              : 'Gemini يستخدم للنصوص والصور. الفيديو دائماً عبر kie.ai. تأكد من تفعيل الفوترة في مشروع Google Cloud.'}
          </p>
        </div>
      </div>

      {/* Logout */}
      {onLogout && (
        <button
          onClick={onLogout}
          data-testid="logout-button"
          className="w-full py-3.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span>تسجيل الخروج</span>
        </button>
      )}
    </div>
  );
}
