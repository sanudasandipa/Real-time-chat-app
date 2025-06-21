import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ChatList from '../components/ChatList';
import ChatWindow from '../components/ChatWindow';
import Notifications from '../components/Notifications';
import UserSearch from '../components/UserSearch';
import { chatAPI, notificationAPI } from '../services/api';
import socketService from '../services/socket';
import './ChatRoom.css';

interface Chat {
  _id: string;
  isGroup: boolean;
  users: any[];
  latestMessage?: any;
  chatName?: string;
  groupImage?: string;
  createdAt: string;
}

const ChatRoom: React.FC = () => {  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [showChatList, setShowChatList] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserSearchOpen, setIsUserSearchOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { chatId } = useParams<{ chatId?: string }>();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  // Load specific chat if chatId is provided in URL
  useEffect(() => {
    if (chatId) {
      loadChatById(chatId);
    }
  }, [chatId]);

  // Fetch initial notification count and set up socket listeners
  useEffect(() => {
    fetchUnreadNotificationCount();
    
    const socket = socketService.getSocket();
    if (socket) {
      socket.on('new-notification', () => {
        setUnreadNotifications(prev => prev + 1);
      });

      socket.on('notifications-read', (data: any) => {
        setUnreadNotifications(data.unreadCount);
      });

      socket.on('notification-deleted', (data: any) => {
        setUnreadNotifications(data.unreadCount);
      });

      socket.on('notifications-cleared', () => {
        setUnreadNotifications(0);
      });
    }

    return () => {
      if (socket) {
        socket.off('new-notification');
        socket.off('notifications-read');
        socket.off('notification-deleted');
        socket.off('notifications-cleared');
      }
    };
  }, []);

  const fetchUnreadNotificationCount = async () => {
    try {
      const response = await notificationAPI.getUnreadCount();
      setUnreadNotifications(response.data.data.unreadCount);
    } catch (error) {
      console.error('Failed to fetch notification count:', error);
    }
  };

  const loadChatById = async (chatId: string) => {
    try {
      const response = await chatAPI.getChatById(chatId);
      const chat = response.data.data.chat;
      setSelectedChat(chat);
      setShowChatList(false);
    } catch (error) {
      console.error('Error loading chat:', error);
      // If chat not found, redirect to general chat page
      navigate('/chat');
    }
  };
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  const handleChatSelect = (chat: Chat) => {
    setSelectedChat(chat);
    setShowChatList(false); // Hide chat list on mobile when chat is selected
    // Update URL to reflect selected chat
    navigate(`/chat/${chat._id}`, { replace: true });
  };

  const handleBackToChats = () => {
    setShowChatList(true);
    setSelectedChat(null);
    // Update URL to general chat page
    navigate('/chat', { replace: true });
  };
  const handleNewChat = () => {
    setIsUserSearchOpen(true);
  };

  const handleChatCreated = (newChat: Chat) => {
    setSelectedChat(newChat);
    setShowChatList(false);
    navigate(`/chat/${newChat._id}`, { replace: true });
  };

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
    navigate('/login');
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsUserMenuOpen(false);
  };
  const toggleUserMenu = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  const toggleNotifications = () => {
    setIsNotificationsOpen(!isNotificationsOpen);
  };

  return (
    <div className="chat-room">
      {/* Main Chat Interface */}
      <div className="chat-container">
        {/* Chat Sidebar */}
        <div 
          className={`chat-sidebar ${
            showChatList ? 'show' : 'hide'
          }`}
        >
          {/* Sidebar Header */}
          <div className="sidebar-header">
            <div className="sidebar-header-left">
              <h2 className="app-title">Chatter</h2>
            </div>            <div className="sidebar-header-right">
              <button className="icon-button" onClick={handleNewChat} title="New Chat">
                <i className="bi bi-plus-lg"></i>
              </button>
              
              {/* Notifications Button */}
              <div className="notification-wrapper" ref={notificationRef}>
                <button 
                  className="icon-button notification-button" 
                  onClick={toggleNotifications}
                  title="Notifications"
                >
                  <i className="bi bi-bell"></i>
                  {unreadNotifications > 0 && (
                    <span className="notification-badge">
                      {unreadNotifications > 99 ? '99+' : unreadNotifications}
                    </span>
                  )}
                </button>
                
                <Notifications 
                  isOpen={isNotificationsOpen} 
                  onClose={() => setIsNotificationsOpen(false)} 
                />
              </div>

              <div className="user-menu-wrapper" ref={dropdownRef}>
                <button className="user-avatar-button" onClick={toggleUserMenu}>
                  {user?.profilePic ? (
                    <img src={user.profilePic} alt="Profile" className="user-avatar" />
                  ) : (
                    <div className="user-avatar placeholder">
                      {user?.username?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </button>
                
                {isUserMenuOpen && (
                  <div className="user-dropdown">
                    <div className="user-info">
                      <div className="user-name">{user?.username}</div>
                      <div className="user-status">Online</div>
                    </div>
                    <div className="dropdown-divider"></div>
                    <button
                      className="dropdown-item"
                      onClick={() => handleNavigation('/profile')}
                    >
                      <i className="bi bi-person"></i>
                      Profile
                    </button>
                    <button
                      className="dropdown-item"
                      onClick={() => handleNavigation('/settings')}
                    >
                      <i className="bi bi-gear"></i>
                      Settings
                    </button>
                    <div className="dropdown-divider"></div>
                    <button
                      className="dropdown-item logout"
                      onClick={handleLogout}
                    >
                      <i className="bi bi-box-arrow-right"></i>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chat List */}
          <div className="chat-list-container">
            <ChatList
              selectedChat={selectedChat}
              onChatSelect={handleChatSelect}
              onNewChat={handleNewChat}
            />
          </div>
        </div>

        {/* Chat Window */}
        <div 
          className={`chat-main ${
            selectedChat ? 'show' : 'hide'
          }`}
        >
          {selectedChat ? (
            <ChatWindow 
              chat={selectedChat} 
              onBack={handleBackToChats}
            />
          ) : (
            <div className="chat-welcome">
              <div className="welcome-content">
                <i className="bi bi-chat-square-dots welcome-icon"></i>
                <h3 className="welcome-title">Welcome to Chatter!</h3>
                <p className="welcome-subtitle">Select a chat to start messaging</p>
              </div>            </div>
          )}
        </div>
      </div>

      {/* User Search Modal */}
      <UserSearch
        isOpen={isUserSearchOpen}
        onClose={() => setIsUserSearchOpen(false)}
        onChatCreated={handleChatCreated}
      />
    </div>
  );
};

export default ChatRoom;
