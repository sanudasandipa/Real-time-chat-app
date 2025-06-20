import React, { useState, useEffect, useRef } from 'react';
import { messageAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import socketService from '../services/socket';
import MessageInput from './MessageInput';
import { getChatImage, getProfileImage } from '../utils/placeholders';
import './ChatWindow.css';

interface Message {
  _id: string;
  sender: {
    _id: string;
    username: string;
    profilePic?: string;
  };
  content: string;
  imageUrl?: string;
  createdAt: string;
}

interface Chat {
  _id: string;
  isGroup: boolean;
  users: any[];
  chatName?: string;
  groupImage?: string;
}

interface ChatWindowProps {
  chat: Chat;
  onBack?: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ chat, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (chat) {
      fetchMessages();
      socketService.joinChat(chat._id);

      // Listen for new messages
      socketService.onNewMessage((message: Message) => {
        setMessages(prev => [...prev, message]);
      });      // Listen for typing events
      socketService.onTyping((data: any) => {
        if (data.userId !== user?._id) {
          setTypingUsers(prev => [...prev.filter(id => id !== data.userId), data.userId]);
          setTimeout(() => {
            setTypingUsers(prev => prev.filter(id => id !== data.userId));
          }, 3000);
        }
      });

      return () => {
        socketService.leaveChat(chat._id);
      };
    }
  }, [chat, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await messageAPI.getMessages(chat._id);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getChatName = () => {
    if (chat.isGroup) {
      return chat.chatName || 'Group Chat';
    }
    const otherUser = chat.users.find(u => u._id !== user?._id);
    return otherUser?.username || 'Unknown User';
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (date: string) => {
    const messageDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return messageDate.toLocaleDateString();
    }
  };

  const groupMessagesByDate = (messages: Message[]) => {
    const grouped: { [key: string]: Message[] } = {};
    
    messages.forEach(message => {
      const date = new Date(message.createdAt).toDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(message);
    });
    
    return grouped;
  };

  const groupedMessages = groupMessagesByDate(messages);

  if (loading) {
    return (
      <div className="chat-window">
        <div className="chat-loading">
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      {/* Chat Header */}
      <div className="chat-header">
        <div className="header-content">
          {onBack && (
            <button className="back-btn" onClick={onBack}>
              <i className="bi bi-arrow-left"></i>
            </button>
          )}
          
          <div className="chat-info">
            <img
              src={getChatImage(chat, user, 40)}
              alt={getChatName()}
              className="chat-avatar"
            />
            <div className="chat-details">
              <h3 className="chat-title">{getChatName()}</h3>
              <p className="chat-status">
                {chat.isGroup 
                  ? `${chat.users.length} members` 
                  : 'Online'
                }
              </p>
            </div>
          </div>

          <div className="header-actions">
            <button className="action-btn" title="Video call">
              <i className="bi bi-camera-video"></i>
            </button>
            <button className="action-btn" title="Voice call">
              <i className="bi bi-telephone"></i>
            </button>
            <button className="action-btn" title="More options">
              <i className="bi bi-three-dots-vertical"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="messages-container">
        <div className="messages-content">
          {Object.entries(groupedMessages).map(([date, dayMessages]) => (
            <div key={date} className="message-day-group">
              <div className="date-separator">
                <span className="date-label">{formatDate(date)}</span>
              </div>
              
              {dayMessages.map((message) => {
                const isCurrentUser = message.sender._id === user?._id;
                
                return (
                  <div key={message._id} className={`message-wrapper ${isCurrentUser ? 'sent' : 'received'}`}>
                    {!isCurrentUser && chat.isGroup && (
                      <div className="sender-avatar">
                        <img
                          src={getProfileImage(message.sender, 28)}
                          alt={message.sender.username}
                          className="avatar-small"
                        />
                      </div>
                    )}
                    
                    <div className="message-bubble">
                      {!isCurrentUser && chat.isGroup && (
                        <div className="sender-name">{message.sender.username}</div>
                      )}
                      
                      {message.imageUrl && (
                        <div className="message-image">
                          <img src={message.imageUrl} alt="Shared image" />
                        </div>
                      )}
                      
                      {message.content && (
                        <div className="message-text">{message.content}</div>
                      )}
                      
                      <div className="message-meta">
                        <span className="message-time">{formatTime(message.createdAt)}</span>
                        {isCurrentUser && (
                          <div className="message-status">
                            <i className="bi bi-check2-all"></i>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {/* Typing Indicator */}
          {typingUsers.length > 0 && (
            <div className="message-wrapper received">
              <div className="message-bubble typing">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <div className="message-input-container">
        <MessageInput chatId={chat._id} />
      </div>
    </div>
  );
};

export default ChatWindow;
