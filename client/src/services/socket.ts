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
  }

  // Message events
  sendMessage(messageData: any) {
    if (this.socket) {
      this.socket.emit('sendMessage', messageData);
    }
  }

  onNewMessage(callback: (message: any) => void) {
    if (this.socket) {
      this.socket.on('newMessage', callback);
    }
  }

  // Typing events
  startTyping(chatId: string) {
    if (this.socket) {
      this.socket.emit('typing', { chatId });
    }
  }

  stopTyping(chatId: string) {
    if (this.socket) {
      this.socket.emit('stopTyping', { chatId });
    }
  }

  onTyping(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('userTyping', callback);
    }
  }

  onStopTyping(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('userStoppedTyping', callback);
    }
  }

  // Join/Leave room events
  joinChat(chatId: string) {
    if (this.socket) {
      this.socket.emit('joinChat', chatId);
    }
  }

  leaveChat(chatId: string) {
    if (this.socket) {
      this.socket.emit('leaveChat', chatId);
    }
  }

  // Online status events
  onUserOnline(callback: (userId: string) => void) {
    if (this.socket) {
      this.socket.on('userOnline', callback);
    }
  }

  onUserOffline(callback: (userId: string) => void) {
    if (this.socket) {
      this.socket.on('userOffline', callback);
    }
  }

  // Remove event listeners
  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }
}

export default new SocketService();
