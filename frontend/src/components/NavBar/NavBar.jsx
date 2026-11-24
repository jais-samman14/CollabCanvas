import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './NavBar.css';

/**
 * Sticky top navigation bar displaying the CollabCanvas brand, authenticated user
 * controls (Dashboard + Logout), or guest Login/Sign Up links.
 */
const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  /** Triggers backend session revocation and redirects to the login page. */
  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar__container">
        <Link to="/" className="navbar__brand">
          <div className="navbar__logo-badge">
            <span className="navbar__logo-emoji">🎨</span>
          </div>
          <span className="navbar__brand-name">CollabCanvas</span>
        </Link>

        <div className="navbar__actions">
          {isAuthenticated ? (
            <>
              <span className="navbar__greeting">
                Hi, <span className="navbar__username">{user?.name}</span>
              </span>
              <Link to="/dashboard" className="navbar__link">
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="navbar__logout-btn"
              >
                {loggingOut ? (
                  <>
                    <span className="spinner spinner-sm navbar__logout-spinner" />
                    Logging out...
                  </>
                ) : (
                  <>🚪 Logout</>
                )}
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="navbar__link">
                Login
              </Link>
              <Link to="/signup" className="navbar__signup-btn">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
