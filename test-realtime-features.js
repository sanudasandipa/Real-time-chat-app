#!/usr/bin/env node

/**
 * Real-time Chat Features Test Script
 * This script demonstrates all the real-time chat features including:
 * - Typing indicators
 * - Message delivery status (double ticks)
 * - Message read receipts
 * - Online/offline status
 * - Real-time message synchronization
 */

const { io } = require('socket.io-client');
const readline = require('readline');

class ChatTester {
  constructor(username, token) {
    this.username = username;
    this.token = token;
    this.socket = null;
    this.currentChatId = null;
    this.rl = null;
  }

  connect() {
    console.log(`🔌 Connecting ${this.username}...`);
    
    this.socket = io('http://localhost:5000', {
      auth: { token: this.token },
      reconnection: true
    });

    this.setupEventListeners();
    return this;
  }

  setupEventListeners() {
    this.socket.on('connect', () => {
      console.log(`✅ ${this.username} connected successfully`);
    });

    this.socket.on('disconnect', () => {
      console.log(`❌ ${this.username} disconnected`);
    });

    // Message events
    this.socket.on('new-message', (message) => {
      console.log(`📩 ${this.username} received message from ${message.sender.username}: ${message.content}`);
      
      // Auto-mark as read for demo
      if (message.sender.username !== this.username) {
        setTimeout(() => {
          this.socket.emit('mark-message-read', { 
            messageId: message._id, 
            chatId: this.currentChatId 
          });
        }, 1000);
      }
    });

    // Message status events
    this.socket.on('message-delivered', (data) => {
      console.log(`✅ ${this.username} - Message delivered:`, data.messageId);
    });

    this.socket.on('message-read', (data) => {
      console.log(`👁️ ${this.username} - Message read by ${data.readBy.username}`);
    });

    this.socket.on('message-status-updated', (data) => {
      console.log(`📊 ${this.username} - Message status updated:`, {
        messageId: data.messageId,
        delivered: data.deliveredTo.length,
        read: data.readBy.length
      });
    });

    // Typing events
    this.socket.on('user-typing', (data) => {
      console.log(`⌨️  ${this.username} sees: ${data.username} is typing...`);
    });

    this.socket.on('user-stopped-typing', (data) => {
      console.log(`⌨️  ${this.username} sees: ${data.username} stopped typing`);
    });

    // User status events
    this.socket.on('user-online', (data) => {
      console.log(`🟢 ${this.username} sees: ${data.username} came online`);
    });

    this.socket.on('user-status-change', (data) => {
      const status = data.isOnline ? 'online' : 'offline';
      console.log(`🔄 ${this.username} sees: User ${data.userId} is now ${status}`);
    });

    this.socket.on('error', (error) => {
      console.error(`❌ ${this.username} error:`, error.message);
    });
  }

  joinChat(chatId) {
    this.currentChatId = chatId;
    this.socket.emit('join-chat', chatId);
    console.log(`🏠 ${this.username} joined chat ${chatId}`);
    return this;
  }

  sendMessage(content) {
    if (!this.currentChatId) {
      console.error('❌ No chat joined');
      return this;
    }

    this.socket.emit('send-message', {
      chatId: this.currentChatId,
      content: content,
      messageType: 'text'
    });

    console.log(`📤 ${this.username} sent: "${content}"`);
    return this;
  }

  startTyping() {
    if (this.currentChatId) {
      this.socket.emit('typing-start', { chatId: this.currentChatId });
    }
    return this;
  }

  stopTyping() {
    if (this.currentChatId) {
      this.socket.emit('typing-stop', { chatId: this.currentChatId });
    }
    return this;
  }

  simulateTyping(message, delay = 2000) {
    this.startTyping();
    setTimeout(() => {
      this.stopTyping();
      this.sendMessage(message);
    }, delay);
    return this;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
    return this;
  }
}

