import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AppNavigation.css';

const AppNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    setIsDropdownOpen(false);
    navigate('/login');
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsDropdownOpen(false);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  if (!user) return null;

  return (
    <nav className="app-navigation">
      <div className="nav-container">
        {/* Logo/Brand */}
        <div className="nav-brand">
          <h2>Chatter</h2>
        </div>

        {/* Navigation Links */}
        <div className="nav-links">
          <button
            className={`nav-link ${location.pathname === '/chat' ? 'active' : ''}`}
            onClick={() => navigate('/chat')}
          >
            <i className="bi bi-chat-dots"></i>
            Chat
          </button>
        </div>        {/* User Menu */}
        <div className="user-menu" ref={dropdownRef}>
          <button className="user-menu-button" onClick={toggleDropdown}>
            <div className="user-info">
              <span className="username">{user.username}</span>
              <div className="profile-pic">
                {user.profilePic ? (
                  <img src={user.profilePic} alt="Profile" />
                ) : (
                  <div className="profile-pic-placeholder">
                    {user.username?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            <i className={`bi bi-chevron-down dropdown-arrow ${isDropdownOpen ? 'open' : ''}`}></i>
          </button>

          {isDropdownOpen && (
            <div className="dropdown-menu">
              <div className="dropdown-header">
                <div className="dropdown-user-info">
                  <div className="dropdown-profile-pic">
                    {user.profilePic ? (
                      <img src={user.profilePic} alt="Profile" />
                    ) : (
                      <div className="dropdown-profile-placeholder">
                        {user.username?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="dropdown-user-details">
                    <span className="dropdown-username">{user.username}</span>
                    <span className="dropdown-email">{user.email || 'user@example.com'}</span>
                  </div>
                </div>
              </div>
              
              <div className="dropdown-section">
                <button
                  className="dropdown-item"
                  onClick={() => handleNavigation('/profile')}
                >
                  <div className="dropdown-item-icon">
                    <i className="bi bi-person-circle"></i>
                  </div>
                  <div className="dropdown-item-content">
                    <span className="dropdown-item-title">My Profile</span>
                    <span className="dropdown-item-subtitle">View and edit profile</span>
                  </div>
                </button>
                
                <button
                  className="dropdown-item"
                  onClick={() => handleNavigation('/settings')}
                >
                  <div className="dropdown-item-icon">
                    <i className="bi bi-gear-fill"></i>
                  </div>
                  <div className="dropdown-item-content">
                    <span className="dropdown-item-title">Settings</span>
                    <span className="dropdown-item-subtitle">Preferences & privacy</span>
                  </div>
                </button>
              </div>
              
              <div className="dropdown-divider"></div>
              
              <div className="dropdown-section">
                <button
                  className="dropdown-item logout"
                  onClick={handleLogout}
                >
                  <div className="dropdown-item-icon">
                    <i className="bi bi-box-arrow-right"></i>
                  </div>
                  <div className="dropdown-item-content">
                    <span className="dropdown-item-title">Sign Out</span>
                    <span className="dropdown-item-subtitle">Sign out of your account</span>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default AppNavigation;
