// Simple message sender test
// Open browser console and run this script

console.log('🔍 Testing message functionality...');

// Check if we have the required objects
console.log('Socket service available:', typeof window.socketService !== 'undefined');
console.log('Auth token available:', !!localStorage.getItem('token'));

// Function to send a test message via socket
function sendTestMessage() {
  const chatId = '6856cf66e6b541152627c05b'; // Known chat ID from logs
  const messageData = {
    chatId: chatId,
    content: 'Test message from console - ' + new Date().toLocaleTimeString(),
    messageType: 'text'
  };

  console.log('Sending test message:', messageData);
  
  if (window.socketService && window.socketService.sendMessage) {
    window.socketService.sendMessage(messageData);
    console.log('Message sent via socket service');
  } else {
    console.error('Socket service or sendMessage method not available');
  }
}

// Function to check socket connection
function checkSocketConnection() {
  if (window.socketService && window.socketService.getSocket) {
    const socket = window.socketService.getSocket();
    if (socket) {
      console.log('Socket connected:', socket.connected);
      console.log('Socket ID:', socket.id);
    } else {
      console.log('Socket object not found');
    }
  }
}

// Function to listen for new messages
function setupMessageListener() {
  if (window.socketService && window.socketService.onNewMessage) {
    window.socketService.onNewMessage((message) => {
      console.log('📨 Received new message:', message);
    });
    console.log('Message listener set up');
  }
}

console.log('Available functions:');
console.log('- sendTestMessage() - Send a test message');
console.log('- checkSocketConnection() - Check socket status');
console.log('- setupMessageListener() - Listen for messages');

// Make functions global
window.sendTestMessage = sendTestMessage;
window.checkSocketConnection = checkSocketConnection;
window.setupMessageListener = setupMessageListener;

// Auto-run checks
checkSocketConnection();
setupMessageListener();
