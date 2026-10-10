import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { ToastHost } from '@/components/shared/Toast';
import { NetworkStatusIndicator } from '@/components/shared/NetworkStatusIndicator';
import { AppRoutes } from '@/app/routes';

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <NetworkStatusIndicator />
            <AppRoutes />
            <ToastHost />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
