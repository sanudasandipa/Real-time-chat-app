#!/bin/bash

# Chatter Backend Setup Script
echo "🚀 Setting up Chatter Backend..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if MongoDB is running (local)
if ! pgrep mongod > /dev/null; then
    echo "⚠️  MongoDB is not running locally. Make sure MongoDB is installed and running, or use MongoDB Atlas."
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "✅ Please update the .env file with your actual configuration values."
else
    echo "✅ .env file already exists."
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create uploads directory for local file storage (if needed)
mkdir -p uploads/temp

# Create logs directory
mkdir -p logs

echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update your .env file with the correct values"
echo "2. Make sure MongoDB is running"
echo "3. Set up your Cloudinary account and add credentials to .env"
echo "4. Run 'npm run dev' to start the development server"
echo ""
echo "🔗 Useful commands:"
echo "  npm run dev     - Start development server"
echo "  npm start       - Start production server"
echo "  npm test        - Run tests (when available)"
echo ""
echo "📚 Documentation: Check README.md for detailed setup instructions"
