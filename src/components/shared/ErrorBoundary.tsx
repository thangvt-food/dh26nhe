import { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(err: unknown) {
    console.error('[ErrorBoundary]', err);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#e7ebf0] dark:bg-[#0e1621]">
          <div className="max-w-sm text-center rounded-3xl bg-white dark:bg-[#1e1f22] border border-black/5 dark:border-white/10 p-8 shadow-xl">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#f5a623]/15 text-[#f5a623] flex items-center justify-center mb-3">
              <AlertTriangle size={24} />
            </div>
            <h2 className="font-semibold text-black dark:text-white mb-1">Đã có lỗi xảy ra</h2>
            <p className="text-[13px] text-[#707579] dark:text-[#aaaaaa] mb-4">
              Vui lòng tải lại trang để tiếp tục sử dụng.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl bg-[#3390ec] hover:bg-[#2883df] text-white text-[14px] font-semibold"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
