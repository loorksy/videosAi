import React, { ReactNode, useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function ErrorBoundary({ children }: Props) {
  const [state, setState] = useState<State>({ hasError: false, error: null });

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      setState({
        hasError: true,
        error: event.error instanceof Error ? event.error : new Error(event.message || 'حدث خطأ غير متوقع'),
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const error = reason instanceof Error ? reason : new Error(String(reason || 'حدث خطأ غير متوقع'));
      setState({ hasError: true, error });
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  const handleRetry = () => setState({ hasError: false, error: null });

  if (state.hasError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card p-8 rounded-2xl shadow-lg max-w-md w-full text-center border border-border">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">حدث خطأ غير متوقع</h2>
          <p className="text-muted-foreground text-sm mb-4">
            {state.error?.message || 'حدث خطأ أثناء تحميل الصفحة'}
          </p>
          <button
            onClick={handleRetry}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:brightness-110 transition-all flex items-center justify-center gap-2 mx-auto"
          >
            <RefreshCw className="w-5 h-5" />
            <span>حاول مرة أخرى</span>
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default ErrorBoundary;
