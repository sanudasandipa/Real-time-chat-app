import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ChatList from '../components/ChatList';
import ChatWindow from '../components/ChatWindow';
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

const ChatRoom: React.FC = () => {
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [showChatList, setShowChatList] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
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
  };

  const handleBackToChats = () => {
    setShowChatList(true);
    setSelectedChat(null);
  };

  const handleNewChat = () => {
    // TODO: Implement new chat modal
    console.log('New chat clicked');
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
            </div>
            <div className="sidebar-header-right">
              <button className="icon-button" onClick={handleNewChat} title="New Chat">
                <i className="bi bi-plus-lg"></i>
              </button>
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
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatRoom;
