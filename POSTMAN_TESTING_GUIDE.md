# 🧪 Postman Testing Guide for Chatter API

## 📋 **Pre-requisites**
- Server is running on `http://localhost:5000`
- Postman application installed
- MongoDB database is connected

## 🏃‍♂️ **Quick Start Testing Steps**

### **Step 1: Test Server Health**
```
GET http://localhost:5000/health
```
**Expected Response:**
```json
{
    "success": true,
    "message": "Server is running",
    "timestamp": "2025-06-20T06:31:04.920Z",
    "environment": "development",
    "version": "1.0.0"
}
```

### **Step 2: Get API Documentation**
```
GET http://localhost:5000/api
```
This will show all available endpoints.

---

## 🔐 **Authentication Testing**

### **1. Register New User**
```
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
    "username": "testuser1",
    "email": "testuser1@example.com",
    "password": "Password123"
}
```

**Expected Response:**
```json
{
    "success": true,
    "message": "User registered successfully",
    "data": {
        "user": {
            "_id": "user_id_here",
            "username": "testuser1",
            "email": "testuser1@example.com",
            "isOnline": true
        },
        "token": "jwt_token_here",
        "refreshToken": "refresh_token_here"
    }
}
```

**⚠️ IMPORTANT:** Save the `token` from the response - you'll need it for authenticated requests!

### **2. Register Second User (for chat testing)**
```
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
    "username": "testuser2",
    "email": "testuser2@example.com",
    "password": "Password123"
}
```

### **3. Login User**
```
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
    "email": "testuser1@example.com",
    "password": "Password123"
}
```

### **4. Get Current User Profile**
```
GET http://localhost:5000/api/auth/me
Authorization: Bearer YOUR_JWT_TOKEN_HERE
```

### **5. Update User Profile**
```
PUT http://localhost:5000/api/auth/profile
Authorization: Bearer YOUR_JWT_TOKEN_HERE
Content-Type: application/json

{
    "bio": "This is my updated bio!",
    "phoneNumber": "+1234567890"
}
```

### **6. Search Users**
```
GET http://localhost:5000/api/auth/search?q=testuser2
Authorization: Bearer YOUR_JWT_TOKEN_HERE
```

---

## 💬 **Chat Testing**

### **1. Create Private Chat**
```
POST http://localhost:5000/api/chats/private
Authorization: Bearer YOUR_JWT_TOKEN_HERE
Content-Type: application/json

{
    "userId": "USER_ID_OF_TESTUSER2_HERE"
}
```

**⚠️ Note:** Replace `USER_ID_OF_TESTUSER2_HERE` with the actual user ID from user search or registration response.

### **2. Create Group Chat**
```
POST http://localhost:5000/api/chats/group
Authorization: Bearer YOUR_JWT_TOKEN_HERE
Content-Type: application/json

{
    "users": ["USER_ID_OF_TESTUSER2_HERE"],
    "chatName": "Test Group Chat",
    "groupDescription": "This is a test group"
}
```

### **3. Get All Chats**
```
GET http://localhost:5000/api/chats
Authorization: Bearer YOUR_JWT_TOKEN_HERE
```

### **4. Get Chat Details**
```
GET http://localhost:5000/api/chats/CHAT_ID_HERE
Authorization: Bearer YOUR_JWT_TOKEN_HERE
```

**⚠️ Note:** Replace `CHAT_ID_HERE` with actual chat ID from previous responses.

---

## 📨 **Message Testing**

### **1. Send Text Message**
```
POST http://localhost:5000/api/messages/CHAT_ID_HERE
Authorization: Bearer YOUR_JWT_TOKEN_HERE
Content-Type: application/json

{
    "content": "Hello! This is my first message.",
    "messageType": "text"
}
```

### **2. Get Chat Messages**
```
GET http://localhost:5000/api/messages/CHAT_ID_HERE
Authorization: Bearer YOUR_JWT_TOKEN_HERE
```

### **3. Edit Message**
```
PUT http://localhost:5000/api/messages/MESSAGE_ID_HERE
Authorization: Bearer YOUR_JWT_TOKEN_HERE
Content-Type: application/json

{
    "content": "Hello! This is my edited message."
}
```

### **4. Add Reaction to Message**
```
POST http://localhost:5000/api/messages/MESSAGE_ID_HERE/react
Authorization: Bearer YOUR_JWT_TOKEN_HERE
Content-Type: application/json

{
    "emoji": "👍"
}
```

### **5. Mark Message as Read**
```
POST http://localhost:5000/api/messages/MESSAGE_ID_HERE/read
Authorization: Bearer YOUR_JWT_TOKEN_HERE
```

### **6. Search Messages**
```
GET http://localhost:5000/api/messages/CHAT_ID_HERE/search?q=hello
Authorization: Bearer YOUR_JWT_TOKEN_HERE
```

### **7. Forward Message**
```
POST http://localhost:5000/api/messages/MESSAGE_ID_HERE/forward
Authorization: Bearer YOUR_JWT_TOKEN_HERE
Content-Type: application/json

{
    "chatIds": ["ANOTHER_CHAT_ID_HERE"]
}
```

### **8. Delete Message**
```
DELETE http://localhost:5000/api/messages/MESSAGE_ID_HERE
Authorization: Bearer YOUR_JWT_TOKEN_HERE
```

---

## 📷 **File Upload Testing**

### **1. Upload Profile Picture**
```
POST http://localhost:5000/api/auth/profile-picture
Authorization: Bearer YOUR_JWT_TOKEN_HERE
Content-Type: multipart/form-data

Form Data:
- profilePic: [Select an image file]
```

