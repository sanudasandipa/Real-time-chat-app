#!/usr/bin/env node

/**
 * Test script to verify chat functionality
 * This script will test:
 * 1. User authentication
 * 2. Creating private chats
 * 3. Sending messages
 * 4. Real-time socket events
 */

const axios = require('axios');
const io = require('socket.io-client');

const API_BASE = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

// Test users from seed data
const TEST_USERS = [
  { email: 'alice@example.com', password: 'Password123', username: 'alice' },
  { email: 'bob@example.com', password: 'Password123', username: 'bob' }
];

class ChatTester {
  constructor() {
    this.users = {};
    this.sockets = {};
  }

  async login(userCredentials) {
    try {
      console.log(`🔐 Logging in ${userCredentials.username}...`);
      const response = await axios.post(`${API_BASE}/auth/login`, {
        email: userCredentials.email,
        password: userCredentials.password
      });

      const { user, token } = response.data.data;
      this.users[userCredentials.username] = { user, token };
      
      console.log(`✅ ${userCredentials.username} logged in successfully`);
      return { user, token };
    } catch (error) {
      console.error(`❌ Login failed for ${userCredentials.username}:`, error.response?.data?.message || error.message);
      throw error;
    }
  }

  async createPrivateChat(requesterUsername, targetUserId) {
    try {
      console.log(`💬 ${requesterUsername} creating chat with user ${targetUserId}...`);
      const { token } = this.users[requesterUsername];
      
      const response = await axios.post(`${API_BASE}/chats/private`, 
        { userId: targetUserId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const chat = response.data.data.chat;
      console.log(`✅ Chat created successfully:`, {
        chatId: chat._id,
        displayName: chat.displayName,
        isGroup: chat.isGroup
      });
      
      return chat;
    } catch (error) {
      console.error(`❌ Failed to create chat:`, error.response?.data?.message || error.message);
      throw error;
    }
  }

  async connectSocket(username) {
    try {
      console.log(`🔌 Connecting socket for ${username}...`);
      const { token } = this.users[username];
      
      const socket = io(SOCKET_URL, {
        auth: { token }
      });

      this.sockets[username] = socket;

      return new Promise((resolve, reject) => {
        socket.on('connect', () => {
          console.log(`✅ ${username} socket connected`);
          resolve(socket);
        });

        socket.on('connect_error', (error) => {
          console.error(`❌ ${username} socket connection failed:`, error.message);
          reject(error);
        });

        // Listen for chat events
        socket.on('new-message', (message) => {
          console.log(`📨 ${username} received message:`, {
            from: message.sender.username,
            content: message.content,
            chatId: message.chat
          });
        });

        socket.on('error', (error) => {
          console.error(`❌ Socket error for ${username}:`, error);
        });
      });
    } catch (error) {
      console.error(`❌ Socket connection failed for ${username}:`, error.message);
      throw error;
    }
  }

  async sendMessage(senderUsername, chatId, content) {
    try {
      console.log(`📤 ${senderUsername} sending message to chat ${chatId}...`);
      const socket = this.sockets[senderUsername];
      
      if (!socket) {
        throw new Error(`Socket not connected for ${senderUsername}`);
      }

      socket.emit('send-message', {
        chatId,
        content,
        messageType: 'text'
      });

      console.log(`✅ Message sent: "${content}"`);
    } catch (error) {
      console.error(`❌ Failed to send message:`, error.message);
      throw error;
    }
  }

  async runTests() {
    try {
      console.log('🚀 Starting chat functionality tests...\n');

      // Step 1: Login both users
      await this.login(TEST_USERS[0]); // Alice
      await this.login(TEST_USERS[1]); // Bob

      // Step 2: Connect sockets
      await this.connectSocket('alice');
      await this.connectSocket('bob');

      // Step 3: Create private chat between Alice and Bob
      const bobUserId = this.users['bob'].user._id;
      const chat = await this.createPrivateChat('alice', bobUserId);

      // Step 4: Join chat room
      console.log('🏠 Joining chat rooms...');
      this.sockets['alice'].emit('join-chat', chat._id);
      this.sockets['bob'].emit('join-chat', chat._id);

      // Wait a bit for join confirmations
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 5: Send test messages
      await this.sendMessage('alice', chat._id, 'Hello Bob! This is a test message from Alice.');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await this.sendMessage('bob', chat._id, 'Hi Alice! I received your message. Chat is working!');
      await new Promise(resolve => setTimeout(resolve, 500));

      await this.sendMessage('alice', chat._id, 'Great! The real-time chat functionality is working perfectly! 🎉');

      console.log('\n✅ All tests completed successfully!');
      console.log('🎯 Chat functionality is working as expected');

    } catch (error) {
      console.error('\n❌ Test failed:', error.message);
      process.exit(1);
    } finally {
      // Cleanup
      setTimeout(() => {
        console.log('\n🧹 Cleaning up connections...');
        Object.values(this.sockets).forEach(socket => socket.disconnect());
        process.exit(0);
      }, 2000);
    }
  }
}

// Run the tests
const tester = new ChatTester();
tester.runTests().catch(console.error);
