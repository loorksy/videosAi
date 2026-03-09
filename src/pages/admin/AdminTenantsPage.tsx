import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Loader2, Users, Server } from 'lucide-react';

interface TenantRow {
  tenant_id: string;
  updatedAt?: string | null;
}

export default function AdminTenantsPage() {
  const { token, user } = useAuth();
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/admin/tenants', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.detail || `فشل تحميل المستأجرين (${res.status})`);
        }
        const data = await res.json();
        setTenants(Array.isArray(data) ? data : []);
      } catch (e: any) {
        setError(e.message || 'فشل تحميل المستأجرين');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      load();
    }
  }, [token]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6 pb-20" dir="rtl">
      <header className="flex items-center gap-3 pt-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <Server className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">إدارة المستأجرين</h1>
          <p className="text-xs text-muted-foreground">
            عرض قائمة المستأجرين (workspaces) المربوطة بحسابك.
          </p>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">
          {error}
        </div>
      )}

      <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold">المستأجرون</h2>
          </div>
          <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
            {tenants.length} مستأجر
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-secondary/60 text-xs text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-2 font-medium">المعرّف</th>
                <th className="px-4 py-2 font-medium">آخر تحديث لإعدادات fal.ai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {tenants.map((t) => (
                <tr key={t.tenant_id} className="hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-2 font-mono text-xs">
                    {t.tenant_id}
                    {t.tenant_id === user.tenantId && (
                      <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                        مستأجرك الحالي
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {t.updatedAt ? new Date(t.updatedAt).toLocaleString() : 'لم يتم ضبط الإعدادات بعد'}
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-center text-xs text-muted-foreground">
                    لا توجد سجلات مستأجرين بعد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

