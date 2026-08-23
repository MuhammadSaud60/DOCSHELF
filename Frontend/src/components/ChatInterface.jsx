import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { streamQuestion } from '../services/api';

export default function ChatInterface({ disabled, hasDocument, sessionKey }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Hello! Upload a document and ask me anything about it.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        text: hasDocument
          ? 'Document ready. Ask me anything about it!'
          : 'Hello! Upload a document and ask me anything about it.',
      },
    ]);
  }, [sessionKey, hasDocument]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (e) => {
    e?.preventDefault();
    const query = input.trim();
    if (!query || loading || disabled) return;

    const userMsg = { role: 'user', text: query };
    const historySnapshot = messages.filter((m) => m.text && m.text.trim().length > 0);

    // Add user message & empty assistant placeholder
    setMessages((prev) => [
      ...prev,
      userMsg,
      { role: 'assistant', text: '' },
    ]);
    setInput('');
    setLoading(true);

    try {
      const finalReply = await streamQuestion(query, historySnapshot, (streamedText) => {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            text: streamedText,
          };
          return updated;
        });
      });

      // Ensure assistant bubble contains the final string
      if (finalReply) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            text: finalReply,
          };
          return updated;
        });
      }
    } catch (err) {
      console.error('Chat Error:', err);
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          text: 'Failed to get a response from the server. Please try again.',
        };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col rounded-2xl border border-black/10 bg-white shadow-sm overflow-hidden">
      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          const isLast = index === messages.length - 1;
          const showLoadingDots = loading && isLast && !msg.text;

          return (
            <div
              key={index}
              className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-zinc-900 text-white shadow-sm">
                  <Bot className="h-4 w-4 text-emerald-400" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  isUser
                    ? 'bg-blue-600 text-white font-medium shadow-sm'
                    : 'bg-zinc-100 text-zinc-900 shadow-sm border border-zinc-200/60'
                }`}
              >
                {isUser ? (
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                ) : msg.text ? (
                  <div className="prose prose-sm prose-zinc max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ node, ...props }) => <p className="mb-2.5 last:mb-0" {...props} />,
                        ul: ({ node, ...props }) => <ul className="mb-2.5 list-disc pl-5 space-y-1" {...props} />,
                        ol: ({ node, ...props }) => <ol className="mb-2.5 list-decimal pl-5 space-y-1" {...props} />,
                        li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
                        strong: ({ node, ...props }) => <strong className="font-semibold text-zinc-950" {...props} />,
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                ) : showLoadingDots ? (
                  <div className="flex items-center gap-1.5 py-1">
                    <span className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce"></span>
                    <span className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce [animation-delay:0.2s]"></span>
                    <span className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                ) : null}
              </div>

              {isUser && (
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-600 text-white shadow-sm">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Query Input */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 border-t border-black/10 bg-zinc-50 p-3 sm:px-6 sm:py-4"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            hasDocument
              ? 'Ask about this document...'
              : 'Upload a document first to enable chat...'
          }
          disabled={disabled || loading || !hasDocument}
          className="flex-1 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm text-zinc-950 placeholder-zinc-400 outline-none transition focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 disabled:bg-zinc-100 disabled:cursor-not-allowed"
        />

        <button
          type="submit"
          disabled={disabled || loading || !input.trim() || !hasDocument}
          className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-950 text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </form>
    </div>
  );
}