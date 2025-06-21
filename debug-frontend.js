// Debug script to test message sending functionality
console.log('🔍 Starting frontend debugging...');

// Check if socket is connected
const socketService = window.socketService || {};
console.log('Socket service:', socketService);

// Check authentication
const token = localStorage.getItem('token');
console.log('Token exists:', !!token);

// Test API endpoint directly
async function testSendMessage() {
  const chatId = '6856cf66e6b541152627c05b'; // From our logs
  const message = {
    content: 'Test message from browser console'
  };

  try {
    console.log('Testing API call...');
    const response = await fetch('http://localhost:5000/api/messages/' + chatId, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify(message)
    });

    const data = await response.json();
    console.log('API Response:', data);
  } catch (error) {
    console.error('API Error:', error);
  }
}

// Test socket message sending
function testSocketMessage() {
  if (window.io && window.socketService) {
    console.log('Testing socket message...');
    window.socketService.sendMessage({
      chatId: '6856cf66e6b541152627c05b',
      content: 'Test socket message from browser console',
      messageType: 'text'
    });
  } else {
    console.error('Socket service not available');
  }
}

console.log('Run testSendMessage() to test API');
console.log('Run testSocketMessage() to test socket');

window.testSendMessage = testSendMessage;
window.testSocketMessage = testSocketMessage;
