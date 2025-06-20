import React, { useState, useEffect } from 'react';
import { chatAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toastService from '../services/toast';
import { getChatImage } from '../utils/placeholders';
import './ChatList.css';

interface Chat {
  _id: string;
  isGroup: boolean;
  users: any[];
  latestMessage?: any;
  chatName?: string;
  groupImage?: string;
  createdAt: string;
}

interface ChatListProps {
  selectedChat: Chat | null;
  onChatSelect: (chat: Chat) => void;
  onNewChat: () => void;
}

const ChatList: React.FC<ChatListProps> = ({ selectedChat, onChatSelect, onNewChat }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    fetchChats();
  }, []);

  const fetchChats = async () => {
    try {
      const response = await chatAPI.getChats();
      setChats(response.data.chats || []);
    } catch (error: any) {
      console.error('Failed to fetch chats:', error);
      const errorMessage = error.response?.data?.message || 'Failed to load chats';
      toastService.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getChatName = (chat: Chat) => {
    if (chat.isGroup) {
      return chat.chatName || 'Group Chat';
    }
    const otherUser = chat.users.find(u => u._id !== user?._id);
    return otherUser?.username || 'Unknown User';
  };

  const getChatImageSrc = (chat: Chat) => {
    return getChatImage(chat, user, 48);
  };

  const getLastMessagePreview = (chat: Chat) => {
    if (!chat.latestMessage) return 'No messages yet';
    
    const message = chat.latestMessage;
    if (message.imageUrl) return '📷 Image';
    return message.content?.substring(0, 50) + (message.content?.length > 50 ? '...' : '');
  };

  const formatTime = (date: string) => {
    const messageDate = new Date(date);
    const now = new Date();
    const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return messageDate.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
  };

  const filteredChats = chats.filter(chat =>
    getChatName(chat).toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="chat-list-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }
  return (
    <div className="chat-list">
      {/* Search Bar */}
      <div className="chat-list-header">
        <div className="search-container">
          <div className="search-input-wrapper">
            <i className="bi bi-search search-icon"></i>
            <input
              type="text"
              className="search-input"
              placeholder="Search chats..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>      {/* Chat List */}
      <div className="chat-list-content custom-scrollbar">
        {filteredChats.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <i className="bi bi-chat-dots"></i>
            </div>
            <h3>No chats found</h3>
            <p>Start a conversation to see your chats here</p>
            <button className="start-chat-btn hover-lift" onClick={onNewChat}>
              Start a conversation
            </button>
          </div>
        ) : (
          <div className="chats-container">            {filteredChats.map((chat) => (
              <div
                key={chat._id}
                className={`chat-item smooth-transition ${selectedChat?._id === chat._id ? 'active' : ''}`}
                onClick={() => onChatSelect(chat)}
              >
                <div className="chat-avatar">
                  <img
                    src={getChatImageSrc(chat)}
                    alt={getChatName(chat)}
                    className="avatar-image"
                  />
                  {!chat.isGroup && (
                    <div className="online-indicator"></div>
                  )}
                </div>
                
                <div className="chat-info">
                  <div className="chat-header">
                    <h3 className="chat-name">{getChatName(chat)}</h3>
                    {chat.latestMessage && (
                      <span className="chat-time">
                        {formatTime(chat.latestMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  <div className="chat-preview">
                    <p className="last-message">
                      {getLastMessagePreview(chat)}
                    </p>
                    {/* Add unread count if needed */}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatList;
