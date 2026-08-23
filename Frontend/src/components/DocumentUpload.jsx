import React, { useRef, useState } from 'react';
import { Upload, FileUp, Loader2 } from 'lucide-react';
import { uploadDocument } from '../services/api';

export default function DocumentUpload({
  disabled,
  onPrepareUpload,
  onUploadSuccess,
  onUploadStateChange,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // 1. Triggered when a file is selected via click or drag-and-drop
  const processUpload = async (file) => {
    if (!file || disabled || uploading) return;

    setUploading(true);
    onUploadStateChange?.(true);
    await onPrepareUpload?.();

    try {
      // Calls the centralized API helper which attaches session_id
      const result = await uploadDocument(file);
      onUploadSuccess?.(file.name, result);
    } catch (error) {
      console.error('File upload failed:', error);
      alert('Failed to upload document. Please try again.');
    } finally {
      setUploading(false);
      onUploadStateChange?.(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 2. Standard file input change handler
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processUpload(file);
    }
  };

  // 3. Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled && !uploading) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processUpload(file);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
      className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition cursor-pointer ${
        isDragging
          ? 'border-emerald-400 bg-emerald-400/10'
          : 'border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/10'
      } ${disabled || uploading ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.doc,.txt,.md"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || uploading}
      />

      <div className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-white/10 text-white">
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
        ) : (
          <FileUp className="h-6 w-6 text-emerald-400" />
        )}
      </div>

      <p className="text-sm font-semibold text-white">
        {uploading ? 'Processing document...' : 'Choose a file'}
      </p>
      <p className="mt-1 text-xs text-zinc-400">
        Drag it here or select from your computer (PDF, DOCX, TXT)
      </p>
    </div>
  );
}