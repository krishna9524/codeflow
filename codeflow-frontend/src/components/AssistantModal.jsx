import React, { useState, useEffect, useRef } from 'react';
import { Send, Trash2, X, Bot, Copy, Check } from 'lucide-react';
import api from '@/services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';

// --- Small Helper Component for Copy Buttons ---
const CopyButton = ({ text, label }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button 
            onClick={handleCopy} 
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            title="Copy to clipboard"
        >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            {label && <span>{copied ? 'Copied!' : label}</span>}
        </button>
    );
};

// 👉 FIX: lastResult added to props!
const AssistantModal = ({ isOpen, onClose, problem, currentCode, language, lastResult }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    // Load history when modal opens
    useEffect(() => {
        if (isOpen && problem?._id) {
            const savedChat = localStorage.getItem(`ai_chat_${problem._id}`);
            if (savedChat) {
                setMessages(JSON.parse(savedChat));
            } else {
                setMessages([{ role: 'assistant', content: `Hi! I'm your CodeFlow AI. I can see you are working on **${problem.title}**. How can I help you with your ${language} code?` }]);
            }
        }
    }, [isOpen, problem]);

    // Save history whenever messages change
    useEffect(() => {
        if (messages.length > 0 && problem?._id) {
            localStorage.setItem(`ai_chat_${problem._id}`, JSON.stringify(messages));
        }
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, problem]);

    const handleClearChat = () => {
        if (window.confirm('Are you sure you want to clear this conversation?')) {
            localStorage.removeItem(`ai_chat_${problem._id}`);
            setMessages([{ role: 'assistant', content: `Chat cleared. How can I help you with **${problem.title}**?` }]);
        }
    };

    const handleSend = async (e) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg = input.trim();
        setInput('');
        
        // Save the old messages array BEFORE we add the user's new message to the state
        const historyToSend = [...messages]; 
        
        const newMessages = [...messages, { role: 'user', content: userMsg }];
        setMessages(newMessages);
        setIsLoading(true);

        try {
            const response = await api.post('/ai/help', {
                userMessage: userMsg,
                // 👉 FIX: Sending the history WITHOUT the duplicate new message attached yet
                conversationHistory: historyToSend.slice(-6),
                currentContext: {
                    problemTitle: problem?.title,
                    problemDescription: problem?.description,
                    // 👉 FIX: Uses sampleTestCases so it knows the real tests
                    testCases: problem?.sampleTestCases, 
                    language: language,
                    code: currentCode,
                    // 👉 FIX: Passes the execution result so it knows why code failed
                    lastResult: lastResult 
                }
            });

            setMessages([...newMessages, { role: 'assistant', content: response.data.help }]);
        } catch (error) {
            setMessages([...newMessages, { role: 'assistant', content: '⚠️ Sorry, I encountered an error. Please try again.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-3xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white shadow-sm z-10">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg">
                            <Bot size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">CodeFlow Assistant</h3>
                            <p className="text-xs text-slate-500">Powered by Groq LPUs</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handleClearChat} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Clear Chat">
                            <Trash2 size={18} />
                        </button>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'assistant' && (
                                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 mt-1 shadow-sm">
                                    <Bot size={16} className="text-white" />
                                </div>
                            )}
                            
                            <div className={`max-w-[85%] rounded-2xl px-5 py-4 shadow-sm relative group ${
                                msg.role === 'user' 
                                ? 'bg-indigo-600 text-white rounded-br-sm' 
                                : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                            }`}>
                                
                                {/* Copy Entire Message Button (Appears on hover) */}
                                {msg.role === 'assistant' && (
                                    <div className="absolute top-2 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-white pl-2">
                                        <CopyButton text={msg.content} />
                                    </div>
                                )}

                                <ReactMarkdown 
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        p: ({node, ...props}) => <p className={`text-sm mb-3 leading-relaxed last:mb-0 ${msg.role === 'user' ? 'text-white' : 'text-slate-700'}`} {...props} />,
                                        
                                        table: ({node, ...props}) => <div className="overflow-x-auto my-4"><table className="min-w-full divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden" {...props} /></div>,
                                        th: ({node, ...props}) => <th className="px-4 py-3 bg-slate-100 text-left text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200" {...props} />,
                                        td: ({node, ...props}) => <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 border-b border-slate-100 bg-white" {...props} />,
                                        
                                        code({node, inline, className, children, ...props}) {
                                            const match = /language-(\w+)/.exec(className || '');
                                            const codeString = String(children).replace(/\n$/, '');
                                            
                                            if (!inline && match) {
                                                return (
                                                    <div className="my-4 rounded-xl overflow-hidden bg-[#1E1E1E] border border-slate-700 shadow-md">
                                                        <div className="flex items-center justify-between px-4 py-2 bg-[#2D2D2D] border-b border-slate-700">
                                                            <span className="text-xs font-mono text-slate-300 uppercase">{match[1]}</span>
                                                            <CopyButton text={codeString} label="Copy code" />
                                                        </div>
                                                        <SyntaxHighlighter
                                                            {...props}
                                                            style={vscDarkPlus}
                                                            language={match[1]}
                                                            PreTag="div"
                                                            customStyle={{ margin: 0, padding: '1rem', fontSize: '0.85rem', background: 'transparent' }}
                                                        >
                                                            {codeString}
                                                        </SyntaxHighlighter>
                                                    </div>
                                                );
                                            }
                                            return (
                                                <code className={`px-1.5 py-0.5 rounded text-[0.8rem] font-mono ${msg.role === 'user' ? 'bg-indigo-500/50 text-white' : 'bg-slate-100 text-rose-600 border border-slate-200'}`} {...props}>
                                                    {children}
                                                </code>
                                            );
                                        },
                                        ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-3 text-sm space-y-1" {...props} />,
                                        ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-3 text-sm space-y-1" {...props} />,
                                        strong: ({node, ...props}) => <strong className="font-semibold text-slate-900" {...props} />,
                                    }}
                                >
                                    {msg.content}
                                </ReactMarkdown>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex gap-3 justify-start">
                            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
                                <Bot size={16} className="text-white" />
                            </div>
                            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-5 py-4 shadow-sm flex items-center gap-1.5">
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-slate-100 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] z-10">
                    <form onSubmit={handleSend} className="flex gap-3">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask anything about your code..."
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-inner"
                            disabled={isLoading}
                        />
                        <button 
                            type="submit" 
                            disabled={!input.trim() || isLoading}
                            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed text-white rounded-xl px-5 py-2 transition-all flex items-center justify-center shadow-md active:scale-95"
                        >
                            <Send size={18} className={input.trim() && !isLoading ? 'translate-x-0.5 -translate-y-0.5 transition-transform' : ''} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AssistantModal;