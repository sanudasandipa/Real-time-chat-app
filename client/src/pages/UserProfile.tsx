import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { authAPI, chatAPI } from '../services/api';
import toastService from '../services/toast';
import './UserProfile.css';

const UserProfile: React.FC = () => {
  const { user, updateProfile, uploadProfilePic, loading } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    bio: user?.bio || '',
    phoneNumber: user?.phoneNumber || '',
    location: user?.location || ''
  });

  // Update form data when user data changes
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        bio: user.bio || '',
        phoneNumber: user.phoneNumber || '',
        location: user.location || ''
      });
    }
  }, [user]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Friends management states
  const [usersTab, setUsersTab] = useState<'all' | 'friends' | 'pending' | 'sent'>('all');
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreUsers, setHasMoreUsers] = useState(true);

  // Fetch friends data on component mount
  useEffect(() => {
    fetchFriendsData();
  }, []);
  
  // Fetch users when tab changes or on initial load
  useEffect(() => {
    if (usersTab === 'all') {
      fetchAllUsers(1);
    }
  }, [usersTab]);
  // Search when query changes
  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchQuery.trim()) {
        searchUsers();
      } else {
        setSearchResults([]);
      }
    }, 500);
    
    return () => clearTimeout(delaySearch);
  }, [searchQuery]);
  const fetchFriendsData = async () => {
    setIsLoading(true);
    try {
      const [friendsRes, pendingRes, sentRes] = await Promise.all([
        authAPI.getFriends().catch(() => ({ data: { data: [] } })),
        authAPI.getPendingRequests().catch(() => ({ data: { data: [] } })),
        authAPI.getSentRequests().catch(() => ({ data: { data: [] } }))
      ]);
      
      setFriends(friendsRes.data.data || []);
      setPendingRequests(pendingRes.data.data || []);
      setSentRequests(sentRes.data.data || []);
    } catch (error) {
      console.error('Error fetching friends data:', error);
      // Don't show error toast on initial load - just log it
    } finally {
      setIsLoading(false);
    }
  };
  const fetchAllUsers = async (page = 1) => {
    if (!hasMoreUsers && page > 1) return;
    
    setIsLoading(true);
    try {
      const response = await authAPI.getAllUsers(page);
      const newUsers = response.data.data || [];
      
      setAllUsers(prev => page === 1 ? newUsers : [...prev, ...newUsers]);
      setHasMoreUsers(newUsers.length === 20); // Assuming 20 is the page limit
      setCurrentPage(page);
    } catch (error) {
      console.error('Error fetching users:', error);
      // Don't show error toast on initial load - just log it
    } finally {
      setIsLoading(false);
    }
  };
  const searchUsers = async () => {
    setIsLoading(true);
    
    try {
      const response = await authAPI.searchUsers(searchQuery);
      setSearchResults(response.data.data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      toastService.error('Failed to search users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendFriendRequest = async (userId: string) => {
    try {
      await authAPI.sendFriendRequest(userId);
      toastService.success('Friend request sent!');
      // Update the sent requests list
      setSentRequests(prev => [...prev, allUsers.find(user => user._id === userId)]);
      fetchAllUsers(1); // Refresh the users list
    } catch (error) {
      console.error('Error sending friend request:', error);
      toastService.error('Failed to send friend request');
    }
  };

  const handleAcceptRequest = async (userId: string) => {
    try {
      await authAPI.acceptFriendRequest(userId);
      toastService.success('Friend request accepted!');
      // Update friends and pending lists
      const acceptedUser = pendingRequests.find(req => req._id === userId);
      setFriends(prev => [...prev, acceptedUser]);
      setPendingRequests(prev => prev.filter(req => req._id !== userId));
    } catch (error) {
      console.error('Error accepting friend request:', error);
      toastService.error('Failed to accept friend request');
    }
  };

  const handleRejectRequest = async (userId: string) => {
    try {
      await authAPI.rejectFriendRequest(userId);
      toastService.success('Friend request rejected');
      // Remove from pending list
      setPendingRequests(prev => prev.filter(req => req._id !== userId));
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      toastService.error('Failed to reject friend request');
    }
  };

  const handleCancelRequest = async (userId: string) => {
    try {
      await authAPI.cancelFriendRequest(userId);
      toastService.success('Friend request cancelled');
      // Remove from sent list
      setSentRequests(prev => prev.filter(req => req._id !== userId));
    } catch (error) {
      console.error('Error cancelling friend request:', error);
      toastService.error('Failed to cancel friend request');
    }
  };

  const handleRemoveFriend = async (userId: string) => {
    try {
      await authAPI.removeFriend(userId);
      toastService.success('Friend removed');
      // Remove from friends list
      setFriends(prev => prev.filter(friend => friend._id !== userId));
    } catch (error) {
      console.error('Error removing friend:', error);
      toastService.error('Failed to remove friend');
    }
  };  const handleStartChat = async (userId: string) => {
    try {
      setIsLoading(true);
      console.log('🚀 Starting chat with user:', userId);
      
      const response = await chatAPI.createPrivateChat(userId);
      console.log('📨 Chat API response:', response.data);
      
      const chat = response.data.data.chat;
      console.log('💬 Extracted chat:', chat);
      
      if (chat && chat._id) {
        console.log('✅ Navigating to chat:', chat._id);
        // Navigate to the chat
        navigate(`/chat/${chat._id}`);
      } else {
        console.error('❌ Invalid chat response - no chat ID found');
        throw new Error('Invalid chat response');
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      toastService.error('Failed to start chat');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = () => {
    fetchAllUsers(currentPage + 1);
  };

  // Determine user status for action buttons
  const getUserStatus = (userId: string) => {
    if (friends.some(friend => friend._id === userId)) {
      return 'friend';
    }
    if (sentRequests.some(req => req._id === userId)) {
      return 'sent';
    }
    if (pendingRequests.some(req => req._id === userId)) {
      return 'pending';
    }
    return 'none';
  };  // User action button based on relationship status
  const renderUserActionButton = (targetUser: any) => {
    const status = getUserStatus(targetUser._id);
    
    // Don't show buttons for current user
    if (targetUser._id === user?._id) return null;
    
    switch (status) {
      case 'friend':
        return (
          <div className="user-actions">
            <button className="btn-outline-primary" onClick={() => handleStartChat(targetUser._id)}>
              <i className="bi bi-chat-dots"></i> Message
            </button>
            <button className="btn-outline-danger" onClick={() => handleRemoveFriend(targetUser._id)}>
              <i className="bi bi-person-x"></i> Remove
            </button>
          </div>
        );
      case 'sent':
        return (
          <button className="btn-outline-secondary" onClick={() => handleCancelRequest(targetUser._id)}>
            <i className="bi bi-x-circle"></i> Cancel Request
          </button>
        );
      case 'pending':
        return (
          <div className="user-actions">
            <button className="btn-outline-success" onClick={() => handleAcceptRequest(targetUser._id)}>
              <i className="bi bi-check"></i> Accept
            </button>
            <button className="btn-outline-danger" onClick={() => handleRejectRequest(targetUser._id)}>
              <i className="bi bi-x"></i> Reject
            </button>
          </div>
        );
      default:
        return (
          <button className="btn-outline-primary" onClick={() => handleSendFriendRequest(targetUser._id)}>
            <i className="bi bi-person-plus"></i> Add Friend
          </button>
        );
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditing) return;

    try {
      await updateProfile(formData);
      setIsEditing(false);
    } catch (error) {
      console.error('Profile update failed:', error);
    }
  };

  const handleProfilePicClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toastService.error('File size must be less than 5MB');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toastService.error('Please select an image file');
        return;
      }

      try {
        await uploadProfilePic(file);
      } catch (error) {
        console.error('Profile picture upload failed:', error);
      }
    }
  };
  const handleCancel = () => {
    setFormData({
      username: user?.username || '',
      email: user?.email || '',
      bio: user?.bio || '',
      phoneNumber: user?.phoneNumber || '',
      location: user?.location || ''
    });
    setIsEditing(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };  return (
    <div className={`user-profile ${theme}`}>
      {/* Header with back button */}
      <div className="profile-page-header">
        <button className="back-button" onClick={() => navigate('/chat')}>
          <i className="bi bi-arrow-left"></i>
        </button>
        <h1>Profile</h1>
        <div></div> {/* Spacer for center alignment */}
      </div>
      
      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-pic-container">
            <div className="profile-pic" onClick={handleProfilePicClick}>
              {user?.profilePic ? (
                <img src={user.profilePic} alt="Profile" />
              ) : (
                <div className="profile-initials">
                  {getInitials(user?.username || 'U')}
                </div>
              )}
              <div className="profile-pic-overlay">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 12C9 13.3807 7.88071 14.5 6.5 14.5C5.11929 14.5 4 13.3807 4 12C4 10.6193 5.11929 9.5 6.5 9.5C7.88071 9.5 9 10.6193 9 12Z" stroke="currentColor" strokeWidth="2"/>
                  <path d="M20 12C20 13.3807 18.8807 14.5 17.5 14.5C16.1193 14.5 15 13.3807 15 12C15 10.6193 16.1193 9.5 17.5 9.5C18.8807 9.5 20 10.6193 20 12Z" stroke="currentColor" strokeWidth="2"/>
                  <path d="M14.5 6L9.5 6C8.11929 6 7 7.11929 7 8.5L7 15.5C7 16.8807 8.11929 18 9.5 18L14.5 18C15.8807 18 17 16.8807 17 15.5L17 8.5C17 7.11929 15.8807 6 14.5 6Z" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>
          <div className="profile-info">
            <h2>{user?.username}</h2>
            <p className="profile-email">{user?.email}</p>
            <div className="profile-status">
              <span className={`status-indicator ${user?.isOnline ? 'online' : 'offline'}`}></span>
              {user?.isOnline ? 'Online' : 'Offline'}
            </div>
          </div>
        </div>

        <div className="profile-actions">
          {!isEditing ? (
            <button className="btn-primary" onClick={() => setIsEditing(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10217 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Edit Profile
            </button>
          ) : (
            <div className="edit-actions">
              <button className="btn-secondary" onClick={handleCancel} disabled={loading}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>

        {/* Profile Form Section */}
        <form className="profile-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <h3>Personal Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  required
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
                  disabled={!isEditing}
                  required
                />
              </div>
            </div>            <div className="form-row">
              <div className="form-group">
                <label htmlFor="phoneNumber">Phone</label>
                <input
                  type="tel"
                  id="phoneNumber"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="Enter your phone number"
                />
              </div>
              <div className="form-group">
                <label htmlFor="location">Location</label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="Enter your location"
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="bio">Bio</label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="Tell us about yourself..."
                rows={4}
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Account Statistics</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="stat-info">
                  <span className="stat-number">0</span>
                  <span className="stat-label">Chats</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="stat-info">
                  <span className="stat-number">0</span>
                  <span className="stat-label">Messages</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="8.5" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M20 8V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M23 11H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>                
                </div>
                <div className="stat-info">
                  <span className="stat-number">{friends.length}</span>
                  <span className="stat-label">Friends</span>
                </div>
              </div>
            </div>
          </div>

          {/* NEW SECTION: Friends and People */}
          <div className="form-section friends-section">
            <h3>Friends & People</h3>
            
            {/* Tabs for switching between friends/users views */}
            <div className="friends-tabs">
              <button 
                className={`tab-button ${usersTab === 'all' ? 'active' : ''}`} 
                onClick={() => setUsersTab('all')}
              >
                <i className="bi bi-people"></i> Discover
              </button>
              <button 
                className={`tab-button ${usersTab === 'friends' ? 'active' : ''}`} 
                onClick={() => setUsersTab('friends')}
              >
                <i className="bi bi-person-check"></i> Friends
                {friends.length > 0 && <span className="badge">{friends.length}</span>}
              </button>
              <button 
                className={`tab-button ${usersTab === 'pending' ? 'active' : ''}`} 
                onClick={() => setUsersTab('pending')}
              >
                <i className="bi bi-envelope"></i> Requests
                {pendingRequests.length > 0 && <span className="badge">{pendingRequests.length}</span>}
              </button>
              <button 
                className={`tab-button ${usersTab === 'sent' ? 'active' : ''}`} 
                onClick={() => setUsersTab('sent')}
              >
                <i className="bi bi-send"></i> Sent
                {sentRequests.length > 0 && <span className="badge">{sentRequests.length}</span>}
              </button>
            </div>
            
            {/* Search bar */}
            <div className="search-container">
              <div className="search-input-wrapper">
                <i className="bi bi-search search-icon"></i>
                <input 
                  type="text" 
                  placeholder="Search for friends..." 
                  className="search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button 
                    className="clear-search-btn" 
                    onClick={() => setSearchQuery('')}
                  >
                    <i className="bi bi-x"></i>
                  </button>
                )}
              </div>
            </div>
            
            {/* Users/friends listing */}
            <div className="users-container">
              {isLoading && <div className="loading-spinner"><i className="bi bi-arrow-clockwise spin"></i> Loading...</div>}
              
              {!isLoading && usersTab === 'all' && (
                <>
                  {searchQuery ? (
                    searchResults.length > 0 ? (                      <div className="users-grid">
                        {searchResults.map((searchUser) => (
                          <div className="user-card" key={searchUser._id}>
                            <div className="user-card-avatar">
                              {searchUser.profilePic ? (
                                <img src={searchUser.profilePic} alt={searchUser.username} />
                              ) : (
                                <div className="user-initials">{getInitials(searchUser.username)}</div>
                              )}
                              <span className={`status-dot ${searchUser.isOnline ? 'online' : 'offline'}`}></span>
                            </div>
                            <div className="user-card-info">
                              <h4>{searchUser.username}</h4>
                              <p>{searchUser.bio || 'No bio available'}</p>
                            </div>
                            <div className="user-card-actions">
                              {renderUserActionButton(searchUser)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state">
                        <i className="bi bi-search"></i>
                        <p>No users found matching "{searchQuery}"</p>
                      </div>
                    )
                  ) : (
                    <>                      <div className="users-grid">
                        {allUsers.map((userItem) => (
                          <div className="user-card" key={userItem._id}>
                            <div className="user-card-avatar">
                              {userItem.profilePic ? (
                                <img src={userItem.profilePic} alt={userItem.username} />
                              ) : (
                                <div className="user-initials">{getInitials(userItem.username)}</div>
                              )}
                              <span className={`status-dot ${userItem.isOnline ? 'online' : 'offline'}`}></span>
                            </div>
                            <div className="user-card-info">
                              <h4>{userItem.username}</h4>
                              <p>{userItem.bio || 'No bio available'}</p>
                            </div>
                            <div className="user-card-actions">
                              {renderUserActionButton(userItem)}
                            </div>
                          </div>
                        ))}
                      </div>
                      {hasMoreUsers && (
                        <div className="load-more">
                          <button className="btn-text" onClick={handleLoadMore}>
                            Load More <i className="bi bi-chevron-down"></i>
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
              
              {!isLoading && usersTab === 'friends' && (
                <>
                  {friends.length > 0 ? (
                    <div className="users-grid">
                      {friends.map((friend) => (
                        <div className="user-card" key={friend._id}>
                          <div className="user-card-avatar">
                            {friend.profilePic ? (
                              <img src={friend.profilePic} alt={friend.username} />
                            ) : (
                              <div className="user-initials">{getInitials(friend.username)}</div>
                            )}
                            <span className={`status-dot ${friend.isOnline ? 'online' : 'offline'}`}></span>
                          </div>
                          <div className="user-card-info">
                            <h4>{friend.username}</h4>
                            <p>{friend.bio || 'No bio available'}</p>
                          </div>
                          <div className="user-card-actions">
                            <button className="btn-outline-primary" onClick={() => handleStartChat(friend._id)}>
                              <i className="bi bi-chat-dots"></i> Message
                            </button>
                            <button className="btn-outline-danger" onClick={() => handleRemoveFriend(friend._id)}>
                              <i className="bi bi-person-x"></i> Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <i className="bi bi-people"></i>
                      <p>You don't have any friends yet</p>
                      <button className="btn-primary" onClick={() => setUsersTab('all')}>
                        Find Friends
                      </button>
                    </div>
                  )}                </>
              )}
              
              {!isLoading && usersTab === 'pending' && (
                <>
                  {pendingRequests.length > 0 ? (
                    <div className="users-grid">
                      {pendingRequests.map((request) => (
                        <div className="user-card" key={request._id}>
                          <div className="user-card-avatar">
                            {request.profilePic ? (
                              <img src={request.profilePic} alt={request.username} />
                            ) : (
                              <div className="user-initials">{getInitials(request.username)}</div>
                            )}
                            <span className={`status-dot ${request.isOnline ? 'online' : 'offline'}`}></span>
                          </div>
                          <div className="user-card-info">
                            <h4>{request.username}</h4>
                            <p>{request.bio || 'No bio available'}</p>
                          </div>
                          <div className="user-card-actions">
                            <button className="btn-outline-success" onClick={() => handleAcceptRequest(request._id)}>
                              <i className="bi bi-check"></i> Accept
                            </button>
                            <button className="btn-outline-danger" onClick={() => handleRejectRequest(request._id)}>
                              <i className="bi bi-x"></i> Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <i className="bi bi-envelope"></i>
                      <p>No pending friend requests</p>
                    </div>
                  )}
                </>
              )}
              
              {!isLoading && usersTab === 'sent' && (
                <>
                  {sentRequests.length > 0 ? (
                    <div className="users-grid">
                      {sentRequests.map((request) => (
                        <div className="user-card" key={request._id}>
                          <div className="user-card-avatar">
                            {request.profilePic ? (
                              <img src={request.profilePic} alt={request.username} />
                            ) : (
                              <div className="user-initials">{getInitials(request.username)}</div>
                            )}
                            <span className={`status-dot ${request.isOnline ? 'online' : 'offline'}`}></span>
                          </div>
                          <div className="user-card-info">
                            <h4>{request.username}</h4>
                            <p>{request.bio || 'No bio available'}</p>
                          </div>
                          <div className="user-card-actions">
                            <button className="btn-outline-secondary" onClick={() => handleCancelRequest(request._id)}>
                              <i className="bi bi-x-circle"></i> Cancel Request
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <i className="bi bi-send"></i>
                      <p>No sent friend requests</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserProfile;
