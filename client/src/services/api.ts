import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Handle response errors globally
let isRedirecting = false;
let isRefreshing = false;
let failedQueue: Array<{ resolve: Function; reject: Function }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 errors globally
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue the request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch((err) => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await api.post('/auth/refresh', { refreshToken });
          const { token: newToken, refreshToken: newRefreshToken } = response.data.data;
          
          localStorage.setItem('token', newToken);
          localStorage.setItem('refreshToken', newRefreshToken);
          
          // Update authorization header for future requests
          api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
          
          processQueue(null, newToken);
          
          // Retry the original request
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        
        // Clear tokens and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        
        if (!isRedirecting && window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          isRedirecting = true;
          setTimeout(() => {
            window.location.href = '/login';
            isRedirecting = false;
          }, 100);
        }
      } finally {
        isRefreshing = false;
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  register: (userData: any) => api.post('/auth/register', userData),
  login: (credentials: any) => api.post('/auth/login', credentials),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (userData: any) => api.put('/auth/profile', userData),
  refreshToken: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
  uploadProfilePic: (formData: FormData) => api.post('/auth/profile-picture', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  searchUsers: (query: string) => api.get(`/auth/search?q=${encodeURIComponent(query)}`),
  changePassword: (passwordData: any) => api.put('/auth/change-password', passwordData),
  deleteAccount: (password: string) => api.delete('/auth/account', { data: { password } }),
  
  // Friends related endpoints
  getAllUsers: (page = 1, limit = 20) => api.get(`/users?page=${page}&limit=${limit}`),
  getFriends: () => api.get('/friends'),
  sendFriendRequest: (userId: string) => api.post(`/friends/request/${userId}`),
  acceptFriendRequest: (userId: string) => api.post(`/friends/accept/${userId}`),
  rejectFriendRequest: (userId: string) => api.post(`/friends/reject/${userId}`),
  cancelFriendRequest: (userId: string) => api.post(`/friends/cancel/${userId}`),
  removeFriend: (userId: string) => api.delete(`/friends/${userId}`),
  getPendingRequests: () => api.get('/friends/pending'),
  getSentRequests: () => api.get('/friends/sent'),
};

// Chat API calls
export const chatAPI = {
  getChats: () => api.get('/chats'),
  createPrivateChat: (userId: string) => api.post('/chats/private', { userId }),
  createGroupChat: (chatData: any) => api.post('/chats/group', chatData),
  getChatById: (chatId: string) => api.get(`/chats/${chatId}`),
  addMember: (chatId: string, userId: string) => api.post(`/chats/${chatId}/add-user`, { userId }),
  removeMember: (chatId: string, userId: string) => api.post(`/chats/${chatId}/remove-user`, { userId }),
  updateChat: (chatId: string, chatData: any) => api.put(`/chats/${chatId}`, chatData),
  leaveGroup: (chatId: string) => api.post(`/chats/${chatId}/leave`),
  deleteChat: (chatId: string) => api.delete(`/chats/${chatId}`),
};

// Message API calls
export const messageAPI = {
  getMessages: (chatId: string) => api.get(`/messages/${chatId}`),
  sendMessage: (chatId: string, messageData: any) => api.post(`/messages/${chatId}`, messageData),
  uploadMedia: (chatId: string, formData: FormData) => api.post(`/messages/${chatId}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  editMessage: (messageId: string, content: string) => api.put(`/messages/${messageId}`, { content }),
  deleteMessage: (messageId: string) => api.delete(`/messages/${messageId}`),
  addReaction: (messageId: string, emoji: string) => api.post(`/messages/${messageId}/react`, { emoji }),
  removeReaction: (messageId: string, emoji: string) => api.delete(`/messages/${messageId}/react`, { data: { emoji } }),
  
  // Message status endpoints
  markMessageDelivered: (messageId: string) => api.put(`/messages/${messageId}/delivered`),
  markMessageRead: (messageId: string) => api.put(`/messages/${messageId}/read`),
  getMessageStatus: (messageId: string) => api.get(`/messages/${messageId}/status`),
  getUnreadCount: (chatId: string, lastReadAt?: string) => {
    const params = lastReadAt ? { lastReadAt } : {};
    return api.get(`/messages/${chatId}/unread-count`, { params });
  },
};

// Enhanced API calls with toast notifications
export const enhancedChatAPI = {
  getChats: async () => {
    try {
      const response = await chatAPI.getChats();
      return response;
    } catch (error: any) {
      throw error;
    }
  },

  createPrivateChat: async (userId: string) => {
    try {
      const response = await chatAPI.createPrivateChat(userId);
      return response;
    } catch (error: any) {
      throw error;
    }
  },

  createGroupChat: async (chatData: any) => {
    try {
      const response = await chatAPI.createGroupChat(chatData);
      return response;
    } catch (error: any) {
      throw error;
    }
  }
};

export const enhancedMessageAPI = {
  getMessages: async (chatId: string) => {
    try {
      const response = await messageAPI.getMessages(chatId);
      return response;
    } catch (error: any) {
      throw error;
    }
  },

  sendMessage: async (chatId: string, messageData: any) => {
    try {
      const response = await messageAPI.sendMessage(chatId, messageData);
      return response;
    } catch (error: any) {
      throw error;
    }  }
};

// Notification API calls
export const notificationAPI = {
  getNotifications: (page = 1, limit = 20, unreadOnly = false) => 
    api.get(`/notifications?page=${page}&limit=${limit}&unreadOnly=${unreadOnly}`),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (notificationIds?: string[]) => api.put('/notifications/read', { notificationIds }),
  deleteNotification: (id: string) => api.delete(`/notifications/${id}`),
  clearAll: () => api.delete('/notifications')
};

export default api;
