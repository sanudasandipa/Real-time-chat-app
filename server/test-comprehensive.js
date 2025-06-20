const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
let authToken = '';
let testChatId = '';
let testMessageId = '';

// Test data
const testUser = {
  username: 'testuser' + Date.now(),
  email: `testuser${Date.now()}@example.com`,
  password: 'Password123'
};

const testUser2 = {
  username: 'testuser2' + Date.now(),
  email: `testuser2${Date.now()}@example.com`,
  password: 'Password123'
};

class APITester {
  constructor() {
    this.axios = axios.create({
      baseURL: BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async runTests() {
    console.log('🧪 Starting Comprehensive API Tests\n');
    
    try {
      await this.testHealthEndpoints();
      await this.testAuthenticationFlow();
      await this.testChatSystem();
      await this.testMessageSystem();
      console.log('\n✅ All tests completed successfully!');
    } catch (error) {
      console.error('\n❌ Test failed:', error.message);
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', error.response.data);
      }
    }
  }

  async testHealthEndpoints() {
    console.log('📊 Testing Health & Info Endpoints');
    console.log('==================================');
    
    // Test health check
    const health = await this.axios.get('/health');
    console.log('✅ Health check:', health.status === 200 ? 'PASS' : 'FAIL');
    
    // Test API documentation
    const api = await this.axios.get('/api');
    console.log('✅ API documentation:', api.status === 200 ? 'PASS' : 'FAIL');
    console.log('');
  }

  async testAuthenticationFlow() {
    console.log('🔐 Testing Authentication Flow');
    console.log('=============================');
    
    try {
      // Test user registration
      const registerResponse = await this.axios.post('/api/auth/register', testUser);
      console.log('✅ User registration:', registerResponse.status === 201 ? 'PASS' : 'FAIL');
      
      if (registerResponse.data.success) {
        authToken = registerResponse.data.data.token;
        console.log('✅ JWT token received');
        
        // Set default auth header
        this.axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      }
    } catch (error) {
      if (error.response?.status === 429) {
        console.log('⚠️  Rate limited, waiting and retrying...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Try again
        const registerResponse = await this.axios.post('/api/auth/register', testUser);
        authToken = registerResponse.data.data.token;
        this.axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
        console.log('✅ User registration (retry): PASS');
      } else {
        throw error;
      }
    }
    
    // Test user login
    const loginResponse = await this.axios.post('/api/auth/login', {
      email: testUser.email,
      password: testUser.password
    });
    console.log('✅ User login:', loginResponse.status === 200 ? 'PASS' : 'FAIL');
    
    // Test get current user
    const meResponse = await this.axios.get('/api/auth/me');
    console.log('✅ Get current user:', meResponse.status === 200 ? 'PASS' : 'FAIL');
    
    // Test user search
    const searchResponse = await this.axios.get('/api/auth/search?q=test');
    console.log('✅ User search:', searchResponse.status === 200 ? 'PASS' : 'FAIL');
    console.log('');
  }

  async testChatSystem() {
    console.log('💬 Testing Chat System');
    console.log('=====================');
    
    // Create second user for chat testing
    await this.axios.post('/api/auth/register', testUser2);
    
    // Test get chats (should be empty initially)
    const chatsResponse = await this.axios.get('/api/chats');
    console.log('✅ Get chats:', chatsResponse.status === 200 ? 'PASS' : 'FAIL');
    
    // Test create group chat
    const groupChatResponse = await this.axios.post('/api/chats/group', {
      chatName: 'Test Group',
      users: [],  // Will include current user automatically
      isGroupChat: true
    });
    console.log('✅ Create group chat:', groupChatResponse.status === 201 ? 'PASS' : 'FAIL');
    
    if (groupChatResponse.data.success) {
      testChatId = groupChatResponse.data.data.chat._id;
      console.log('✅ Test chat ID stored:', testChatId ? 'PASS' : 'FAIL');
    }
    
    // Test get chat details
    if (testChatId) {
      const chatDetailsResponse = await this.axios.get(`/api/chats/${testChatId}`);
      console.log('✅ Get chat details:', chatDetailsResponse.status === 200 ? 'PASS' : 'FAIL');
    }
    console.log('');
  }

  async testMessageSystem() {
    console.log('📨 Testing Message System');
    console.log('========================');
    
    if (!testChatId) {
      console.log('⚠️  Skipping message tests - no test chat available');
      return;
    }
    
    // Test send message
    const sendMessageResponse = await this.axios.post(`/api/messages/${testChatId}`, {
      content: 'Hello, this is a test message!',
      messageType: 'text'
    });
    console.log('✅ Send message:', sendMessageResponse.status === 201 ? 'PASS' : 'FAIL');
    
    if (sendMessageResponse.data.success) {
      testMessageId = sendMessageResponse.data.data.message._id;
    }
    
    // Test get messages
    const messagesResponse = await this.axios.get(`/api/messages/${testChatId}`);
    console.log('✅ Get messages:', messagesResponse.status === 200 ? 'PASS' : 'FAIL');
    
    // Test message reaction
    if (testMessageId) {
      const reactionResponse = await this.axios.post(`/api/messages/${testMessageId}/react`, {
        emoji: '👍'
      });
      console.log('✅ Add reaction:', reactionResponse.status === 200 ? 'PASS' : 'FAIL');
    }
    
    // Test search messages
    const searchResponse = await this.axios.get(`/api/messages/${testChatId}/search?q=test`);
    console.log('✅ Search messages:', searchResponse.status === 200 ? 'PASS' : 'FAIL');
    console.log('');
  }
}

// Add axios to dependencies check
async function checkDependencies() {
  try {
    require('axios');
    return true;
  } catch (error) {
    console.log('❌ axios not found, installing...');
    const { execSync } = require('child_process');
    execSync('npm install axios', { stdio: 'inherit' });
    return true;
  }
}

// Run tests
async function main() {
  await checkDependencies();
  const tester = new APITester();
  await tester.runTests();
}

main().catch(console.error);