### **2. Send Image Message**
```
POST http://localhost:5000/api/messages/CHAT_ID_HERE
Authorization: Bearer YOUR_JWT_TOKEN_HERE
Content-Type: multipart/form-data

Form Data:
- media: [Select an image file]
- messageType: image
- content: Optional caption for the image
```

---

## 👥 **Group Management Testing**

### **1. Add User to Group**
```
POST http://localhost:5000/api/chats/GROUP_CHAT_ID_HERE/add-user
Authorization: Bearer YOUR_JWT_TOKEN_HERE
Content-Type: application/json

{
    "userId": "USER_ID_TO_ADD_HERE"
}
```

### **2. Remove User from Group**
```
POST http://localhost:5000/api/chats/GROUP_CHAT_ID_HERE/remove-user
Authorization: Bearer YOUR_JWT_TOKEN_HERE
Content-Type: application/json

{
    "userId": "USER_ID_TO_REMOVE_HERE"
}
```

### **3. Leave Group**
```
POST http://localhost:5000/api/chats/GROUP_CHAT_ID_HERE/leave
Authorization: Bearer YOUR_JWT_TOKEN_HERE
```

### **4. Update Group Info**
```
PUT http://localhost:5000/api/chats/GROUP_CHAT_ID_HERE
Authorization: Bearer YOUR_JWT_TOKEN_HERE
Content-Type: application/json

{
    "chatName": "Updated Group Name",
    "groupDescription": "Updated group description"
}
```

---

## 🧪 **Complete Testing Sequence**

### **Step-by-Step Testing Flow:**

1. **✅ Test Server Health** - `GET /health`
2. **👤 Register User 1** - `POST /auth/register`
3. **👤 Register User 2** - `POST /auth/register`
4. **🔍 Search for User 2** - `GET /auth/search`
5. **💬 Create Private Chat** - `POST /chats/private`
6. **📨 Send Message** - `POST /messages/:chatId`
7. **📖 Get Messages** - `GET /messages/:chatId`
8. **👍 Add Reaction** - `POST /messages/:messageId/react`
9. **✏️ Edit Message** - `PUT /messages/:messageId`
10. **👥 Create Group Chat** - `POST /chats/group`
11. **📤 Send Group Message** - `POST /messages/:chatId`
12. **🔄 Forward Message** - `POST /messages/:messageId/forward`

---

## 🛠️ **Postman Collection Setup**

### **Environment Variables:**
Create a Postman environment with these variables:
- `base_url`: `http://localhost:5000`
- `user1_token`: (Set after user1 login)
- `user2_token`: (Set after user2 login)
- `user1_id`: (Set after user1 registration)
- `user2_id`: (Set after user2 registration)
- `chat_id`: (Set after creating chat)
- `message_id`: (Set after sending message)

### **Pre-request Scripts:**
Add this to requests that need authentication:
```javascript
pm.request.headers.add({
    key: 'Authorization',
    value: 'Bearer ' + pm.environment.get('user1_token')
});
```

### **Test Scripts:**
Add this to save tokens and IDs:
```javascript
if (pm.response.code === 200 || pm.response.code === 201) {
    const responseJson = pm.response.json();
    
    // Save token after login/register
    if (responseJson.data && responseJson.data.token) {
        pm.environment.set('user1_token', responseJson.data.token);
    }
    
    // Save user ID
    if (responseJson.data && responseJson.data.user) {
        pm.environment.set('user1_id', responseJson.data.user._id);
    }
    
    // Save chat ID
    if (responseJson.data && responseJson.data.chat) {
        pm.environment.set('chat_id', responseJson.data.chat._id);
    }
}
```

---

## 🔍 **Error Testing**

### **Test Invalid Authentication:**
```
GET http://localhost:5000/api/auth/me
Authorization: Bearer invalid_token
```

### **Test Rate Limiting:**
Send multiple requests quickly to trigger rate limiting:
```
POST http://localhost:5000/api/auth/login
(Send 10+ times quickly)
```

### **Test Validation Errors:**
```
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
    "username": "ab",
    "email": "invalid-email",
    "password": "123"
}
```

---

## 📊 **Expected HTTP Status Codes**

- **200**: Success (GET, PUT, DELETE)
- **201**: Created (POST registration, chat creation)
- **400**: Bad Request (validation errors)
- **401**: Unauthorized (missing/invalid token)
- **403**: Forbidden (no permission)
- **404**: Not Found (resource doesn't exist)
- **429**: Too Many Requests (rate limiting)
- **500**: Internal Server Error

---

## 🎯 **Pro Tips for Testing**

1. **Save Tokens**: Always save JWT tokens from login/register responses
2. **Use Environment Variables**: Set up Postman environment for easy token management
3. **Test Error Cases**: Don't just test happy paths
4. **Check Rate Limiting**: Test the rate limiting functionality
5. **Real-time Testing**: Use Socket.io clients to test real-time features
6. **File Uploads**: Test with different file types and sizes
7. **Test Pagination**: Use page and limit parameters for list endpoints

---

## 🌐 **Socket.io Testing (Optional)**

For real-time features, you can use a Socket.io client tester:

```javascript
const socket = io('http://localhost:5000', {
    auth: { token: 'YOUR_JWT_TOKEN_HERE' }
});

socket.on('connect', () => {
    console.log('Connected!');
    socket.emit('join-chat', 'CHAT_ID_HERE');
});

socket.on('new-message', (message) => {
    console.log('New message:', message);
});
```

This comprehensive guide will help you test all the major functionalities of the Chatter API using Postman! 🚀
