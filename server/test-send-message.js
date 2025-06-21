const axios = require('axios');

async function testSendMessage() {
  const BASE_URL = 'http://localhost:5000/api';
  
  try {
    console.log('Testing message sending...');
    
    // Login to get a token
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'sanuda@example.com',
      password: 'Password123'
    });
    
    const token = loginResponse.data.data.token;
    console.log('Login successful');
    
    // Set up headers with token
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // Get user's chats
    const chatsResponse = await axios.get(`${BASE_URL}/chats`, { headers });
    const chatId = chatsResponse.data.data.chats[0]._id;
    console.log(`Using chat ID: ${chatId}`);
    
    // Send a test message
    const messageData = {
      content: `Test message sent at ${new Date().toLocaleTimeString()}`,
      messageType: 'text'
    };
    
    const sendResponse = await axios.post(`${BASE_URL}/messages/${chatId}`, messageData, { headers });
    console.log('Message sent successfully:', sendResponse.data.data.message);
    
    // Fetch messages to verify it was saved
    const messagesResponse = await axios.get(`${BASE_URL}/messages/${chatId}`, { headers });
    const messages = messagesResponse.data.data.messages;
    console.log(`Total messages in chat: ${messages.length}`);
    
    const lastMessage = messages[messages.length - 1];
    console.log(`Last message: ${lastMessage.sender.username}: ${lastMessage.content}`);
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testSendMessage();
