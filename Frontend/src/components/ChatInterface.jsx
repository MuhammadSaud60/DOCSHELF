import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { askQuestion } from '../services/api';

export default function ChatInterface() {
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
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const handleSend = async () => {
        const query = input.trim();
        if (!query || loading) return;

        const userMsg = { role: 'user', text: query };

        // Keep snapshot of history before adding the new query
        const historySnapshot = [...messages];

        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            // Send current query along with the conversation history
            const response = await askQuestion(query, historySnapshot);
            const botReply = response?.answer || "No response received.";

            const botMsg = {
                role: 'assistant',
                text: botReply
            };
            setMessages((prev) => [...prev, botMsg]);
        } catch (err) {
            console.error("Ask Error:", err);
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', text: 'Failed to get a response from the server.' }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-slate-900/60 border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-sm">

            {/* Top Header */}
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
                        <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-slate-100">Document Assistant</h3>
                        <p className="text-xs text-slate-400">Powered by Gemini 1.5 Flash</p>
                    </div>
                </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((msg, index) => (
                    <div
                        key={index}
                        className={`flex items-start space-x-3 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'
                            }`}
                    >
                        {/* Avatar */}
                        <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${msg.role === 'user'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                                }`}
                        >
                            {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                        </div>

                        {/* Message Bubble with Rich Markdown Formatting */}
                        <div
                            className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${msg.role === 'user'
                                    ? 'bg-blue-600 text-white rounded-tr-none'
                                    : 'bg-slate-800/80 text-slate-200 border border-slate-700/50 rounded-tl-none'
                                }`}
                        >
                            {msg.role === 'user' ? (
                                <p className="whitespace-pre-wrap">{msg.text}</p>
                            ) : (
                                <div className="prose prose-invert max-w-none text-slate-200 space-y-2">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            p: ({ children }) => <p className="mb-2 leading-relaxed">{children}</p>,
                                            strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                                            ul: ({ children }) => <ul className="list-disc list-inside space-y-1 ml-2 mb-3">{children}</ul>,
                                            ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 ml-2 mb-3">{children}</ol>,
                                            li: ({ children }) => <li className="text-slate-300">{children}</li>,
                                            h3: ({ children }) => <h3 className="text-base font-bold text-slate-100 mt-3 mb-1">{children}</h3>,
                                            code: ({ children }) => (
                                                <code className="bg-slate-950 px-1.5 py-0.5 rounded text-xs text-purple-300 font-mono">
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
                ))}

                {loading && (
                    <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
                            <Bot className="w-4 h-4" />
                        </div>
                        <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl rounded-tl-none px-4 py-3 flex items-center space-x-2 text-slate-400 text-xs">
                            <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                            <span>Analyzing context and answering...</span>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 shrink-0">
                <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 focus-within:border-blue-500 transition-colors">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask a question about your uploaded documents (Press Enter)..."
                        className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
                        disabled={loading}
                    />
                    <button
                        type="button"
                        onClick={handleSend}
                        disabled={!input.trim() || loading}
                        className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors cursor-pointer"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>

        </div>
    );
}