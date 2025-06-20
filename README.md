# Chatter - Real-Time Chat App

A full-stack real-time chat application with modern UI and comprehensive features.

## 🚀 Features

- **Real-time Messaging**: Instant communication with Socket.io
- **User Authentication**: JWT-based secure authentication
- **Profile Management**: Upload profile pictures via Cloudinary
- **Group Chats**: Create and manage group conversations
- **Media Sharing**: Send and receive images
- **Typing Indicators**: Live typing status
- **Online Status**: See who's online/offline
- **Responsive Design**: Works on all devices
- **Modern UI**: Clean, professional interface

## 🛠️ Tech Stack

### Frontend
- React 19 with TypeScript
- Vite for development
- Bootstrap 5 for UI
- Socket.io Client
- Axios for API calls
- React Router for navigation

### Backend
- Node.js & Express.js
- Socket.io for real-time communication
- MongoDB with Mongoose
- JWT authentication
- Cloudinary for image hosting
- Bcrypt for password hashing

## 📦 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud)
- Cloudinary account (for image uploads)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd Real-time-chat-app
   ```

2. **Setup Backend**
   ```bash
   cd server
   npm install
   cp .env.example .env  # Configure your environment variables
   npm run dev
   ```

3. **Setup Frontend**
   ```bash
   cd ../client
   npm install
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000

## 🔧 Environment Variables

Create a `.env` file in the server directory:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/chatter
JWT_SECRET=your-jwt-secret-key
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## 📁 Project Structure

```
Real-time-chat-app/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── context/       # React context
│   │   ├── services/      # API & Socket services
│   │   └── ...
├── server/                # Node.js backend
│   ├── controllers/       # Route controllers
│   ├── models/           # MongoDB models
│   ├── routes/           # API routes
│   ├── middlewares/      # Custom middlewares
│   ├── utils/            # Utility functions
│   └── ...
└── README.md
```

## 🎯 Available Scripts

### Backend (server/)
- `npm run dev` - Start development server
- `npm start` - Start production server
- `npm test` - Run tests

### Frontend (client/)
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile

### Chats
- `GET /api/chats` - Get user chats
- `POST /api/chats` - Create new chat
- `GET /api/chats/:id` - Get chat details

### Messages
- `GET /api/messages/:chatId` - Get chat messages
- `POST /api/messages` - Send message
- `POST /api/messages/upload-image` - Upload image

## 🔄 Socket Events

- `connection` - User connects
- `disconnect` - User disconnects
- `joinChat` - Join chat room
- `leaveChat` - Leave chat room
- `sendMessage` - Send message
- `newMessage` - Receive message
- `typing` - Start typing
- `stopTyping` - Stop typing

## 🚀 Deployment

### Frontend (Netlify/Vercel)
1. Build the project: `npm run build`
2. Deploy the `dist` folder

### Backend (Render/Railway)
1. Configure environment variables
2. Deploy the server folder

## 🎨 UI/UX Features

- Responsive design for all screen sizes
- Real-time typing indicators
- Message status indicators
- Online/offline status
- Profile picture support
- Group chat management
- Image sharing capabilities
- Modern chat bubbles
- Smooth animations

## 🔐 Security Features

- JWT authentication
- Password hashing with bcrypt
- Input validation
- CORS protection
- Rate limiting (can be added)
- Image upload validation

## 🎯 Future Enhancements

- Dark mode
- Voice messages
- Video calls
- Push notifications
- Message encryption
- File sharing
- Emoji reactions
- Message search
- Chat themes

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👏 Acknowledgments

- Socket.io for real-time communication
- MongoDB for database
- Cloudinary for image hosting
- Bootstrap for UI components