import React, { useState, useRef } from 'react';
import { messageAPI } from '../services/api';
import socketService from '../services/socket';
import toastService from '../services/toast';
import './MessageInput.css';

interface MessageInputProps {
  chatId: string;
}

const MessageInput: React.FC<MessageInputProps> = ({ chatId }) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
    
    // Handle typing indicator
    if (!isTyping) {
      setIsTyping(true);
      socketService.startTyping(chatId);
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socketService.stopTyping(chatId);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    try {
      const messageData = {
        content: message.trim()
      };

      // Send via API
      await messageAPI.sendMessage(chatId, messageData);
      
      // Send via socket for real-time update
      socketService.sendMessage({ ...messageData, chat: chatId });
      
      setMessage('');
      setIsTyping(false);
      socketService.stopTyping(chatId);
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      
      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    } catch (error: any) {
      console.error('Failed to send message:', error);
      const errorMessage = error.response?.data?.message || 'Failed to send message';
      toastService.error(errorMessage);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toastService.error('Please select an image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toastService.error('Image size should be less than 5MB');
      return;
    }

    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('media', file);

      const response = await messageAPI.uploadMedia(chatId, formData);
      
      // Send image message
      const messageData = {
        imageUrl: response.data.imageUrl || response.data.url
      };

      await messageAPI.sendMessage(chatId, messageData);
      socketService.sendMessage({ ...messageData, chat: chatId });
      
    } catch (error: any) {
      console.error('Failed to upload image:', error);
      const errorMessage = error.response?.data?.message || 'Failed to upload image';
      toastService.error(errorMessage);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="message-input">
      <div className="input-container">
        {/* Attachment Button */}
        <button
          className="attachment-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title="Attach image"
        >
          {uploading ? (
            <div className="upload-spinner">
              <i className="bi bi-arrow-clockwise spin"></i>
            </div>
          ) : (
            <i className="bi bi-paperclip"></i>
          )}
        </button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          style={{ display: 'none' }}
        />

        {/* Message Input Field */}
        <div className="text-input-wrapper">
          <textarea
            ref={textareaRef}
            className="text-input"
            placeholder="Type a message..."
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            rows={1}
          />
          
          {/* Emoji Button */}
          <button className="emoji-btn" title="Emoji">
            <i className="bi bi-emoji-smile"></i>
          </button>
        </div>

        {/* Send Button */}
        {message.trim() ? (
          <button
            className="send-btn active"
            onClick={handleSendMessage}
            title="Send message"
          >
            <i className="bi bi-send-fill"></i>
          </button>
        ) : (
          <button className="voice-btn" title="Voice message">
            <i className="bi bi-mic"></i>
          </button>
        )}
      </div>
    </div>
  );
};

export default MessageInput;
