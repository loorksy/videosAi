import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { KeyRound, Loader2, Shield } from 'lucide-react';

interface TenantAISettingsDto {
  tenant_id: string;
  has_fal_key: boolean;
  updatedAt?: string | null;
}

export default function AdminFalSettingsPage() {
  const { token, user } = useAuth();
  const [settings, setSettings] = useState<TenantAISettingsDto | null>(null);
  const [falKey, setFalKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/tenant/ai-settings', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.detail || `فشل تحميل إعدادات fal.ai (${res.status})`);
        }
        const data = (await res.json()) as TenantAISettingsDto;
        setSettings(data);
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
          <h1 className="text-lg font-bold text-foreground">إعدادات fal.ai للمستأجر</h1>
          <p className="text-xs text-muted-foreground">
            إدارة مفتاح fal.ai للمستأجر الحالي ({settings?.tenant_id || user.tenantId}).
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

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl p-3">
          {success}
        </div>
      )}
    </div>
  );
}

