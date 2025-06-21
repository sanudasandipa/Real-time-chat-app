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
  mediaUrl?: string;
  mediaType?: string;
  createdAt: string;
  readBy?: Array<{
    user: string;
    readAt: string;
  }>;
  deliveredTo?: Array<{
    user: string;
    deliveredAt: string;
  }>;
  messageType?: string;
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
  const [typingUsers, setTypingUsers] = useState<Array<{userId: string, username: string}>>([]);
  const [userStatuses, setUserStatuses] = useState<{[key: string]: {isOnline: boolean, lastSeen: Date}}>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const typingTimeouts = useRef<{[key: string]: number}>({});  useEffect(() => {
    if (chat && user) {
      fetchMessages();
      socketService.joinChat(chat._id);

      console.log('Setting up socket listeners for chat:', chat._id);

      // Listen for new messages
      const handleNewMessage = (message: Message) => {
        console.log('Received new message:', message);
        setMessages(prev => {
          // Check if message already exists to prevent duplicates
          const exists = prev.some(m => m._id === message._id);
          if (exists) return prev;
          return [...prev, message];
        });
        
        // Mark message as delivered automatically for non-group chats
        if (!chat.isGroup && message.sender._id !== user?._id) {
          socketService.markMessageRead(message._id, chat._id);
        }
      };

      // Clear any existing listeners first
      const socket = socketService.getSocket();
      if (socket) {
        socket.off('new-message');
        socket.off('message-read');
        socket.off('message-delivered');
        socket.off('message-status-updated');
        socket.off('user-typing');
        socket.off('user-stop-typing');
        socket.off('user-status-change');
      }

      socketService.onNewMessage(handleNewMessage);

      // Listen for message status updates
      socketService.onMessageRead((data: any) => {
        setMessages(prev => prev.map(msg => {
          if (msg._id === data.messageId) {
            return {
              ...msg,
              readBy: [...(msg.readBy || []), data.readBy]
            };
          }
          return msg;
        }));
      });

      socketService.onMessageDelivered((data: any) => {
        setMessages(prev => prev.map(msg => {
          if (msg._id === data.messageId) {
            return {
              ...msg,
              deliveredTo: data.deliveredTo
            };
          }
          return msg;
        }));
      });

      socketService.onMessageStatusUpdated((data: any) => {
        setMessages(prev => prev.map(msg => {
          if (msg._id === data.messageId) {
            return {
              ...msg,
              readBy: data.readBy,
              deliveredTo: data.deliveredTo
            };
          }
          return msg;
        }));
      });

      // Listen for typing events
      socketService.onTyping((data: any) => {
        if (data.userId !== user?._id) {
          setTypingUsers(prev => {
            const filtered = prev.filter(t => t.userId !== data.userId);
            return [...filtered, { userId: data.userId, username: data.username }];
          });
          
          // Clear typing timeout for this user
          if (typingTimeouts.current[data.userId]) {
            clearTimeout(typingTimeouts.current[data.userId]);
          }
          
          // Set timeout to remove typing indicator
          typingTimeouts.current[data.userId] = setTimeout(() => {
            setTypingUsers(prev => prev.filter(t => t.userId !== data.userId));
          }, 3000) as unknown as number;
        }
      });

      socketService.onStopTyping((data: any) => {
        if (data.userId !== user?._id) {
          setTypingUsers(prev => prev.filter(t => t.userId !== data.userId));
          if (typingTimeouts.current[data.userId]) {
            clearTimeout(typingTimeouts.current[data.userId]);
            delete typingTimeouts.current[data.userId];
          }
        }
      });      // Listen for user status changes
      socketService.onUserStatusChange((data: any) => {
        setUserStatuses(prev => ({
          ...prev,
          [data.userId]: {
            isOnline: data.isOnline,
            lastSeen: new Date(data.lastSeen)
          }
        }));
      });

      return () => {
        socketService.leaveChat(chat._id);
        // Clear all typing timeouts
        Object.values(typingTimeouts.current).forEach(timeout => clearTimeout(timeout));
        typingTimeouts.current = {};
        
        // Clean up socket listeners
        const socket = socketService.getSocket();
        if (socket) {
          socket.off('new-message');
          socket.off('message-read');
          socket.off('message-delivered');
          socket.off('message-status-updated');
          socket.off('user-typing');
          socket.off('user-stop-typing');
          socket.off('user-status-change');
        }
      };
    }
  }, [chat, user]);

  // Separate effect for marking messages as read when messages change
  useEffect(() => {
    if (chat && user && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.sender._id !== user?._id) {
        socketService.markChatMessagesRead(chat._id, lastMessage._id);
      }
    }
  }, [messages, chat, user]);
  useEffect(() => {
    console.log('Messages state updated:', messages.length, 'messages');
    scrollToBottom();
  }, [messages]);const fetchMessages = async () => {
    try {
      setLoading(true);
      console.log('Fetching messages for chat:', chat._id);
      const response = await messageAPI.getMessages(chat._id);
      console.log('Fetched messages response:', response.data);
      const messagesData = response.data.data.messages || [];
      console.log('Setting messages:', messagesData.length, 'messages');
      setMessages(messagesData);
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

  const getMessageStatus = (message: Message) => {
    if (message.sender._id !== user?._id) return null;
    
    const otherUsers = chat.users.filter(u => u._id !== user?._id);
    const readCount = message.readBy?.filter(read => 
      otherUsers.some(u => u._id === read.user)
    ).length || 0;
    const deliveredCount = message.deliveredTo?.filter(delivery => 
      otherUsers.some(u => u._id === delivery.user)
    ).length || 0;
    
    if (readCount === otherUsers.length && otherUsers.length > 0) {
      return 'read';
    } else if (deliveredCount > 0) {
      return 'delivered';
    } else {
      return 'sent';
    }
  };
  const renderMessageStatus = (message: Message) => {
    const status = getMessageStatus(message);
    if (!status) return null;
    
    switch (status) {
      case 'read':
        return (
          <div className="message-status-container">
            <i className="bi bi-check2-all read" title="Read"></i>
          </div>
        );
      case 'delivered':
        return (
          <div className="message-status-container">
            <i className="bi bi-check2-all delivered" title="Delivered"></i>
          </div>
        );
      case 'sent':
        return (
          <div className="message-status-container">
            <i className="bi bi-check2 sent" title="Sent"></i>
          </div>
        );
      default:
        return (
          <div className="message-status-container">
            <i className="bi bi-clock sending" title="Sending..."></i>
          </div>
        );
    }
  };

  const getOnlineStatus = (userId: string) => {
    return userStatuses[userId]?.isOnline || 
           chat.users.find(u => u._id === userId)?.isOnline || false;
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

  console.log('Rendering ChatWindow with:', {
    messagesCount: messages.length,
    groupedMessages: Object.keys(groupedMessages),
    loading
  });

  const shouldShowAvatar = (currentMessage: Message, nextMessage?: Message) => {
    if (!nextMessage) return true;
    if (currentMessage.sender._id !== nextMessage.sender._id) return true;
    
    const currentTime = new Date(currentMessage.createdAt).getTime();
    const nextTime = new Date(nextMessage.createdAt).getTime();
    const timeDiff = nextTime - currentTime;
    
    // Show avatar if messages are more than 2 minutes apart
    return timeDiff > 2 * 60 * 1000;  };

  if (loading) {
    console.log('Showing loading state');
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
              className={`chat-avatar ${!chat.isGroup ? 
                ((() => {
                  const otherUser = chat.users.find(u => u._id !== user?._id);
                  return otherUser && getOnlineStatus(otherUser._id) ? 'online' : 'offline';
                })()) : ''
              }`}
            /><div className="chat-details">
              <h3 className="chat-title">{getChatName()}</h3>              <p className="chat-status">
                {chat.isGroup 
                  ? `${chat.users.length} members` 
                  : (() => {
                      const otherUser = chat.users.find(u => u._id !== user?._id);
                      const isOnline = otherUser ? getOnlineStatus(otherUser._id) : false;
                      if (isOnline) {
                        return (
                          <span className="status-online">
                            <span className="status-dot"></span>
                            Online
                          </span>
                        );
                      } else {
                        return (
                          <span className="status-offline">
                            <span className="status-dot"></span>
                            Last seen recently
                          </span>
                        );
                      }
                    })()
                }
              </p>
            </div>
          </div>

          <div className="header-actions">
            <button className="action-btn video-call" title="Video call">
              <i className="bi bi-camera-video-fill"></i>
            </button>
            <button className="action-btn voice-call" title="Voice call">
              <i className="bi bi-telephone-fill"></i>
            </button>
            <button className="action-btn search" title="Search in chat">
              <i className="bi bi-search"></i>
            </button>
            <button className="action-btn more" title="More options">
              <i className="bi bi-three-dots-vertical"></i>
            </button>
          </div>
        </div>
      </div>      {/* Messages Area */}
      <div className="messages-container">
        <div className="messages-content">          {Object.keys(groupedMessages).length === 0 ? (
            <div className="empty-chat-state">
              <div className="empty-chat-content">
                <div className="empty-chat-animation">
                  <div className="chat-bubbles">
                    <div className="bubble bubble-1"></div>
                    <div className="bubble bubble-2"></div>
                    <div className="bubble bubble-3"></div>
                  </div>
                </div>
                <h3 className="empty-chat-title">Start the conversation!</h3>
                <p className="empty-chat-subtitle">
                  {chat.isGroup 
                    ? `Welcome to ${getChatName()}! Send a message to get started.`
                    : `This is the beginning of your conversation with ${getChatName()}.`
                  }
                </p>
                <div className="conversation-starters">
                  <div className="starter-suggestions">
                    <span className="starter-chip">👋 Say hello</span>
                    <span className="starter-chip">📸 Share a photo</span>
                    <span className="starter-chip">🎵 Send a voice note</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            Object.entries(groupedMessages).map(([date, dayMessages]) => (
            <div key={date} className="message-day-group">
              <div className="date-separator">
                <span className="date-label">{formatDate(date)}</span>
              </div>
                {dayMessages.map((message, index) => {
                const isCurrentUser = message.sender._id === user?._id;
                const nextMessage = dayMessages[index + 1];
                
                return (<div key={message._id} className={`message-wrapper ${isCurrentUser ? 'sent' : 'received'}`}>
                    <div className="message-container">
                      {!isCurrentUser && chat.isGroup && shouldShowAvatar(message, nextMessage) && (
                        <div className="sender-avatar">
                          <img
                            src={getProfileImage(message.sender, 32)}
                            alt={message.sender.username}
                            className="avatar-small"
                          />
                        </div>
                      )}
                      
                      <div className={`message-bubble ${isCurrentUser ? 'sent-bubble' : 'received-bubble'}`}>
                        {!isCurrentUser && chat.isGroup && shouldShowAvatar(message, nextMessage) && (
                          <div className="sender-name">{message.sender.username}</div>
                        )}
                        
                        {message.mediaUrl && message.messageType === 'image' && (
                          <div className="message-image">
                            <img src={message.mediaUrl} alt="Shared image" loading="lazy" />
                          </div>
                        )}
                        
                        {message.content && (
                          <div className="message-text">{message.content}</div>
                        )}
                        
                        <div className="message-meta">
                          <span className="message-time">{formatTime(message.createdAt)}</span>
                          {isCurrentUser && renderMessageStatus(message)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )))}          {/* Typing Indicator */}
          {typingUsers.length > 0 && (
            <div className="typing-indicator-wrapper">
              <div className="typing-indicator-container">
                <div className="typing-avatar-group">
                  {typingUsers.slice(0, 3).map(user => {
                    const chatUser = chat.users.find(u => u._id === user.userId);
                    return (
                      <img
                        key={user.userId}
                        src={chatUser?.profilePic || `https://ui-avatars.com/api/?name=${user.username}&background=667eea&color=ffffff&bold=true`}
                        alt={user.username}
                        className="typing-avatar"
                      />
                    );
                  })}
                </div>
                <div className="typing-bubble">
                  <div className="typing-text">
                    {typingUsers.length === 1 
                      ? `${typingUsers[0].username} is typing`
                      : typingUsers.length === 2
                      ? `${typingUsers[0].username} and ${typingUsers[1].username} are typing`
                      : `${typingUsers.length} people are typing`
                    }
                  </div>
                  <div className="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
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
