import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { KeyRound, Loader2, Shield, Settings2, RefreshCw } from 'lucide-react';

interface TenantAISettingsDto {
  tenant_id: string;
  has_fal_key: boolean;
  updatedAt?: string | null;
}

interface FalModelDto {
  id: string;
  kind: 'text' | 'image' | 'video' | string;
  description?: string | null;
}

interface FalFeatureDef {
  key: string;
  kind: 'text' | 'image' | 'video' | string;
  label: string;
}

interface FalModelMappingsResponse {
  features: FalFeatureDef[];
  mappings: Record<string, string>;
  availableModelsByKind: {
    text?: FalModelDto[];
    image?: FalModelDto[];
    video?: FalModelDto[];
    [k: string]: FalModelDto[] | undefined;
  };
}

export default function AdminFalSettingsPage() {
  const { token, user } = useAuth();
  const [settings, setSettings] = useState<TenantAISettingsDto | null>(null);
  const [falKey, setFalKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [modelMappings, setModelMappings] = useState<FalModelMappingsResponse | null>(null);
  const [savingMappings, setSavingMappings] = useState(false);
  const [refreshingModels, setRefreshingModels] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        // Tenant-level key info
        const resSettings = await fetch('/api/tenant/ai-settings', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resSettings.ok) {
          const data = await resSettings.json().catch(() => ({}));
          throw new Error(data.detail || `فشل تحميل إعدادات fal.ai (${resSettings.status})`);
        }
        const dataSettings = (await resSettings.json()) as TenantAISettingsDto;
        setSettings(dataSettings);

        // Global model mappings for admin
        const resMappings = await fetch('/api/admin/fal/model-mappings', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resMappings.ok) {
          const dataMappings = (await resMappings.json()) as FalModelMappingsResponse;
          setModelMappings(dataMappings);
        }
      } catch (e: any) {
        setError(e.message || 'فشل تحميل الإعدادات');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      load();
    }
  }, [token]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/tenant/ai-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fal_api_key: falKey.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || `فشل حفظ الإعدادات (${res.status})`);
      }
      setSuccess('تم حفظ إعدادات fal.ai بنجاح.');
      setFalKey('');
      setSettings((prev) =>
        prev
          ? {
              ...prev,
              has_fal_key: !!(falKey.trim() || prev.has_fal_key),
              updatedAt: new Date().toISOString(),
            }
          : prev,
      );
    } catch (e: any) {
      setError(e.message || 'فشل حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const isAdmin = user.role === 'admin';

  return (
    <div className="p-4 max-w-xl mx-auto space-y-6 pb-20" dir="rtl">
      <header className="flex items-center gap-3 pt-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
          <KeyRound className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">إعدادات fal.ai</h1>
          <p className="text-xs text-muted-foreground">
            إدارة مفتاح fal.ai للمستأجر الحالي ({settings?.tenant_id || user.tenantId})، واختيار الموديلات المستخدمة لكل أداة.
          </p>
        </div>
      </header>

      {!isAdmin && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl p-3 flex gap-2">
          <Shield className="w-4 h-4 mt-0.5" />
          <div>
            <p className="font-bold text-xs">صلاحيات غير كافية</p>
            <p>فقط مدير المستأجر يمكنه تعديل إعدادات fal.ai.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3">
          {error}
        </div>
      )}

      {settings && (
        <div className="bg-card border border-border/60 rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">حالة المفتاح</p>
              <p className="text-sm font-bold">
                {settings.has_fal_key ? 'مفتاح fal.ai مُضاف للمستأجر' : 'لم يتم إضافة مفتاح بعد'}
              </p>
            </div>
            <div className="text-[11px] text-muted-foreground">
              آخر تحديث:{' '}
              {settings.updatedAt ? new Date(settings.updatedAt).toLocaleString() : 'غير متوفر'}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-card-foreground">
              مفتاح fal.ai الجديد (لن يتم عرض المفتاح الحالي)
            </label>
            <input
              type="password"
              value={falKey}
              onChange={(e) => setFalKey(e.target.value)}
              placeholder="fal_xxx..."
              disabled={!isAdmin}
              className="w-full p-3 border border-border rounded-xl bg-secondary/50 text-sm font-mono outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary"
            />
            <p className="text-[10px] text-muted-foreground">
              لن يتم إعادة عرض المفتاح بعد الحفظ، سيتم تخزينه في الخادم فقط. اترك الحقل فارغاً إذا كنت لا
              تريد تغييره.
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={!isAdmin || saving}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            حفظ إعدادات fal.ai
          </button>
        </div>
      )}

      {user.role === 'admin' && modelMappings && (
        <div className="bg-card border border-border/60 rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Settings2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-card-foreground">اختيار موديلات fal.ai لكل أداة</h2>
                <p className="text-[11px] text-muted-foreground">
                  اختر الموديل لكل نوع استخدام (نص / صورة / فيديو). التغييرات تؤثر على جميع المستخدمين.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={async () => {
                try {
                  setRefreshingModels(true);
                  const res = await fetch('/api/admin/fal/models?force=true', {
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  const models = (await res.json()) as FalModelDto[];
                  const grouped: FalModelMappingsResponse['availableModelsByKind'] = { text: [], image: [], video: [] };
                  models.forEach((m) => {
                    const k = m.kind || 'text';
                    if (!grouped[k]) grouped[k] = [];
                    grouped[k]!.push(m);
                  });
                  setModelMappings((prev) =>
                    prev
                      ? {
                          ...prev,
                          availableModelsByKind: grouped,
                        }
                      : prev,
                  );
                } catch (e) {
                  console.error(e);
                } finally {
                  setRefreshingModels(false);
                }
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-[11px] text-muted-foreground hover:bg-secondary/60"
            >
              <RefreshCw className={`w-3 h-3 ${refreshingModels ? 'animate-spin' : ''}`} />
              تحديث قائمة الموديلات
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {['text', 'image', 'video'].map((kind) => {
              const features = modelMappings.features.filter((f) => f.kind === kind);
              if (!features.length) return null;
              const models = modelMappings.availableModelsByKind[kind] || [];
              return (
                <div key={kind} className="space-y-2">
                  <h3 className="font-semibold text-card-foreground text-xs mb-1">
                    {kind === 'text' ? 'نماذج النصوص' : kind === 'image' ? 'نماذج الصور' : 'نماذج الفيديو'}
                  </h3>
                  {features.map((f) => (
                    <div key={f.key} className="space-y-1">
                      <label className="text-[11px] text-muted-foreground block">{f.label}</label>
                      <select
                        className="w-full border border-border rounded-lg bg-background px-2 py-1.5 text-[11px]"
                        value={modelMappings.mappings[f.key] || ''}
                        onChange={(e) =>
                          setModelMappings((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  mappings: {
                                    ...prev.mappings,
                                    [f.key]: e.target.value,
                                  },
                                }
                              : prev,
                          )
                        }
                      >
                        <option value="">افتراضي (حسب الإعداد المدمج)</option>
                        {models.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.id} {m.description ? `- ${m.description}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            disabled={savingMappings}
            onClick={async () => {
              try {
                setSavingMappings(true);
                const res = await fetch('/api/admin/fal/model-mappings', {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({ mappings: modelMappings.mappings }),
                });
                if (!res.ok) {
                  const data = await res.json().catch(() => ({}));
                  throw new Error(data.detail || `فشل حفظ ربط الموديلات (${res.status})`);
                }
                setSuccess('تم حفظ ربط الموديلات بنجاح.');
              } catch (e: any) {
                setError(e.message || 'فشل حفظ ربط الموديلات');
              } finally {
                setSavingMappings(false);
              }
            }}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {savingMappings && <Loader2 className="w-3 h-3 animate-spin" />}
            حفظ ربط الموديلات
          </button>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl p-3">
          {success}
        </div>
      )}
    </div>
  );
}

