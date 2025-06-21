import React, { useState, useRef } from 'react';
import EmojiPicker from 'emoji-picker-react';
import type { EmojiClickData } from 'emoji-picker-react';
import { messageAPI } from '../services/api';
import socketService from '../services/socket';
import toastService from '../services/toast';
import FileAttachmentModal from './FileAttachmentModal';
import './MessageInput.css';

interface MessageInputProps {
  chatId: string;
}

const MessageInput: React.FC<MessageInputProps> = ({ chatId }) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFileModal, setShowFileModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

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
        content: message.trim(),
        messageType: 'text'
      };

      console.log('Sending message:', messageData);

      // Clear input immediately for better UX
      const messageToSend = message.trim();
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

      // Send via socket for real-time update
      socketService.sendMessage({ 
        chatId, 
        content: messageToSend,
        messageType: 'text'
      });

      console.log('Message sent via socket successfully');
    } catch (error: any) {
      console.error('Failed to send message:', error);
      const errorMessage = error.response?.data?.message || 'Failed to send message';
      toastService.error(errorMessage);
      
      // Restore message on error
      setMessage(message);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toastService.error('File size should be less than 10MB');
      return;
    }

    // Check file type and show appropriate message
    let messageType = 'file';
    
    if (file.type.startsWith('image/')) {
      messageType = 'image';
    } else if (file.type.startsWith('video/')) {
      messageType = 'video';
    } else if (file.type.startsWith('audio/')) {
      messageType = 'audio';
    }

    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('media', file);

      const response = await messageAPI.uploadMedia(chatId, formData);
      
      // Send file message with type
      const messageData = {
        content: messageType === 'image' ? '' : file.name,
        imageUrl: response.data.imageUrl || response.data.url,
        messageType,
        fileName: file.name,
        fileSize: file.size
      };

      await messageAPI.sendMessage(chatId, messageData);
      socketService.sendMessage({ ...messageData, chat: chatId });
      
      toastService.success(`${messageType.charAt(0).toUpperCase() + messageType.slice(1)} uploaded successfully!`);
      
    } catch (error: any) {
      console.error('Failed to upload file:', error);
      const errorMessage = error.response?.data?.message || 'Failed to upload file';
      toastService.error(errorMessage);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleFileUpload(file);
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  const toggleEmojiPicker = () => {
    setShowEmojiPicker(prev => !prev);
  };

  // Close emoji picker when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="message-input">
      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="emoji-picker-container" ref={emojiPickerRef}>
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            autoFocusSearch={false}
            height={350}
            width={320}
            previewConfig={{
              showPreview: false
            }}
          />
        </div>
      )}

      <div className="input-container">
        {/* Attachment Button */}
        <button
          className="attachment-btn"
          onClick={() => setShowFileModal(true)}
          disabled={uploading}
          title="Attach file"
        >
          {uploading ? (
            <div className="loading-spinner">
              <i className="bi bi-arrow-clockwise"></i>
            </div>
          ) : (
            <i className="bi bi-plus-circle-fill"></i>
          )}
        </button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.rar"
          onChange={handleImageUpload}
          style={{ display: 'none' }}
        />

        <FileAttachmentModal
          isOpen={showFileModal}
          onClose={() => setShowFileModal(false)}
          onFileSelect={handleFileUpload}
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
        </div>

        {/* Emoji Button */}
        <button 
          className={`emoji-btn ${showEmojiPicker ? 'active' : ''}`}
          onClick={toggleEmojiPicker}
          title="Add emoji"
        >
          <i className="bi bi-emoji-smile"></i>
        </button>

        {/* Send Button or Voice Button */}
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
            <i className="bi bi-mic-fill"></i>
          </button>
        )}
      </div>
    </div>
  );
};

export default MessageInput;
