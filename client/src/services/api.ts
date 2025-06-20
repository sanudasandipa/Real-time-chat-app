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
    }
  }
};

export default api;
