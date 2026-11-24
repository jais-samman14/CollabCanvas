import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './PrivateRoute.css';

/**
 * Route guard that waits for session hydration, then renders children for
 * authenticated users or redirects guests to `/login`.
 * @param {{ children: import('react').ReactNode }} props
 */
const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="private-route-loader">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default PrivateRoute;
