import React, { useState, useEffect, useRef } from 'react';
import { authAPI, chatAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toastService from '../services/toast';
import './UserSearch.css';

interface User {
  _id: string;
  username: string;
  email: string;
  profilePic?: string;
}

interface UserSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onChatCreated: (chat: any) => void;
}

const UserSearch: React.FC<UserSearchProps> = ({ isOpen, onClose, onChatCreated }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (searchTerm.trim()) {
      const timeout = setTimeout(() => {
        searchUsers();
      }, 500); // Debounce search
      setSearchTimeout(timeout);
    } else {
      setUsers([]);
    }

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTerm]);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const searchUsers = async () => {
    try {
      setLoading(true);
      const response = await authAPI.searchUsers(searchTerm);
      const searchResults = response.data.data.users || response.data.users || [];
      
      // Filter out current user
      const filteredUsers = searchResults.filter(
        (user: User) => user._id !== currentUser?._id
      );
      
      setUsers(filteredUsers);
    } catch (error: any) {
      console.error('Search users error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to search users';
      toastService.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const createPrivateChat = async (userId: string) => {
    try {
      setLoading(true);
      const response = await chatAPI.createPrivateChat(userId);
      const newChat = response.data.data?.chat || response.data.chat;
      
      onChatCreated(newChat);
      onClose();
      setSearchTerm('');
      setUsers([]);
      
      toastService.success('Chat created successfully!');
    } catch (error: any) {
      console.error('Create chat error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to create chat';
      toastService.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getProfileImageSrc = (user: User) => {
    if (user.profilePic) {
      return user.profilePic;
    }
    // Return placeholder image
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=667eea&color=ffffff&size=48`;
  };

  if (!isOpen) return null;

  return (
    <div className="user-search-overlay">
      <div className="user-search-modal" ref={modalRef}>
        <div className="modal-header">
          <h2>Start New Chat</h2>
          <button className="close-button" onClick={onClose}>
            <i className="bi bi-x"></i>
          </button>
        </div>

        <div className="search-container">
          <div className="search-input-wrapper">
            <i className="bi bi-search search-icon"></i>
            <input
              type="text"
              className="search-input"
              placeholder="Search users by username or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="search-results">
          {loading && searchTerm ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Searching users...</p>
            </div>
          ) : users.length > 0 ? (
            <div className="users-list">
              {users.map((user) => (
                <div 
                  key={user._id} 
                  className="user-item"
                  onClick={() => createPrivateChat(user._id)}
                >
                  <div className="user-avatar">
                    <img 
                      src={getProfileImageSrc(user)} 
                      alt={user.username}
                      className="avatar-image"
                    />
                  </div>
                  <div className="user-info">
                    <h3 className="user-name">{user.username}</h3>
                    <p className="user-email">{user.email}</p>
                  </div>
                  <div className="chat-action">
                    <i className="bi bi-chat-dots"></i>
                  </div>
                </div>
              ))}
            </div>
          ) : searchTerm && !loading ? (
            <div className="empty-state">
              <i className="bi bi-person-x"></i>
              <p>No users found</p>
              <span>Try searching with a different term</span>
            </div>
          ) : (
            <div className="empty-state">
              <i className="bi bi-search"></i>
              <p>Search for users</p>
              <span>Enter a username or email to find users</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserSearch;
