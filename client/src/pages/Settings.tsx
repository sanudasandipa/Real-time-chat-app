import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { authAPI } from '../services/api';
import toastService from '../services/toast';
import './Settings.css';

const Settings: React.FC = () => {  const { user, updateProfile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    bio: (user as any)?.bio || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Settings state - load from localStorage
  const [settings, setSettings] = useState(() => {
    const savedSettings = localStorage.getItem('userSettings');
    return savedSettings ? JSON.parse(savedSettings) : {
      notifications: true,
      soundEnabled: true,
      emailNotifications: true,
      showOnlineStatus: true,
      autoSaveChats: true,
      darkMode: theme === 'dark'
    };
  });

  // Update form data when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        bio: (user as any)?.bio || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    }
  }, [user]);  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('userSettings', JSON.stringify(settings));
  }, [settings]);

  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, label: '', color: '' };
    
    let score = 0;
    const criteria = {
      length: password.length >= 6,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*]/.test(password)
    };
    
    // Count met criteria
    Object.values(criteria).forEach(met => met && score++);
    
    if (score < 3) return { strength: 1, label: 'Weak', color: '#ef4444' };
    if (score < 4) return { strength: 2, label: 'Fair', color: '#f59e0b' };
    if (score < 5) return { strength: 3, label: 'Good', color: '#10b981' };
    return { strength: 4, label: 'Strong', color: '#059669' };
  };

  const passwordStrength = getPasswordStrength(formData.newPassword);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSettingToggle = (settingKey: keyof typeof settings) => {
    const newValue = !settings[settingKey];
    setSettings((prev: typeof settings) => ({
      ...prev,
      [settingKey]: newValue
    }));
    
    if (settingKey === 'darkMode') {
      toggleTheme();
    }
    
    const settingName = String(settingKey).replace(/([A-Z])/g, ' $1').toLowerCase();
    toastService.success(`${settingName} ${newValue ? 'enabled' : 'disabled'}`);
  };  const handleDeleteAccount = () => {
    // Reset password field and show modal
    setDeletePassword('');
    setShowDeleteModal(true);
  };
  
  const confirmDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      toastService.error('Password is required to delete your account');
      return;
    }

    try {
      setLoading(true);
      
      // Use the authAPI which handles token refresh automatically
      await authAPI.deleteAccount(deletePassword);

      // Give visual feedback
      toastService.success('Account deleted successfully');
      
      // Clear all local storage and session storage
      Object.keys(localStorage).forEach(key => localStorage.removeItem(key));
      Object.keys(sessionStorage).forEach(key => sessionStorage.removeItem(key));
      
      // Close the modal
      setShowDeleteModal(false);
      
      // Add a slight delay before redirecting to allow the user to see the success message
      setTimeout(() => {
        logout();
        navigate('/login', { replace: true });
      }, 1500);
    } catch (error: any) {
      console.error('Delete account error:', error);
      let errorMessage = 'Failed to delete account';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
        // Specific handling for common error messages
        if (errorMessage.toLowerCase().includes('password') && 
            (errorMessage.toLowerCase().includes('incorrect') || 
             errorMessage.toLowerCase().includes('invalid'))) {
          errorMessage = 'Incorrect password. Please try again.';
        }
      } else if (error.message) {
        if (error.message.includes('unauthorized') || error.message.includes('authentication') || error.message.includes('Token verification failed')) {
          errorMessage = 'Your session has expired. Please log in again to delete your account.';
          // Auto logout on token failure
          setTimeout(() => {
            logout();
            navigate('/login', { replace: true });
          }, 2000);
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toastService.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  const cancelDeleteAccount = () => {
    setShowDeleteModal(false);
    setDeletePassword('');
  };
  
  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showDeleteModal) {
        cancelDeleteAccount();
      }
    };

    if (showDeleteModal) {
      document.addEventListener('keydown', handleEscKey);
      // Prevent background scrolling when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = '';
    };
  }, [showDeleteModal]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username.trim()) {
      toastService.error('Username is required');
      return;
    }

    setLoading(true);
    try {
      // Only send fields that the backend accepts
      const updateData = {
        username: formData.username,
        bio: formData.bio
      };
      
      await updateProfile(updateData);
      toastService.success('Profile updated successfully');
    } catch (error: any) {
      console.error('Profile update error:', error);
      let errorMessage = 'Failed to update profile';
      
      if (error.response?.data?.message) {
        const backendMessage = error.response.data.message;
        if (backendMessage.includes('username') && backendMessage.includes('taken')) {
          errorMessage = 'This username is already taken. Please choose a different one.';
        } else if (backendMessage.includes('validation')) {
          errorMessage = 'Please check your input and try again.';
        } else {
          errorMessage = backendMessage;
        }
      }
      
      toastService.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      toastService.error('All password fields are required');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toastService.error('New passwords do not match');
      return;
    }

    if (formData.newPassword.length < 6) {
      toastService.error('New password must be at least 6 characters long');
      return;
    }

    // Check password strength (backend requires uppercase, lowercase, and number)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (!passwordRegex.test(formData.newPassword)) {
      toastService.error('New password must contain at least one uppercase letter, one lowercase letter, and one number');
      return;
    }    setLoading(true);
    try {
      // Use the authAPI which handles token refresh automatically
      await authAPI.changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword // Backend validation requires this
      });
      
      toastService.success('Password changed successfully! Please login again for security.');
      
      // Clear form
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      
      // Optional: Auto-logout after password change for security
      setTimeout(() => {
        logout();
        navigate('/login');
      }, 2000); // Give user time to see the success message
        } catch (error: any) {
      console.error('Password change error:', error);
      
      let errorMessage = 'Failed to change password. Please try again.';
      
      if (error.response?.data?.message) {
        const message = error.response.data.message;
        if (message.includes('current password') || message.includes('incorrect')) {
          errorMessage = 'Current password is incorrect';
        } else if (message.includes('validation')) {
          errorMessage = 'Please check your password requirements';
        } else {
          errorMessage = message;
        }
      } else if (error.response?.data?.errors) {
        const errorMessages = Object.values(error.response.data.errors).join(', ');
        errorMessage = errorMessages;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toastService.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      setLoading(true);
      toastService.info('Preparing your data export...');
      
      // Simulate data export process
      setTimeout(() => {
        const userData = {
          profile: user,
          settings: settings,
          exportDate: new Date().toISOString(),
          version: '1.0'
        };
        
        const dataStr = JSON.stringify(userData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `chatter-data-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toastService.success('Data exported successfully');
        setLoading(false);
      }, 2000);
    } catch (error) {
      toastService.error('Failed to export data');
      setLoading(false);
    }
  };

  const handleClearAllData = async () => {
    if (!window.confirm('Are you sure you want to clear all your chat data? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      // Clear local storage
      const itemsToKeep = ['token', 'refreshToken', 'theme', 'userSettings'];
      const allKeys = Object.keys(localStorage);
      
      allKeys.forEach(key => {
        if (!itemsToKeep.includes(key)) {
          localStorage.removeItem(key);
        }
      });
      
      toastService.success('Local data cleared successfully');
      
      // In a real app, you would also call an API to clear server-side data
      // await api.clearUserData();
      
    } catch (error) {
      toastService.error('Failed to clear data');
    } finally {
      setLoading(false);
    }
  };

  const handleThemeToggle = () => {
    toggleTheme();
    setSettings((prev: typeof settings) => ({
      ...prev,
      darkMode: theme === 'light' // Will be opposite after toggle
    }));
    toastService.success(`Switched to ${theme === 'light' ? 'dark' : 'light'} theme`);
  };
  return (
    <>
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
          {/* Appearance Settings */}
          <div className="settings-section">
            <div className="section-header">
              <div className="section-icon">
                <i className="bi bi-palette"></i>
              </div>
              <div className="section-info">
                <h2>Appearance</h2>
                <p>Customize how the app looks and feels</p>
              </div>
            </div>
            
            <div className="setting-item">
              <div className="setting-info">
                <label>Dark Theme</label>
                <span className="setting-description">
                  Switch between light and dark mode
                </span>
              </div>
              <div className="setting-control">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={theme === 'dark'}
                    onChange={handleThemeToggle}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </div>

          {/* Profile Settings */}
          <div className="settings-section">
            <div className="section-header">
              <div className="section-icon">
                <i className="bi bi-person"></i>
              </div>
              <div className="section-info">
                <h2>Profile Information</h2>
                <p>Update your personal information</p>
              </div>
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
                  disabled
                  className="form-input"
                  title="Email cannot be changed"
                />
                <small className="form-hint">Email cannot be changed</small>
              </div>

              <div className="form-group">
                <label htmlFor="bio">Bio</label>
                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Tell us about yourself..."
                  maxLength={200}
                  rows={3}
                />
                <small className="form-hint">{formData.bio.length}/200 characters</small>
              </div>

              <button
                type="submit"
                className="btn-primary-modern"
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

          {/* Password Change */}
          <div className="settings-section">
            <div className="section-header">
              <div className="section-icon">
                <i className="bi bi-shield-lock"></i>
              </div>
              <div className="section-info">
                <h2>Change Password</h2>
                <p>Update your account password</p>
              </div>
            </div>
            
            <form onSubmit={handlePasswordChange} className="settings-form">
              <div className="form-group">
                <label htmlFor="currentPassword">Current Password</label>
                <input
                  type="password"
                  id="currentPassword"
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleInputChange}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  className="form-input"
                  minLength={6}
                />
                <small className="form-hint">
                  Password must be at least 6 characters with uppercase, lowercase, and number
                </small>
                {formData.newPassword && (
                  <div className="password-strength">
                    <div className="strength-bar">
                      <div 
                        className="strength-fill" 
                        style={{ 
                          width: `${(passwordStrength.strength / 4) * 100}%`,
                          backgroundColor: passwordStrength.color 
                        }}
                      ></div>
                    </div>
                    <span 
                      className="strength-label" 
                      style={{ color: passwordStrength.color }}
                    >
                      {passwordStrength.label}
                    </span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="form-input"
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                className="btn-primary-modern"
                disabled={loading || !formData.currentPassword || !formData.newPassword || !formData.confirmPassword}
              >
                {loading ? (
                  <>
                    <i className="bi bi-arrow-clockwise spin"></i>
                    Changing...
                  </>
                ) : (
                  <>
                    <i className="bi bi-shield-check"></i>
                    Change Password
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Notifications & Privacy */}
          <div className="settings-section">
            <div className="section-header">
              <div className="section-icon">
                <i className="bi bi-bell"></i>
              </div>
              <div className="section-info">
                <h2>Notifications & Privacy</h2>
                <p>Control your notification and privacy preferences</p>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label>Push Notifications</label>
                <span className="setting-description">
                  Get notified about new messages
                </span>
              </div>
              <div className="setting-control">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.notifications}
                    onChange={() => handleSettingToggle('notifications')}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label>Sound Effects</label>
                <span className="setting-description">
                  Play sounds for messages and alerts
                </span>
              </div>
              <div className="setting-control">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.soundEnabled}
                    onChange={() => handleSettingToggle('soundEnabled')}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label>Email Notifications</label>
                <span className="setting-description">
                  Receive email updates about your chats
                </span>
              </div>
              <div className="setting-control">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.emailNotifications}
                    onChange={() => handleSettingToggle('emailNotifications')}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label>Show Online Status</label>
                <span className="setting-description">
                  Let others see when you're online
                </span>
              </div>
              <div className="setting-control">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.showOnlineStatus}
                    onChange={() => handleSettingToggle('showOnlineStatus')}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </div>

          {/* Data & Storage */}
          <div className="settings-section">
            <div className="section-header">
              <div className="section-icon">
                <i className="bi bi-database"></i>
              </div>
              <div className="section-info">
                <h2>Data & Storage</h2>
                <p>Manage your chat data and storage preferences</p>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label>Auto-save Chats</label>
                <span className="setting-description">
                  Automatically save your chat history
                </span>
              </div>
              <div className="setting-control">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.autoSaveChats}
                    onChange={() => handleSettingToggle('autoSaveChats')}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label>Export Data</label>
                <span className="setting-description">
                  Download a copy of your chat data
                </span>
              </div>
              <div className="setting-control">
                <button 
                  className="settings-btn"
                  onClick={handleExportData}
                  disabled={loading}
                >
                  {loading ? (
                    <i className="bi bi-arrow-clockwise spin"></i>
                  ) : (
                    <i className="bi bi-download"></i>
                  )}
                  Export
                </button>
              </div>
            </div>
          </div>

          {/* Account Info */}
          <div className="settings-section">
            <div className="section-header">
              <div className="section-icon">
                <i className="bi bi-info-circle"></i>
              </div>
              <div className="section-info">
                <h2>Account Information</h2>
                <p>Your account details and status</p>
              </div>
            </div>
            
            <div className="account-info">
              <div className="info-item">
                <span className="info-label">User ID:</span>
                <span className="info-value">{user?._id}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Member Since:</span>
                <span className="info-value">
                  {(user as any)?.createdAt ? new Date((user as any).createdAt).toLocaleDateString() : 'Unknown'}
                </span>
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

          {/* Danger Zone */}
          <div className="settings-section danger-section">
            <div className="section-header">
              <div className="section-icon danger-icon">
                <i className="bi bi-exclamation-triangle"></i>
              </div>
              <div className="section-info">
                <h2>Danger Zone</h2>
                <p>Irreversible and destructive actions</p>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label>Delete Account</label>
                <span className="setting-description">
                  Permanently delete your account and all data. This cannot be undone.
                </span>
              </div>              <div className="setting-control">
                <button 
                  className="settings-btn danger-btn"
                  onClick={handleDeleteAccount}
                  disabled={loading}
                >
                  {loading ? (
                    <i className="bi bi-arrow-clockwise spin"></i>
                  ) : (
                    <i className="bi bi-trash"></i>
                  )}
                  Delete Account
                </button>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label>Clear All Data</label>
                <span className="setting-description">
                  Remove all chat history and messages
                </span>
              </div>
              <div className="setting-control">
                <button 
                  className="settings-btn danger-btn"
                  onClick={handleClearAllData}
                  disabled={loading}
                >
                  {loading ? (
                    <i className="bi bi-arrow-clockwise spin"></i>
                  ) : (
                    <i className="bi bi-eraser"></i>
                  )}                  Clear Data
                </button>              </div>
            </div>
          </div>
        </div>
      </div>      </div>      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div 
          className="modal-overlay" 
          onClick={cancelDeleteAccount}
        >
          <div 
            className="modal delete-account-modal" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header danger-header">
              <h3>
                <i className="bi bi-exclamation-triangle-fill"></i>
                Delete Account
              </h3>
              <button 
                className="modal-close"
                onClick={cancelDeleteAccount}
              >
                <i className="bi bi-x"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="warning-message">
                <i className="bi bi-exclamation-triangle-fill"></i>
                <h4>This action cannot be undone!</h4>
              </div>
              
              <p>Are you sure you want to delete your account? The following will happen:</p>
              <ul className="consequences-list">
                <li><i className="bi bi-chat-dots"></i> All your chat history will be permanently deleted</li>
                <li><i className="bi bi-people"></i> You will be removed from all conversations</li>
                <li><i className="bi bi-person"></i> Your profile information will be deleted</li>
                <li><i className="bi bi-database"></i> You will lose access to all your data</li>
              </ul>
              
              <div className="form-group">
                <label htmlFor="deletePassword">
                  <i className="bi bi-shield-lock"></i>
                  Enter your current password to confirm:
                </label>                <input
                  type="password"
                  id="deletePassword"
                  className="form-input"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && deletePassword.trim()) {
                      confirmDeleteAccount();
                    }
                  }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-secondary"
                onClick={cancelDeleteAccount}
                disabled={loading}
              >
                <i className="bi bi-x-circle"></i>
                Cancel
              </button>
              <button 
                className="btn-danger"
                onClick={confirmDeleteAccount}
                disabled={loading || !deletePassword.trim()}
              >
                {loading ? (
                  <>
                    <i className="bi bi-arrow-clockwise spin"></i>
                    Deleting...
                  </>
                ) : (
                  <>
                    <i className="bi bi-trash"></i>
                    Delete Account
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Settings;
