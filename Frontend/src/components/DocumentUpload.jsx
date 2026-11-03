import React, { useRef, useState } from 'react';
import { Upload, FileUp, Loader2 } from 'lucide-react';
import { uploadDocument, getUploadStatus } from '../services/api';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const DOCUMENT_TOO_LARGE_MESSAGE =
  'Document too large: This demo is hosted on free cloud tiers and is limited to files under 5 MB. DOCSHELF is a portfolio project built by Muhammad Saud for practice and demonstration purposes. Please try uploading a smaller document or resume.';

const isDeployedEnvironment = () => {
  if (typeof window === 'undefined') return false;
  const isLocal = ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname);
  return !isLocal;
};

export default function DocumentUpload({
  disabled,
  onPrepareUpload,
  onUploadSuccess,
  onUploadStateChange,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const fileInputRef = useRef(null);

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const pollJobUntilDone = async (jobId) => {
    // Poll every 2s; give up after ~10 minutes
    const maxAttempts = 300;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const status = await getUploadStatus(jobId);
      if (status.status === 'done') return status;
      if (status.status === 'failed') {
        throw new Error(status.error || 'Document processing failed on the server.');
      }
      // queued / processing -> keep polling
    }
    throw new Error('Processing timed out. Please try again.');
  };

  const processUploads = async (files) => {
    if (!files.length || disabled || uploading) return;

    setIsDragging(false);
    const isDeployed = isDeployedEnvironment();

    // Filter out oversized files on deployed env, keep the rest
    const validFiles = [];
    for (const f of files) {
      if (isDeployed && f.size > MAX_FILE_SIZE_BYTES) {
        setAlertMessage(DOCUMENT_TOO_LARGE_MESSAGE);
      } else {
        validFiles.push(f);
      }
    }
    if (!validFiles.length) {
      resetFileInput();
      return;
    }

    setAlertMessage('');
    setUploading(true);
    onUploadStateChange?.(true);
    await onPrepareUpload?.();

    try {
      // Upload files one by one, poll each background job
      for (const file of validFiles) {
        const result = await uploadDocument(file);
        if (result.job_id) {
          setUploading(false);
          setProcessing(true);
          const done = await pollJobUntilDone(result.job_id);
          setProcessing(false);
          setUploading(true);
          onUploadSuccess?.(file.name, done);
        } else {
          // Fallback for older backend responses
          onUploadSuccess?.(file.name, result);
        }
      }
    } catch (error) {
      console.error('File upload failed:', error);
      const fallbackMsg = isDeployed
        ? DOCUMENT_TOO_LARGE_MESSAGE
        : 'Failed to upload document. Please check your local backend logs.';
      setAlertMessage(error?.response?.data?.detail || error.message || fallbackMsg);
    } finally {
      setUploading(false);
      setProcessing(false);
      onUploadStateChange?.(false);
      resetFileInput();
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) {
      processUploads(files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled && !uploading && !processing) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) {
      processUploads(files);
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
        onClick={() => !disabled && !uploading && !processing && fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition cursor-pointer ${
          isDragging
            ? 'border-emerald-400 bg-emerald-400/10'
            : 'border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/10'
        } ${disabled || uploading || processing ? 'cursor-not-allowed opacity-50' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,.txt,.md"
          multiple
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled || uploading || processing}
        />

        <div className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-white/10 text-white">
          {uploading || processing ? (
            <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
          ) : (
            <FileUp className="h-6 w-6 text-emerald-400" />
          )}
        </div>

        <p className="text-sm font-semibold text-white">
          {uploading ? 'Uploading...' : processing ? 'Processing document... (large files take a while)' : 'Choose a file'}
        </p>
        <p className="mt-1 text-xs text-zinc-400">
          Drag it here or select from your computer (PDF, DOCX, TXT)
        </p>
      </div>
    </div>
  );
}