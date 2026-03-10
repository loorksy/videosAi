import React, { useEffect } from 'react';
import { Settings, LogOut, Zap, Coins, BarChart3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SettingsPageProps {
  onLogout?: () => void;
}

export default function SettingsPage({ onLogout }: SettingsPageProps) {
  const { user, refreshUser } = useAuth();

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const balance = user?.creditsBalance ?? 0;
  const usage = user?.totalUsage ?? 0;

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-5 pb-24" data-testid="settings-page">
      <header className="flex items-center gap-3 pt-2">
        <div className="w-10 h-10 bg-primary rounded-xl text-primary-foreground shadow-md shadow-primary/20 flex items-center justify-center">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">الإعدادات</h1>
          <p className="text-muted-foreground text-xs">رصيدك واستهلاك الذكاء الاصطناعي</p>
        </div>
      </header>

      {/* Credits & Usage */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-card p-5 rounded-2xl border border-border/60 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
            <Coins className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">الرصيد الحالي</p>
            <p className="text-2xl font-bold text-foreground">{balance}</p>
            <p className="text-[10px] text-muted-foreground">كريدت</p>
          </div>
        </div>
        <div className="bg-card p-5 rounded-2xl border border-border/60 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">إجمالي الاستهلاك</p>
            <p className="text-2xl font-bold text-foreground">{usage}</p>
            <p className="text-[10px] text-muted-foreground">كريدت</p>
          </div>
        </div>
      </div>

      {/* fal.ai info */}
      <div className="bg-card p-5 rounded-2xl border border-border/60 space-y-2">
        <h2 className="text-sm font-bold text-card-foreground flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          مزود الذكاء الاصطناعي
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          يعمل النظام على <strong>fal.ai</strong> فقط. التوليد (نص، صورة، فيديو) يتم من الخادم ويُخصم من رصيدك. لا حاجة لإدخال مفاتيح API من هنا.
        </p>
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
