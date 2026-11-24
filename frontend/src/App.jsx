import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/NavBar/NavBar';
import PrivateRoute from './components/PrivateRoute/PrivateRoute';
import LandingPage from './pages/LandingPage/LandingPage';
import LoginPage from './pages/LoginPage/LoginPage';
import SignupPage from './pages/SignupPage/SignupPage';
import Dashboard from './pages/Dashboard/Dashboard';
import BoardPage from './pages/BoardPage/BoardPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage/ResetPasswordPage';
import './App.css';

/**
 * Listens for global window custom events (`session-expired`, `rate-limit-hit`)
 * dispatched by Axios interceptors or SocketContext and displays a toast banner.
 */
const GlobalEventListener = () => {
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let timerId = null;

    const handleSessionExpired = (e) => {
      clearTimeout(timerId);
      setToast({
        type: 'warning',
        message: e.detail?.message || 'Session expired. Please login again.',
      });
      timerId = setTimeout(() => {
        setToast(null);
        navigate('/login', { replace: true });
      }, 1500);
    };

    const handleRateLimit = (e) => {
      clearTimeout(timerId);
      setToast({
        type: 'error',
        message: e.detail?.message || 'Too many requests. Please slow down.',
      });
      timerId = setTimeout(() => setToast(null), 4000);
    };

    window.addEventListener('session-expired', handleSessionExpired);
    window.addEventListener('rate-limit-hit', handleRateLimit);

    return () => {
      clearTimeout(timerId);
      window.removeEventListener('session-expired', handleSessionExpired);
      window.removeEventListener('rate-limit-hit', handleRateLimit);
    };
  }, [navigate]);

  if (!toast) return null;

  return (
    <div className="global-toast-wrapper">
      <div className={`global-toast global-toast--${toast.type}`}>
        <span className="global-toast__icon">
          {toast.type === 'warning' ? '⚠️' : toast.type === 'error' ? '🚫' : 'ℹ️'}
        </span>
        <span>{toast.message}</span>
      </div>
    </div>
  );
};

/**
 * Root application component configuring client-side routes, authentication,
 * WebSocket context, persistent navigation bar, and global toast alerts.
 */
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <div className="app-shell">
            <Navbar />
            <GlobalEventListener />

            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/board/:id"
                element={
                  <PrivateRoute>
                    <BoardPage />
                  </PrivateRoute>
                }
              />
            </Routes>
          </div>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
