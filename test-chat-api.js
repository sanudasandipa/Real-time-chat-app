// Test script to verify real-time chat functionality
// This script can be run in browser console or as a Node.js script

const API_BASE = 'http://localhost:5000/api';

// Test data
const testUsers = [
  { username: 'sanuda', email: 'sanuda@example.com', password: 'Password123' },
  { username: 'sanuda2', email: 'sanuda2@example.com', password: 'Password123' }
];

// Test functions
async function testLogin(username, password) {
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: username, password })
    });
      const data = await response.json();
    console.log(`✅ Login test for ${username}:`, data.success ? 'SUCCESS' : 'FAILED');
    if (!data.success) {
      console.log(`   Error details:`, data.message || data.error || 'Unknown error');
      console.log(`   Response status:`, response.status);
    }
    return data;
  } catch (error) {
    console.error(`❌ Login test for ${username} failed:`, error);
    return null;
  }
}

async function testGetChats(token) {
  try {
    const response = await fetch(`${API_BASE}/chats`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    console.log('✅ Get chats test:', data.success ? 'SUCCESS' : 'FAILED');
    console.log('📋 Chats:', data.data?.chats?.length || 0);
    return data;
  } catch (error) {
    console.error('❌ Get chats test failed:', error);
    return null;
  }
}

async function testSendMessage(token, chatId, content) {
  try {
    const response = await fetch(`${API_BASE}/messages/${chatId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ content, messageType: 'text' })
    });
    
    const data = await response.json();
    console.log('✅ Send message test:', data.success ? 'SUCCESS' : 'FAILED');
    return data;
  } catch (error) {
    console.error('❌ Send message test failed:', error);
    return null;
  }
}

async function runChatTests() {
  console.log('🚀 Starting chat functionality tests...\n');
    // Test 1: Login both users
  console.log('📝 Test 1: User Authentication');
  const user1Login = await testLogin(testUsers[0].email, testUsers[0].password);
  const user2Login = await testLogin(testUsers[1].email, testUsers[1].password);
  
  if (!user1Login?.success || !user2Login?.success) {
    console.error('❌ Authentication failed. Cannot proceed with tests.');
    return;
  }
  
  const user1Token = user1Login.data.token;
  const user2Token = user2Login.data.token;
  
  console.log('\n');
  
  // Test 2: Get chats for both users
  console.log('📝 Test 2: Get Chats');
  const user1Chats = await testGetChats(user1Token);
  const user2Chats = await testGetChats(user2Token);
  
  if (!user1Chats?.success || !user2Chats?.success) {
    console.error('❌ Failed to get chats. Cannot proceed.');
    return;
  }
  
  const chatId = user1Chats.data.chats[0]?._id;
  if (!chatId) {
    console.error('❌ No chat found between users. Creating one...');
    // You could add logic here to create a chat if needed
    return;
  }
  
  console.log(`📍 Using chat ID: ${chatId}`);
  console.log('\n');
  
  // Test 3: Send messages
  console.log('📝 Test 3: Send Messages');
  await testSendMessage(user1Token, chatId, 'Hello from sanuda! Testing real-time messaging 👋');
  await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
  await testSendMessage(user2Token, chatId, 'Hi sanuda! I received your message. Real-time is working! 🚀');
  await new Promise(resolve => setTimeout(resolve, 1000));
  await testSendMessage(user1Token, chatId, 'Great! Let\'s test some more features 💬');
  
  console.log('\n✅ Basic chat tests completed!');
  console.log('\n📝 Next steps:');
  console.log('1. Open the frontend at http://localhost:5173');
  console.log('2. Login with sanuda / Password123 in one browser/tab');
  console.log('3. Login with sanuda2 / Password123 in another browser/tab (incognito)');
  console.log('4. Test real-time messaging between the two users');
  console.log('5. Test typing indicators');
  console.log('6. Test online/offline status');
}

// Run tests if in Node.js environment
if (typeof module !== 'undefined' && module.exports) {
  // For Node.js
  const fetch = require('node-fetch');
  runChatTests();
} else {
  // For browser console
  console.log('Run runChatTests() to start the tests');
}

// Export for use in browser
if (typeof window !== 'undefined') {
  window.runChatTests = runChatTests;
  window.testLogin = testLogin;
  window.testGetChats = testGetChats;
  window.testSendMessage = testSendMessage;
}
