import { AlertTriangle } from 'lucide-react';

export function BrowserWarningBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex gap-3 p-4 mb-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300 shadow-sm"
    >
      <AlertTriangle size={20} className="shrink-0 mt-0.5" />
      <p className="text-[13px] font-medium leading-relaxed">{message}</p>
    </div>
  );
}
