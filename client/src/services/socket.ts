import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private connectionAttempts = 0;
  private maxRetries = 3;
  connect(token: string) {
    // Disconnect existing connection if any
    if (this.socket) {
      this.socket.disconnect();
    }

    console.log('Attempting to connect socket with token:', token ? 'Token provided' : 'No token');

    if (!token) {
      console.error('Cannot connect socket: No token provided');
      return null;
    }

    this.socket = io('http://localhost:5000', {
      auth: {
        token: token
      },
      reconnection: true,
      reconnectionAttempts: this.maxRetries,
      reconnectionDelay: 1000,
      timeout: 10000
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.connectionAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
    });    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.connectionAttempts++;
      
      if (this.connectionAttempts >= this.maxRetries) {
        console.error('Max connection attempts reached');
        // Clear token if authentication failed
        if (error.message && (error.message.includes('Authentication error') || error.message.includes('auth'))) {
          console.error('Authentication failed, clearing token');
          localStorage.removeItem('token');
          // Only redirect if not already on auth pages
          if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
            setTimeout(() => {
              window.location.href = '/login';
            }, 1000);
          }
        }
      }
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket() {
    return this.socket;
  }  // Message events
  sendMessage(messageData: any) {
    if (this.socket) {
      console.log('Sending message via socket:', messageData);
      this.socket.emit('send-message', messageData);
    } else {
      console.error('Socket not connected when trying to send message');
    }
  }

  onNewMessage(callback: (message: any) => void) {
    if (this.socket) {
      console.log('Setting up new-message listener');
      this.socket.on('new-message', (message) => {
        console.log('Received new message from socket:', message);
        callback(message);
      });
    }
  }

  // Message status events
  onMessageDelivered(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('message-delivered', callback);
    }
  }

  onMessageRead(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('message-read', callback);
    }
  }

  onMessageStatusUpdated(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('message-status-updated', callback);
    }
  }

  onMessagesBulkRead(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('messages-bulk-read', callback);
    }
  }

  onMessagesBulkDelivered(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('messages-bulk-delivered', callback);
    }
  }

  markMessageRead(messageId: string, chatId: string) {
    if (this.socket) {
      this.socket.emit('mark-message-read', { messageId, chatId });
    }
  }

  markChatMessagesRead(chatId: string, lastMessageId: string) {
    if (this.socket) {
      this.socket.emit('mark-chat-messages-read', { chatId, lastMessageId });
    }
  }
  // Typing events
  startTyping(chatId: string) {
    if (this.socket) {
      this.socket.emit('typing-start', { chatId });
    }
  }

  stopTyping(chatId: string) {
    if (this.socket) {
      this.socket.emit('typing-stop', { chatId });
    }
  }

  onTyping(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('user-typing', callback);
    }
  }
  onStopTyping(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('user-stopped-typing', callback);
    }
  }

  // Notification events
  onNewNotification(callback: (notification: any) => void) {
    if (this.socket) {
      this.socket.on('new-notification', callback);
    }
  }

  onNotificationsRead(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('notifications-read', callback);
    }
  }

  onNotificationDeleted(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('notification-deleted', callback);
    }
  }
  onNotificationsCleared(callback: () => void) {
    if (this.socket) {
      this.socket.on('notifications-cleared', callback);
    }
  }

  // Chat events
  joinChat(chatId: string) {
    if (this.socket) {
      console.log('Joining chat room:', chatId);
      this.socket.emit('join-chat', chatId);
    }
  }

  leaveChat(chatId: string) {
    if (this.socket) {
      console.log('Leaving chat room:', chatId);
      this.socket.emit('leave-chat', chatId);
    }
  }

  onJoinedChat(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('joined-chat', callback);
    }
  }

  onChatUpdated(callback: (chat: any) => void) {
    if (this.socket) {
      this.socket.on('chat-updated', callback);
    }
  }
  onNewChat(callback: (chat: any) => void) {
    if (this.socket) {
      this.socket.on('new-chat', callback);
    }
  }

  // Online status events
  onUserOnline(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('user-online', callback);
    }
  }

  onUserOffline(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('user-offline', callback);
    }
  }

  onUserStatusChange(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('user-status-change', callback);
    }
  }

  // Remove event listeners
  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }
}

const socketServiceInstance = new SocketService();

// Add to window for debugging
if (typeof window !== 'undefined') {
  (window as any).socketService = socketServiceInstance;
}

export default socketServiceInstance;
