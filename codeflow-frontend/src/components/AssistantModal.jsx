import React, { useState, useEffect, useRef } from 'react';
import { Send, Trash2, X, Bot } from 'lucide-react';
import api from '@/services/api';
import ReactMarkdown from 'react-markdown';

const AssistantModal = ({ isOpen, onClose, problem, currentCode, language }) => {
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
        const newMessages = [...messages, { role: 'user', content: userMsg }];
        setMessages(newMessages);
        setIsLoading(true);

        try {
            const response = await api.post('/ai/help', {
                userMessage: userMsg,
                conversationHistory: newMessages.slice(-6),
                currentContext: {
                    problemTitle: problem?.title,
                    problemDescription: problem?.description,
                    testCases: problem?.testCases,
                    language: language,
                    code: currentCode
                }
            });

            setMessages([...newMessages, { role: 'assistant', content: response.data.help }]);
        } catch (error) {
            console.error("AI Error:", error);
            setMessages([...newMessages, { role: 'assistant', content: '⚠️ Sorry, I encountered an error. Please try again.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl h-[600px] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg">
                            <Bot size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">CodeFlow Assistant</h3>
                            <p className="text-xs text-slate-500">Powered by Advanced AI</p>
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
                                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 mt-1">
                                    <Bot size={16} className="text-white" />
                                </div>
                            )}
                            
                            <div className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-sm ${
                                msg.role === 'user' 
                                ? 'bg-indigo-600 text-white rounded-br-sm' 
                                : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                            }`}>
                                <ReactMarkdown 
                                    components={{
                                        p: ({node, ...props}) => <p className={`text-sm mb-2 leading-relaxed ${msg.role === 'user' ? 'text-white' : 'text-slate-700'}`} {...props} />,
                                        code: ({node, inline, ...props}) => inline 
                                            ? <code className={`px-1.5 py-0.5 rounded text-xs font-mono ${msg.role === 'user' ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-800 border border-slate-200'}`} {...props} />
                                            : <div className="my-3 overflow-hidden rounded-lg bg-[#1e1e1e] border border-slate-700"><pre className="p-4 overflow-x-auto text-xs font-mono text-slate-50"><code {...props} /></pre></div>,
                                        ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-2 text-sm" {...props} />,
                                        ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-2 text-sm" {...props} />,
                                        strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
                                    }}
                                >
                                    {msg.content}
                                </ReactMarkdown>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex gap-3 justify-start">
                            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                                <Bot size={16} className="text-white" />
                            </div>
                            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-5 py-4 shadow-sm flex items-center gap-1">
                                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-slate-100">
                    <form onSubmit={handleSend} className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask anything about your code..."
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            disabled={isLoading}
                        />
                        <button 
                            type="submit" 
                            disabled={!input.trim() || isLoading}
                            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl px-4 py-2 transition-colors flex items-center justify-center shadow-sm"
                        >
                            <Send size={18} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AssistantModal;