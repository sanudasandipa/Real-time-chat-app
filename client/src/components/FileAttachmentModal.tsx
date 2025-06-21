import React, { useState } from 'react';
import './FileAttachmentModal.css';

interface FileAttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileSelect: (file: File) => void;
}

const FileAttachmentModal: React.FC<FileAttachmentModalProps> = ({
  isOpen,
  onClose,
  onFileSelect
}) => {
  const [dragOver, setDragOver] = useState(false);

  if (!isOpen) return null;

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
      onClose();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      onFileSelect(file);
      onClose();
    }
  };

  return (
    <div className="file-modal-overlay" onClick={onClose}>
      <div className="file-modal" onClick={(e) => e.stopPropagation()}>
        <div className="file-modal-header">
          <h3>Attach File</h3>
          <button className="close-btn" onClick={onClose}>
            <i className="bi bi-x"></i>
          </button>
        </div>

        <div 
          className={`file-drop-zone ${dragOver ? 'drag-over' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="drop-content">
            <i className="bi bi-cloud-upload"></i>
            <p>Drag and drop files here</p>
            <span>or</span>
            <label className="file-select-btn">
              Browse Files
              <input
                type="file"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.rar"
                onChange={handleFileInput}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>

        <div className="file-type-options">
          <label className="file-type-option">
            <input type="file" accept="image/*" onChange={handleFileInput} style={{ display: 'none' }} />
            <div className="option-content">
              <i className="bi bi-image"></i>
              <span>Photos</span>
            </div>
          </label>

          <label className="file-type-option">
            <input type="file" accept="video/*" onChange={handleFileInput} style={{ display: 'none' }} />
            <div className="option-content">
              <i className="bi bi-camera-video"></i>
              <span>Videos</span>
            </div>
          </label>

          <label className="file-type-option">
            <input type="file" accept="audio/*" onChange={handleFileInput} style={{ display: 'none' }} />
            <div className="option-content">
              <i className="bi bi-music-note"></i>
              <span>Audio</span>
            </div>
          </label>

          <label className="file-type-option">
            <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleFileInput} style={{ display: 'none' }} />
            <div className="option-content">
              <i className="bi bi-file-text"></i>
              <span>Documents</span>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
};

export default FileAttachmentModal;
