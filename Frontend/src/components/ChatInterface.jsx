import React, { useEffect, useRef, useState } from 'react';
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { askQuestion } from '../services/api';

const getInitialMessages = (hasDocument) => [
  {
    role: 'assistant',
    text: hasDocument
      ? 'Document ready. Ask me anything about it.'
      : 'Hello! Upload a document and ask me anything about it.',
  },
];

export default function ChatInterface({ disabled = false, hasDocument = false, sessionKey = 0 }) {
  const [messages, setMessages] = useState(() => getInitialMessages(hasDocument));
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const inputDisabled = loading || disabled || !hasDocument;

  useEffect(() => {
    setMessages(getInitialMessages(hasDocument));
    setInput('');
    setLoading(false);
  }, [hasDocument, sessionKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  const handleSend = async () => {
    const query = input.trim();
    if (!query || inputDisabled) return;

    const userMsg = { role: 'user', text: query };
    const historySnapshot = [...messages];

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await askQuestion(query, historySnapshot);
      const botReply = response?.answer || 'No response received.';

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: botReply,
        },
      ]);
    } catch (err) {
      console.error('Ask Error:', err);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Failed to get a response from the server.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl border border-slate-800/80 bg-slate-900/60 shadow-2xl backdrop-blur-sm sm:rounded-2xl">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-800 bg-slate-950/60 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-slate-100">DOCSHELF Assistant</h3>
            <p className="truncate text-xs text-slate-400">Private document chat</p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:space-y-4 sm:p-6">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';

          return (
            <div
              key={index}
              className={`flex items-start gap-2 sm:gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${
                  isUser
                    ? 'bg-blue-600 text-white'
                    : 'border border-emerald-400/30 bg-emerald-500/15 text-emerald-300'
                }`}
              >
                {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>

              <div
                className={`min-w-0 max-w-[calc(100%-2.75rem)] break-words rounded-2xl px-3.5 py-3 text-sm leading-relaxed sm:max-w-[85%] sm:px-5 sm:py-3.5 ${
                  isUser
                    ? 'rounded-tr-none bg-blue-600 text-white'
                    : 'rounded-tl-none border border-slate-700/50 bg-slate-800/80 text-slate-200'
                }`}
              >
                {isUser ? (
                  <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                ) : (
                  <div className="max-w-none space-y-2 overflow-x-auto text-slate-200">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => <p className="mb-2 leading-relaxed last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                        ul: ({ children }) => <ul className="mb-3 ml-4 list-disc space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="mb-3 ml-4 list-decimal space-y-1">{children}</ol>,
                        li: ({ children }) => <li className="text-slate-300">{children}</li>,
                        h3: ({ children }) => (
                          <h3 className="mb-1 mt-3 text-base font-bold text-slate-100">{children}</h3>
                        ),
                        pre: ({ children }) => (
                          <pre className="overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs">{children}</pre>
                        ),
                        code: ({ children }) => (
                          <code className="rounded bg-slate-950 px-1.5 py-0.5 font-mono text-xs text-emerald-200">
                            {children}
                          </code>
                        ),
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-start gap-2 sm:gap-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-emerald-400/30 bg-emerald-500/15 text-emerald-300">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex min-w-0 max-w-[calc(100%-2.75rem)] items-center gap-2 rounded-2xl rounded-tl-none border border-slate-700/50 bg-slate-800/80 px-3.5 py-3 text-xs text-slate-400 sm:px-4">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-emerald-300" />
              <span className="min-w-0">Analyzing context and answering...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="shrink-0 border-t border-slate-800 bg-slate-950/60 p-3 sm:p-4">
        <div className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 transition-colors focus-within:border-blue-500 sm:px-4">
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={hasDocument ? 'Ask about this document...' : 'Upload a document to start chatting'}
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none disabled:cursor-not-allowed"
            disabled={inputDisabled}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || inputDisabled}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-600 text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
