// src/App.jsx
import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import Dashboard from './pages/Dashboard';
import BoardPage from './pages/BoardPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

// Global toast handler for auth events
const GlobalEventListener = () => {
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const handleSessionExpired = (e) => {
      setToast({
        type: 'warning',
        message: e.detail?.message || 'Session expired. Please login again.',
      });
      setTimeout(() => {
        setToast(null);
        navigate('/login');
      }, 1500);
    };

    const handleRateLimit = (e) => {
      setToast({
        type: 'error',
        message: e.detail?.message || 'Too many requests. Please slow down.',
      });
      setTimeout(() => setToast(null), 4000);
    };

    window.addEventListener('session-expired', handleSessionExpired);
    window.addEventListener('rate-limit-hit', handleRateLimit);

    return () => {
      window.removeEventListener('session-expired', handleSessionExpired);
      window.removeEventListener('rate-limit-hit', handleRateLimit);
    };
  }, [navigate]);

  if (!toast) return null;

  return (
    <div className="fixed top-24 right-6 z-[9999] max-w-sm animate-slide-in">
      <div
        className={`px-4 py-3 rounded-lg shadow-2xl border font-medium text-sm flex items-start gap-3 ${
          toast.type === 'warning'
            ? 'bg-orange-500/95 border-orange-400 text-white'
            : toast.type === 'error'
            ? 'bg-red-500/95 border-red-400 text-white'
            : 'bg-canvas-surface border-canvas-border text-white'
        }`}
      >
        <span className="text-xl leading-none">
          {toast.type === 'warning' ? '⚠️' : toast.type === 'error' ? '🚫' : 'ℹ️'}
        </span>
        <span>{toast.message}</span>
      </div>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <div className="min-h-screen bg-canvas-bg text-white">
            <Navbar />
            <GlobalEventListener />

            <Routes>
              {/* Public routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />}/>
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              {/* Protected routes */}
              <Route path="/dashboard" 
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              <Route path="/board/:id"
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