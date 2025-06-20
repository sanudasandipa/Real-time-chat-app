import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import toastService from '../services/toast';
import './Settings.css';

const Settings: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.email.trim()) {
      toastService.error('Username and email are required');
      return;
    }

    setLoading(true);
    try {
      await updateProfile({
        username: formData.username,
        email: formData.email
      });
      toastService.success('Profile updated successfully');
    } catch (error: any) {
      console.error('Profile update error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update profile';
      toastService.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleThemeToggle = () => {
    toggleTheme();
    toastService.success(`Switched to ${theme === 'light' ? 'dark' : 'light'} theme`);
  };

  return (
    <div className="settings-page">
      {/* Header with back button */}
      <div className="settings-page-header">
        <button className="back-button" onClick={() => navigate('/chat')}>
          <i className="bi bi-arrow-left"></i>
        </button>
        <h1>Settings</h1>
        <div></div>
      </div>
      
      <div className="settings-container">
        <div className="settings-content">
          {/* Theme Settings */}
          <div className="settings-section">
            <div className="section-header">
              <h3>
                <i className="bi bi-palette"></i>
                Appearance
              </h3>
              <p>Customize how the app looks and feels</p>
            </div>
            
            <div className="setting-item">
              <div className="setting-info">
                <label>Theme</label>
                <span className="setting-description">
                  Choose between light and dark mode
                </span>
              </div>
              <div className="setting-control">
                <button
                  className={`theme-toggle ${theme}`}
                  onClick={handleThemeToggle}
                  title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
                >
                  <div className="theme-toggle-slider">
                    <i className={`bi bi-${theme === 'light' ? 'sun' : 'moon'}`}></i>
                  </div>
                </button>
                <span className="theme-label">
                  {theme === 'light' ? 'Light' : 'Dark'}
                </span>
              </div>
            </div>
          </div>

          {/* Profile Settings */}
          <div className="settings-section">
            <div className="section-header">
              <h3>
                <i className="bi bi-person"></i>
                Profile Information
              </h3>
              <p>Update your personal information</p>
            </div>
            
            <form onSubmit={handleProfileUpdate} className="settings-form">
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                />
              </div>

              <button
                type="submit"
                className="submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <i className="bi bi-arrow-clockwise spin"></i>
                    Updating...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check2"></i>
                    Update Profile
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Account Info */}
          <div className="settings-section">
            <div className="section-header">
              <h3>
                <i className="bi bi-info-circle"></i>
                Account Information
              </h3>
              <p>Your account details</p>
            </div>
            
            <div className="account-info">
              <div className="info-item">
                <span className="info-label">User ID:</span>
                <span className="info-value">{user?._id}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Status:</span>
                <span className="info-value status online">
                  <i className="bi bi-circle-fill"></i>
                  Online
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