// Demo function
async function runDemo() {
  console.log('🚀 Starting Real-time Chat Features Demo');
  console.log('='.repeat(50));

  // You'll need to replace these with actual tokens from your auth system
  const user1Token = 'your_user1_token_here';
  const user2Token = 'your_user2_token_here';
  const chatId = 'your_chat_id_here';

  if (user1Token === 'your_user1_token_here') {
    console.log('❌ Please update the tokens and chatId in the script');
    console.log('💡 You can get tokens by logging in users and copying from localStorage');
    console.log('💡 Create a chat between two users and copy the chat ID');
    return;
  }

  const alice = new ChatTester('Alice', user1Token).connect().joinChat(chatId);
  const bob = new ChatTester('Bob', user2Token).connect().joinChat(chatId);

  // Wait for connections
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('\\n🎬 Demo Scenario: Real-time Chat Features');
  console.log('-'.repeat(40));

  // Scenario 1: Typing indicators
  console.log('\\n📝 Testing typing indicators...');
  alice.simulateTyping('Hello Bob! How are you?', 3000);
  // Wait and respond
  setTimeout(() => {
    bob.simulateTyping('Hi Alice! I\'m doing great, thanks!', 2500);
  }, 4000);

  // Scenario 2: Message delivery and read status
  setTimeout(() => {
    console.log('\\n📬 Testing message delivery and read status...');
    alice.sendMessage('Did you see my previous message?');
  }, 8000);

  // Scenario 3: Multiple messages to show status progression
  setTimeout(() => {
    console.log('\\n📊 Testing status progression (sent -> delivered -> read)...');
    alice.sendMessage('This is message 1');
    setTimeout(() => alice.sendMessage('This is message 2'), 500);
    setTimeout(() => alice.sendMessage('This is message 3'), 1000);
  }, 12000);

  // Scenario 4: Bulk read status
  setTimeout(() => {
    console.log('\\n👁️ Testing bulk read receipts...');
    bob.sendMessage('I can see all your messages!');
  }, 16000);

  // Clean up
  setTimeout(() => {
    console.log('\\n🏁 Demo completed');
    alice.disconnect();
    bob.disconnect();
    process.exit(0);
  }, 20000);
}

// Interactive mode
function startInteractiveMode() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('🎮 Interactive Chat Tester');
  console.log('Available commands:');
  console.log('  /token <token> - Set your auth token');
  console.log('  /join <chatId> - Join a chat');
  console.log('  /msg <message> - Send a message');
  console.log('  /typing - Start typing indicator');
  console.log('  /stop-typing - Stop typing indicator');
  console.log('  /quit - Exit');
  console.log('');

  let tester = null;
  let token = null;

  rl.on('line', (input) => {
    const [command, ...args] = input.trim().split(' ');

    switch (command) {
      case '/token':
        token = args.join(' ');
        console.log('✅ Token set');
        break;

      case '/connect':
        if (!token) {
          console.log('❌ Please set token first with /token <token>');
          break;
        }
        tester = new ChatTester('Interactive User', token).connect();
        break;

      case '/join':
        if (!tester) {
          console.log('❌ Please connect first with /connect');
          break;
        }
        const chatId = args[0];
        if (!chatId) {
          console.log('❌ Please provide chat ID: /join <chatId>');
          break;
        }
        tester.joinChat(chatId);
        break;

      case '/msg':
        if (!tester) {
          console.log('❌ Please connect and join a chat first');
          break;
        }
        const message = args.join(' ');
        tester.sendMessage(message);
        break;

      case '/typing':
        if (tester) tester.startTyping();
        break;

      case '/stop-typing':
        if (tester) tester.stopTyping();
        break;

      case '/quit':
        if (tester) tester.disconnect();
        rl.close();
        process.exit(0);
        break;

      default:
        console.log('❌ Unknown command. Type /quit to exit.');
    }
  });
}

// Main
if (process.argv.includes('--demo')) {
  runDemo();
} else {
  startInteractiveMode();
}
