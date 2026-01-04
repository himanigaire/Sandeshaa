import { useEffect } from 'react';

const BLOCKED_EXTENSIONS = [
  '.exe', '.dll', '.bat', '.cmd', '.com', '.scr', '.msi',
  '.sh', '.bash', '.ps1', '.vbs', '.jse', '.jar', '.apk',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const FileUpload = ({ onFileSelect, disabled, selectedFile }) => {
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

    return null;
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    
    if (file) {
      console.log('File selected:', file.name); // Debug log
      
      const validationError = validateFile(file);
      
      if (validationError) {
        alert(validationError);
        e.target.value = '';
        onFileSelect(null);
        return;
      }

      onFileSelect(file);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onFileSelect(null);
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  // Clear file input when selectedFile becomes null
  useEffect(() => {
    if (!selectedFile) {
      const fileInput = document.getElementById('file-input');
      if (fileInput) {
        fileInput.value = '';
      }
    }
  }, [selectedFile]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
      <input
        type="file"
        id="file-input"
        onChange={handleFileChange}
        disabled={disabled}
        style={{ display: 'none' }}
        accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt,.zip,.mp3,.mp4"
      />
      
      {!selectedFile ? (
        <label htmlFor="file-input" style={{ cursor: disabled ? 'not-allowed' : 'pointer', margin: 0 }}>
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
            📎 Attach File
          </span>
        </label>
      ) : (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 0.75rem',
          background: '#f0f0f0',
          borderRadius: '8px',
          fontSize: '0.85rem',
        }}>
          <span style={{ color: '#333', fontWeight: '500' }}>
            📎 {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
          </span>
          <button
            onClick={handleClear}
            type="button"
            style={{
              background: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              cursor: 'pointer',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: '1',
              padding: 0,
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default FileUpload;