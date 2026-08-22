import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Database,
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import DocumentUpload from './components/DocumentUpload';
import ChatInterface from './components/ChatInterface';
import { clearKnowledgeBase } from './services/api';

let bootResetPromise;

const createId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const resetBackendOncePerPageLoad = () => {
  if (!bootResetPromise) {
    bootResetPromise = clearKnowledgeBase();
  }

  return bootResetPromise;
};

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sessionVersion, setSessionVersion] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isClearing, setIsClearing] = useState(false);
  const [isPreparing, setIsPreparing] = useState(true);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [notice, setNotice] = useState(null);

  const resetClientSession = useCallback(() => {
    setUploadedFiles([]);
    setSessionVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;

    setIsPreparing(true);
    resetClientSession();

    resetBackendOncePerPageLoad()
      .then(() => {
        if (isMounted) {
          setNotice({ type: 'success', text: 'Workspace reset for this page load.' });
        }
      })
      .catch(() => {
        if (isMounted) {
          setNotice({ type: 'error', text: 'Could not reset the knowledge base automatically.' });
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsPreparing(false);
        }
      });

    const handlePageShow = (event) => {
      if (event.persisted) {
        resetClientSession();
      }
    };

    window.addEventListener('pageshow', handlePageShow);

    return () => {
      isMounted = false;
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [resetClientSession]);

  const prepareDocumentUpload = useCallback(async () => {
    resetClientSession();
    setNotice(null);
    await clearKnowledgeBase();
  }, [resetClientSession]);

  const handleUploadSuccess = useCallback((fileName, result) => {
    setUploadedFiles([
      {
        id: createId(),
        name: fileName,
        chunks: result?.total_chunks_created ?? null,
      },
    ]);
    setNotice({ type: 'success', text: 'Document ready. Chat history has been reset.' });
  }, []);

  const handleClearAll = useCallback(async () => {
    if (isClearing) return;

    setIsClearing(true);
    setNotice(null);
    resetClientSession();

    try {
      await clearKnowledgeBase();
      setNotice({ type: 'success', text: 'Workspace cleared.' });
    } catch {
      setNotice({ type: 'error', text: 'Could not clear the knowledge base.' });
    } finally {
      setIsClearing(false);
    }
  }, [isClearing, resetClientSession]);

  const activeDocument = uploadedFiles[0];

  const workspaceState = useMemo(() => {
    if (isPreparing) {
      return {
        label: 'Resetting workspace',
        tone: 'text-amber-300 bg-amber-300/10 border-amber-300/20',
      };
    }

    if (isUploadingDocument) {
      return {
        label: 'Indexing document',
        tone: 'text-emerald-300 bg-emerald-300/10 border-emerald-300/20',
      };
    }

    if (activeDocument) {
      return {
        label: 'Document active',
        tone: 'text-emerald-300 bg-emerald-300/10 border-emerald-300/20',
      };
    }

    return {
      label: 'Clean workspace',
      tone: 'text-zinc-300 bg-white/5 border-white/10',
    };
  }, [activeDocument, isPreparing, isUploadingDocument]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#f5f7fa] text-zinc-950">
      <div className="flex h-full w-full">
        <aside
          className={`relative z-20 flex h-full shrink-0 flex-col overflow-hidden border-r border-black/10 bg-[#111417] text-white transition-[width,transform] duration-300 ease-out ${
            isSidebarOpen ? 'w-[21.5rem] translate-x-0 sm:w-[24rem]' : 'w-0 -translate-x-full border-r-0'
          }`}
        >
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-5 sm:px-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white text-zinc-950 shadow-sm">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold tracking-tight">Gemini RAG Studio</p>
                  <p className="text-xs text-zinc-400">Private document workspace</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-lg text-zinc-400 transition hover:bg-white/10 hover:text-white"
                aria-label="Close sidebar"
              >
                <PanelLeftClose className="h-5 w-5" />
              </button>
            </div>

            <div className={`rounded-xl border px-3 py-2 text-xs font-medium ${workspaceState.tone}`}>
              <div className="flex items-center justify-between gap-3">
                <span>{workspaceState.label}</span>
                {isPreparing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              </div>
            </div>

            <DocumentUpload
              disabled={isPreparing || isClearing}
              onPrepareUpload={prepareDocumentUpload}
              onUploadSuccess={handleUploadSuccess}
              onUploadStateChange={setIsUploadingDocument}
              resetKey={sessionVersion}
            />

            <section className="min-h-0 flex-1">
              <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-zinc-400">
                <span className="flex items-center gap-2">
                  <Database className="h-3.5 w-3.5 text-emerald-300" />
                  Active Document
                </span>
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-zinc-300">
                  {uploadedFiles.length}
                </span>
              </div>

              {activeDocument ? (
                <div className="rounded-xl border border-white/10 bg-white p-3 text-zinc-950 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{activeDocument.name}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {activeDocument.chunks ? `${activeDocument.chunks} chunks indexed` : 'Indexed for retrieval'}
                      </p>
                    </div>
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-white/15 bg-white/5 px-4 py-5 text-sm text-zinc-400">
                  No document is active in this browser session.
                </div>
              )}
            </section>

            {notice && (
              <div
                className={`rounded-xl border px-3 py-2 text-xs ${
                  notice.type === 'success'
                    ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-200'
                    : 'border-rose-300/20 bg-rose-300/10 text-rose-200'
                }`}
              >
                {notice.text}
              </div>
            )}

            <button
              type="button"
              onClick={handleClearAll}
              disabled={isClearing || isPreparing || isUploadingDocument}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-zinc-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isClearing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {isClearing ? 'Clearing workspace' : 'Clear workspace'}
            </button>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-black/10 bg-white/85 px-4 backdrop-blur sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              {!isSidebarOpen && (
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(true)}
                  className="grid h-10 w-10 place-items-center rounded-xl border border-black/10 bg-white text-zinc-600 shadow-sm transition hover:text-zinc-950"
                  aria-label="Open sidebar"
                >
                  <PanelLeftOpen className="h-5 w-5" />
                </button>
              )}
              <div className="min-w-0">
                <h1 className="truncate text-sm font-semibold tracking-tight text-zinc-950">
                  {activeDocument ? activeDocument.name : 'Document chat'}
                </h1>
                <p className="truncate text-xs text-zinc-500">
                  {activeDocument ? 'Chat context is scoped to the current upload.' : 'Upload a document to start a fresh session.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClearAll}
              disabled={isClearing || isPreparing || isUploadingDocument}
              className="hidden h-10 items-center gap-2 rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold text-zinc-700 shadow-sm transition hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50 sm:flex"
            >
              {isClearing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Reset
            </button>
          </header>

          <div className="min-h-0 flex-1 px-3 py-3 sm:px-6 sm:py-6">
            <ChatInterface
              disabled={isPreparing || isClearing || isUploadingDocument}
              hasDocument={Boolean(activeDocument)}
              sessionKey={sessionVersion}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
