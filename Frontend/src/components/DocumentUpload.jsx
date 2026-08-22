import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, FileText, Loader2, UploadCloud } from 'lucide-react';
import { uploadDocument } from '../services/api';

const validExtensions = new Set(['.pdf', '.docx', '.doc', '.txt', '.md']);

const getFileExtension = (fileName) => {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot >= 0 ? fileName.slice(lastDot).toLowerCase() : '';
};

function DocumentUpload({ disabled = false, onPrepareUpload, onUploadStateChange, onUploadSuccess, resetKey }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState(null);
  const fileInputRef = useRef(null);
  const uploadControllerRef = useRef(null);

  useEffect(() => {
    setIsDragging(false);
    setStatus(null);
  }, [resetKey]);

  useEffect(() => {
    return () => {
      uploadControllerRef.current?.abort();
      onUploadStateChange?.(false);
    };
  }, [onUploadStateChange]);

  const resetFileInput = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const processFile = useCallback(
    async (file) => {
      if (!file || disabled || isUploading) return;

      const fileExtension = getFileExtension(file.name);

      if (!validExtensions.has(fileExtension)) {
        setStatus({
          type: 'error',
          message: 'Upload a PDF, Word, TXT, or Markdown file.',
        });
        resetFileInput();
        return;
      }

      uploadControllerRef.current?.abort();
      uploadControllerRef.current = new AbortController();

      setIsUploading(true);
      onUploadStateChange?.(true);
      setIsDragging(false);
      setStatus(null);

      try {
        await onPrepareUpload?.();
        const result = await uploadDocument(file, { signal: uploadControllerRef.current.signal });
        setStatus({
          type: 'success',
          message: `${file.name} is ready for chat.`,
        });
        onUploadSuccess?.(file.name, result);
      } catch (error) {
        if (error?.code !== 'ERR_CANCELED') {
          setStatus({
            type: 'error',
            message: error?.response?.data?.detail || 'The document could not be processed.',
          });
        }
      } finally {
        setIsUploading(false);
        onUploadStateChange?.(false);
        resetFileInput();
      }
    },
    [disabled, isUploading, onPrepareUpload, onUploadStateChange, onUploadSuccess, resetFileInput],
  );

  const handleInputChange = useCallback(
    (event) => {
      processFile(event.target.files?.[0]);
    },
    [processFile],
  );

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    setIsDragging((current) => current || true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();
      processFile(event.dataTransfer.files?.[0]);
    },
    [processFile],
  );

  const openFilePicker = useCallback(() => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  }, [disabled, isUploading]);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
      <div className="mb-4 flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-300 text-zinc-950">
          <UploadCloud className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight text-white">Upload document</h2>
          <p className="mt-1 text-xs text-zinc-400">PDF, DOCX, DOC, TXT, or MD</p>
        </div>
      </div>

      <button
        type="button"
        onClick={openFilePicker}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        disabled={disabled || isUploading}
        className={`flex min-h-44 w-full flex-col items-center justify-center rounded-2xl border border-dashed px-5 text-center transition ${
          isDragging
            ? 'border-emerald-300 bg-emerald-300/10 text-white'
            : 'border-white/15 bg-black/20 text-zinc-300 hover:border-white/30 hover:bg-black/30'
        } disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleInputChange}
          accept=".pdf,.docx,.doc,.txt,.md"
          disabled={disabled || isUploading}
        />

        {isUploading ? (
          <>
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-emerald-300" />
            <span className="text-sm font-semibold text-white">Indexing document</span>
            <span className="mt-1 text-xs text-zinc-400">Previous context is being replaced.</span>
          </>
        ) : (
          <>
            <div className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-white text-zinc-950">
              <FileText className="h-6 w-6" />
            </div>
            <span className="text-sm font-semibold text-white">Choose a file</span>
            <span className="mt-1 text-xs text-zinc-400">Drag it here or select from your computer.</span>
          </>
        )}
      </button>

      {status && (
        <div
          className={`mt-4 flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-xs ${
            status.type === 'success'
              ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-200'
              : 'border-rose-300/20 bg-rose-300/10 text-rose-200'
          }`}
        >
          {status.type === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>{status.message}</span>
        </div>
      )}
    </section>
  );
}

export default memo(DocumentUpload);
