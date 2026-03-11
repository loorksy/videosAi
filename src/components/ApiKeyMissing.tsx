import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Settings, X } from 'lucide-react';
import { MissingApiKeyError } from '../lib/aiProvider';

interface Props {
  error: MissingApiKeyError;
  onDismiss: () => void;
}

export function ApiKeyMissing({ error, onDismiss }: Props) {
  const navigate = useNavigate();

  return (
    <div data-testid="api-key-missing-banner" className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in" onClick={onDismiss}>
      <div className="bg-card w-full max-w-sm rounded-2xl shadow-2xl border border-border/60 overflow-hidden animate-in slide-in-from-bottom-4" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 bg-indigo-50">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-100">
                <AlertTriangle className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm">مفتاح API مطلوب</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  fal.ai
                </p>
              </div>
            </div>
            <button onClick={onDismiss} className="p-1 hover:bg-black/5 rounded-lg transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-card-foreground leading-relaxed">
            لم يتم إضافة مفتاح fal.ai بعد. أضف المفتاح من صفحة الإعدادات الإدارية لتتمكن من استخدام ميزات التوليد.
          </p>
          <button
            data-testid="go-to-settings-btn"
            onClick={() => { onDismiss(); navigate('/settings'); }}
            className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 text-white transition-all active:scale-[0.98] bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20 shadow-lg"
          >
            <Settings className="w-4 h-4" />
            اذهب للإعدادات
          </button>
        </div>
      </div>
    </div>
  );
}
