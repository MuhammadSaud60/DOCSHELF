import React, { useRef, useState } from 'react';
import { Upload, FileUp, Loader2 } from 'lucide-react';
import { uploadDocument } from '../services/api';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const DOCUMENT_TOO_LARGE_MESSAGE =
  '⚠️ Document too large: This demo is hosted on free cloud tiers and is limited to files under 5 MB. DOCSHELF is a portfolio project built by Muhammad Saud for practice and demonstration purposes. Please try uploading a smaller document or resume.';

export default function DocumentUpload({
  disabled,
  onPrepareUpload,
  onUploadSuccess,
  onUploadStateChange,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const fileInputRef = useRef(null);

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 1. Triggered when a file is selected via click or drag-and-drop
  const processUpload = async (file) => {
    if (!file || disabled || uploading) return;

    setIsDragging(false);

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setAlertMessage(DOCUMENT_TOO_LARGE_MESSAGE);
      resetFileInput();
      return;
    }

    setAlertMessage('');
    setUploading(true);
    onUploadStateChange?.(true);
    await onPrepareUpload?.();

    try {
      // Calls the centralized API helper which attaches session_id
      const result = await uploadDocument(file);
      onUploadSuccess?.(file.name, result);
    } catch (error) {
      console.error('File upload failed:', error);
      setAlertMessage(error?.response?.data?.detail || 'Failed to upload document. Please try again.');
    } finally {
      setUploading(false);
      onUploadStateChange?.(false);
      resetFileInput();
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
    <div className="space-y-3">
      {alertMessage && (
        <div
          role="alert"
          className="rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2.5 text-xs leading-relaxed text-amber-100"
        >
          {alertMessage}
        </div>
      )}

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
    </div>
  );
}
