import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useFCM } from './hooks/useFCM';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BottomNav } from './components/BottomNav';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { MonthlyDetailPage } from './pages/MonthlyDetailPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { BudgetSetupPage } from './pages/BudgetSetupPage';
import { ImportPage } from './pages/ImportPage';

function AppContent() {
  const { user, loading } = useAuth();
  const location = useLocation();

  useFCM();

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="login-icon" style={{ animation: 'fadeIn 0.3s ease' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" opacity="0.3" />
            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round">
              <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
            </path>
          </svg>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <>
      <ErrorBoundary>
        <div key={location.pathname} className="page-transition">
          <Routes location={location}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/monthly" element={<MonthlyDetailPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/budget-setup" element={<BudgetSetupPage />} />
            <Route path="/import" element={<ImportPage />} />
          </Routes>
        </div>
      </ErrorBoundary>
      <BottomNav />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
