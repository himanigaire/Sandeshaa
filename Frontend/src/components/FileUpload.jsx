import { useState } from 'react';

const BLOCKED_EXTENSIONS = [
  '.exe', '.dll', '.bat', '.cmd', '.com', '.scr', '.msi',
  '.sh', '.bash', '.ps1', '.vbs', '.jse', '.jar', '.apk',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const FileUpload = ({ onFileSelect, disabled }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');

  const validateFile = (file) => {
    if (file.size > MAX_FILE_SIZE) {
      return `File too large! Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`;
    }

    if (file.size === 0) {
      return 'File is empty!';
    }

    const fileName = file.name.toLowerCase();
    const isBlocked = BLOCKED_EXTENSIONS.some(ext => fileName.endsWith(ext));
    if (isBlocked) {
      return '⚠️ This file type is not allowed for security reasons!';
    }

    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      return 'Invalid filename!';
    }

    return null;
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setError('');
    
    if (file) {
      const validationError = validateFile(file);
      
      if (validationError) {
        setError(validationError);
        setSelectedFile(null);
        e.target.value = '';
        alert(validationError);
        return;
      }

      setSelectedFile(file);
      onFileSelect(file);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setError('');
    onFileSelect(null);
    // Reset file input
    document.getElementById('file-input').value = '';
  };

  return (
    <div className="file-upload">
      <input
        type="file"
        id="file-input"
        onChange={handleFileChange}
        disabled={disabled}
        style={{ display: 'none' }}
        accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt,.zip,.mp3,.mp4"
      />
      <label htmlFor="file-input" style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}>
        <span
          style={{
            display: 'inline-block',
            padding: '0.625rem 1rem',
            background: disabled ? '#e0e0e0' : 'white',
            color: disabled ? '#999' : '#667eea',
            border: '2px solid',
            borderColor: disabled ? '#ccc' : '#667eea',
            borderRadius: '8px',
            fontSize: '0.9rem',
            fontWeight: '600',
            cursor: disabled ? 'not-allowed' : 'pointer',
            userSelect: 'none',
          }}
        >
          📎 Attach
        </span>
      </label>
      
      {selectedFile && (
        <div className="selected-file">
          <span className="file-name">
            {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
          </span>
          <button onClick={handleClear} className="btn-clear-file" type="button">
            ✕
          </button>
        </div>
      )}
      
      {error && <div className="file-error">{error}</div>}
    </div>
  );
};

export default FileUpload;