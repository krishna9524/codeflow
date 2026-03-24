import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import api from '@/services/api';
import useAuth from '@/hooks/useAuth';
import { getAvatarUrl } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Spinner from '@/components/Spinner';
import { Send, Smile, Search, MoreVertical, ImageIcon, Paperclip, X, Check, CheckCheck, Download } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import toast from 'react-hot-toast';
import EmojiPicker from 'emoji-picker-react';

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const formatTime = (date) => format(new Date(date), 'h:mm a');

const formatDateLabel = (date) => {
    const d = new Date(date);
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'MMMM d, yyyy');
};

const groupMessagesByDate = (messages) => {
    const groups = [];
    let lastDate = null;
    messages.forEach((msg) => {
        const label = formatDateLabel(msg.createdAt);
        if (label !== lastDate) {
            groups.push({ type: 'date', label });
            lastDate = label;
        }
        groups.push({ type: 'message', data: msg });
    });
    return groups;
};

const getInitials = (name = '') =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

const deduplicateConversations = (convs, currentUserId) => {
    const seen = new Map();
    convs.forEach((c) => {
        const id = c.userId?.toString();
        if (!id || id === currentUserId?.toString()) return;
        if (!seen.has(id)) seen.set(id, c);
    });
    return Array.from(seen.values());
};

/* ─── robust DOM-based content parser ────────────────────────────────────── */
/**
 * Uses DOMParser (browser-native) to reliably split a stored HTML message
 * into { text, images[], files[] } so each can be rendered independently.
 * Falls back to plain-text strip on SSR.
 */
const parseMessageContent = (htmlContent = '') => {
    if (!htmlContent) return { text: '', images: [], files: [] };

    if (typeof window === 'undefined') {
        return { text: htmlContent.replace(/<[^>]*>/g, '').trim(), images: [], files: [] };
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    const images = [];
    const files = [];

    doc.querySelectorAll('a').forEach((a) => {
        const img = a.querySelector('img');
        if (img) {
            images.push({
                href: a.getAttribute('href') || img.getAttribute('src'),
                src: img.getAttribute('src'),
                name: img.getAttribute('alt') || 'image',
            });
            a.remove();
        } else if (a.hasAttribute('download')) {
            files.push({
                href: a.getAttribute('href'),
                name: a.getAttribute('download') || a.textContent.replace('📎', '').trim(),
            });
            a.remove();
        }
    });

    // Remove leftover wrapper divs
    doc.querySelectorAll('div').forEach((d) => d.remove());

    const text = (doc.body.textContent || '').replace(/\s+/g, ' ').trim();

    return { text, images, files };
};

/* ─── file card helpers ───────────────────────────────────────────────────── */
const getFileExtension = (filename = '') =>
    (filename.split('.').pop() || '').toLowerCase();

const FILE_META = {
    pdf:  { bg: '#fff1f0', border: '#fca5a5', icon: '#ef4444', label: 'PDF' },
    doc:  { bg: '#eff6ff', border: '#93c5fd', icon: '#2563eb', label: 'DOC' },
    docx: { bg: '#eff6ff', border: '#93c5fd', icon: '#2563eb', label: 'DOCX' },
    xls:  { bg: '#f0fdf4', border: '#86efac', icon: '#16a34a', label: 'XLS' },
    xlsx: { bg: '#f0fdf4', border: '#86efac', icon: '#16a34a', label: 'XLSX' },
    zip:  { bg: '#fefce8', border: '#fde047', icon: '#ca8a04', label: 'ZIP' },
    txt:  { bg: '#f8fafc', border: '#cbd5e1', icon: '#475569', label: 'TXT' },
    csv:  { bg: '#f0fdf4', border: '#86efac', icon: '#16a34a', label: 'CSV' },
};

/* ─── sub-components ──────────────────────────────────────────────────────── */

const ConversationItem = ({ conv, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-3 py-3 transition-all duration-150 rounded-xl text-left
            ${isActive ? 'bg-[#e9efff]' : 'hover:bg-gray-50'}`}
    >
        <div className="relative flex-shrink-0">
            <Avatar className="w-11 h-11">
                <AvatarImage src={getAvatarUrl(conv.user?.avatar)} />
                <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-purple-500 text-white text-sm font-semibold">
                    {getInitials(conv.user?.name)}
                </AvatarFallback>
            </Avatar>
            {/* Green online dot only — no unread blue dot */}
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full" />
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-0.5">
                <span className={`font-semibold text-sm truncate ${isActive ? 'text-[#2563eb]' : 'text-gray-900'}`}>
                    {conv.user?.name}
                </span>
                <span className="text-[10px] text-gray-400 flex-shrink-0 ml-1">
                    {conv.createdAt ? format(new Date(conv.createdAt), 'h:mm a') : ''}
                </span>
            </div>
            <p className="text-xs text-gray-400 truncate">
                {conv.lastMessage?.replace(/<[^>]*>/g, '') || 'No messages yet'}
            </p>
        </div>
        {/* REMOVED: unread blue dot */}
    </button>
);

const DateDivider = ({ label }) => (
    <div className="flex items-center gap-3 my-4 px-2">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-[11px] font-medium text-gray-400 bg-[#f0f2f5] px-3 py-1 rounded-full whitespace-nowrap">
            {label}
        </span>
        <div className="flex-1 h-px bg-gray-200" />
    </div>
);

/* ── Read receipt ticks ── */
const ReadTick = ({ read }) =>
    read
        ? <CheckCheck size={13} className="text-[#60a5fa] flex-shrink-0" />   // blue = seen
        : <Check size={13} className="text-white/50 flex-shrink-0" />;         // grey = sent

/* ── Image grid (1, 2, or 2-col mosaic for 3+) ── */
const ImageGrid = ({ images }) => {
    const count = images.length;
    const single = count === 1;

    return (
        <div
            className="grid gap-0.5 overflow-hidden rounded-2xl"
            style={{
                gridTemplateColumns: single ? '1fr' : 'repeat(2, 1fr)',
                maxWidth: single ? 260 : 300,
                width: '100%',
            }}
        >
            {images.map((img, i) => {
                const fullRow = count === 3 && i === 0;
                return (
                    <a
                        key={i}
                        href={img.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`block overflow-hidden ${fullRow ? 'col-span-2' : ''}`}
                        style={{ aspectRatio: single ? 'auto' : '1 / 1' }}
                    >
                        <img
                            src={img.src}
                            alt={img.name}
                            className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                            style={{ display: 'block', maxHeight: single ? 260 : 180 }}
                        />
                    </a>
                );
            })}
        </div>
    );
};

/* ── File card — sent (solid blue, NO download — sender doesn't need to download own file) ── */
const FileCardSent = ({ file }) => {
    const ext = getFileExtension(file.name);
    const meta = FILE_META[ext] || { label: (ext || 'FILE').toUpperCase() };
    return (
        <div
            title={file.name}
            className="flex items-center gap-3 px-3 py-2.5 rounded-2xl rounded-br-sm"
            style={{ background: '#2563eb', minWidth: 210, maxWidth: 300 }}
        >
            <div
                className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-bold leading-none"
                style={{ background: 'rgba(255,255,255,0.22)', color: '#fff' }}
            >
                {meta.label}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white leading-snug truncate">{file.name}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>File sent</p>
            </div>
        </div>
    );
};

/* ── File card — received (light card) ── */
const FileCardReceived = ({ file }) => {
    const ext = getFileExtension(file.name);
    const meta = FILE_META[ext] || { bg: '#f8fafc', border: '#e2e8f0', icon: '#6366f1', label: (ext || 'FILE').toUpperCase() };
    return (
        <a
            href={file.href}
            target="_blank"
            rel="noopener noreferrer"
            download={file.name}
            title={file.name}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group hover:brightness-95"
            style={{
                background: meta.bg,
                border: `1px solid ${meta.border}`,
                minWidth: 210,
                maxWidth: 300,
            }}
        >
            <div
                className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-bold leading-none"
                style={{ background: '#fff', color: meta.icon, border: `1.5px solid ${meta.border}` }}
            >
                {meta.label}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 leading-snug truncate">{file.name}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Tap to download</p>
            </div>
            <Download size={14} className="text-gray-400 flex-shrink-0 group-hover:text-gray-700 transition-colors" />
        </a>
    );
};

/* ── Timestamp row — always visible below attachments ── */
const TimeRow = ({ createdAt, isMine, read }) => (
    <div className={`flex items-center gap-1 mt-0.5 ${isMine ? "justify-end" : ""}`}>
        <span className="text-[10px] text-gray-400">{formatTime(createdAt)}</span>
        {isMine && (
            read
                ? <CheckCheck size={14} className="text-[#2563eb]" />
                : <Check size={14} className="text-gray-400" />
        )}
    </div>
);

/* ── Main message bubble ── */
const MessageBubble = ({ msg, isMine }) => {
    const { text, images, files } = parseMessageContent(msg.content);
    const hasText      = !!text;
    const hasImages    = images.length > 0;
    const hasFiles     = files.length > 0;
    const hasAttachments = hasImages || hasFiles;

    return (
        <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} px-1`}>
            <div
                className={`flex flex-col gap-1.5 ${isMine ? 'items-end' : 'items-start'}`}
                style={{ maxWidth: 'min(78%, 360px)' }}
            >
                {/* Text bubble */}
                {hasText && (
                    <div
                        className={`
                            px-4 py-2.5 text-sm shadow-sm leading-relaxed break-words w-full
                            ${isMine
                                ? 'bg-[#2563eb] text-white rounded-2xl rounded-br-sm'
                                : 'bg-white text-gray-800 rounded-2xl rounded-bl-sm border border-gray-100'
                            }
                        `}
                    >
                        {text}
                        {/* Show time inline in text bubble only when there are no attachments after */}
                        {!hasAttachments && (
                            <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end text-white/60' : 'text-gray-400'}`}>
                                <span className="text-[10px]">{formatTime(msg.createdAt)}</span>
                                {isMine && <ReadTick read={!!msg.read} />}
                            </div>
                        )}
                    </div>
                )}

                {/* Images — outside bubble, in a clean grid */}
                {hasImages && (
                    <div className="overflow-hidden rounded-2xl shadow-sm">
                        <ImageGrid images={images} />
                    </div>
                )}

                {/* File cards */}
                {hasFiles && (
                    <div className={`flex flex-col gap-1.5 w-full ${isMine ? 'items-end' : 'items-start'}`}>
                        {files.map((file, i) =>
                            isMine
                                ? <FileCardSent key={i} file={file} />
                                : <FileCardReceived key={i} file={file} />
                        )}
                    </div>
                )}

                {/* Timestamp below attachments */}
                {hasAttachments && (
                    <TimeRow createdAt={msg.createdAt} isMine={isMine} read={!!msg.read} />
                )}
            </div>
        </div>
    );
};

/* ─── main page ───────────────────────────────────────────────────────────── */
const MessagesPage = () => {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { userId } = router.query;

    const [conversations, setConversations] = useState([]);
    const [activeChatUser, setActiveChatUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sending, setSending] = useState(false);

    const [selectedFiles, setSelectedFiles] = useState([]);
    const [previews, setPreviews] = useState([]);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const emojiRef = useRef(null);
    const imageInputRef = useRef(null);
    const fileInputRef = useRef(null);

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    useEffect(() => {
        const handler = (e) => {
            if (emojiRef.current && !emojiRef.current.contains(e.target)) setShowEmojiPicker(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        if (!authLoading && !user) return router.push('/login');
        const init = async () => {
            try {
                const convRes = await api.get('/chat/conversations');
                setConversations(convRes.data || []);
                if (userId) {
                    const [userRes, msgRes] = await Promise.all([
                        api.get(`/users/${userId}`),
                        api.get(`/chat/${userId}`),
                    ]);
                    setActiveChatUser(userRes.data);
                    setMessages(msgRes.data || []);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        if (user) init();
    }, [user, authLoading, userId, router]);

    useEffect(scrollToBottom, [messages]);

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        if (selectedFiles.length + files.length > 15) {
            toast.error('You can only upload up to 15 files at once.');
            return;
        }
        const newFiles = [...selectedFiles, ...files];
        setSelectedFiles(newFiles);
        setPreviews(newFiles.map(file => ({
            type: file.type.startsWith('image/') ? 'image' : 'file',
            url: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
            name: file.name,
        })));
        e.target.value = '';
    };

    const removeAttachment = (index) => {
        const nf = [...selectedFiles]; nf.splice(index, 1); setSelectedFiles(nf);
        const np = [...previews];
        if (np[index].url) URL.revokeObjectURL(np[index].url);
        np.splice(index, 1); setPreviews(np);
    };

    const clearAttachments = () => {
        setSelectedFiles([]);
        previews.forEach(p => p.url && URL.revokeObjectURL(p.url));
        setPreviews([]);
    };

    const handleSend = async () => {
        const text = newMessage.trim();
        if (!text && selectedFiles.length === 0) return;
        if (sending) return;
        setSending(true);
        try {
            let finalContent = text;

            if (selectedFiles.length > 0) {
                const formData = new FormData();
                selectedFiles.forEach(file => formData.append('files', file));
                const uploadRes = await api.post('/upload/multiple', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                const uploadedFiles = uploadRes.data.files;
                const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

                // Clean minimal HTML — no extra classes, just what the parser needs
                let attachHtml = `<div class="flex flex-wrap gap-2 mt-2 w-full">`;
                uploadedFiles.forEach(file => {
                    const fullUrl = `${baseUrl}${file.url}`;
                    if (file.type === 'image') {
                        attachHtml += `<a href="${fullUrl}" target="_blank"><img src="${fullUrl}" alt="${file.name}" /></a>`;
                    } else {
                        attachHtml += `<a href="${fullUrl}" target="_blank" rel="noopener noreferrer" download="${file.name}">📎 ${file.name}</a>`;
                    }
                });
                attachHtml += `</div>`;
                finalContent = finalContent ? `${finalContent}<br/>${attachHtml}` : attachHtml;
            }

            const res = await api.post('/chat', {
                recipientId: activeChatUser._id,
                content: finalContent,
            });

            setMessages((prev) => [...prev, res.data]);
            setNewMessage('');
            clearAttachments();
            setShowEmojiPicker(false);
            inputRef.current?.focus();
        } catch {
            toast.error('Failed to send message. Files might be too large.');
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    const cleanedConversations = deduplicateConversations(conversations, user?._id);
    const filteredConversations = cleanedConversations.filter((c) =>
        (c.user?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
    const grouped = groupMessagesByDate(messages);

    if (authLoading || loading)
        return <div className="h-screen flex items-center justify-center bg-gray-50"><Spinner /></div>;

    return (
        <>
            <Head><title>Messages | CodeFlow</title></Head>

            <div
                className="flex overflow-hidden bg-[#f0f2f5]"
                style={{ height: 'calc(100vh - 64px)', fontFamily: "'DM Sans', system-ui, sans-serif" }}
            >
                {/* ── Sidebar ── */}
                <aside className="w-[300px] flex-shrink-0 flex flex-col bg-white border-r border-gray-200">
                    <div className="px-4 pt-5 pb-3 border-b border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <h1 className="text-xl font-bold text-gray-900">Chats</h1>
                            <button className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition">
                                <MoreVertical size={18} />
                            </button>
                        </div>
                        <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
                            <Search size={14} className="text-gray-400 flex-shrink-0" />
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search conversations…"
                                className="bg-transparent text-sm outline-none flex-1 text-gray-700 placeholder-gray-400"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
                        {filteredConversations.length === 0 ? (
                            <p className="text-center text-sm text-gray-400 mt-10">No conversations yet</p>
                        ) : (
                            filteredConversations.map((conv) => (
                                <ConversationItem
                                    key={conv.userId}
                                    conv={conv}
                                    isActive={activeChatUser?._id === conv.userId}
                                    onClick={() => router.push(`/messages?userId=${conv.userId}`)}
                                />
                            ))
                        )}
                    </div>
                </aside>

                {/* ── Chat area ── */}
                <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    {activeChatUser ? (
                        <>
                            {/* ── Header ── */}
                            <header className="flex items-center gap-3 px-5 py-3 bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
                                <button
                                    onClick={() => router.push(`/profile/${activeChatUser._id}`)}
                                    className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
                                >
                                    <div className="relative flex-shrink-0">
                                        <Avatar className="w-10 h-10">
                                            <AvatarImage src={getAvatarUrl(activeChatUser.avatar)} />
                                            <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-purple-500 text-white text-sm font-semibold">
                                                {getInitials(activeChatUser.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900 text-sm leading-tight">{activeChatUser.name}</p>
                                        <p className="text-xs text-green-500 font-medium">Online</p>
                                    </div>
                                </button>
                            </header>

                            {/* ── Messages scroll area ── */}
                            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-[#f0f2f5]">
                                {grouped.map((item, i) =>
                                    item.type === 'date' ? (
                                        <DateDivider key={`date-${i}`} label={item.label} />
                                    ) : (
                                        <MessageBubble
                                            key={item.data._id}
                                            msg={item.data}
                                            isMine={item.data.sender === user._id}
                                        />
                                    )
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* ── Attachment preview tray ── */}
                            {previews.length > 0 && (
                                <div className="px-4 py-2.5 bg-white border-t border-gray-100 flex-shrink-0">
                                    <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
                                        {previews.map((preview, idx) => (
                                            <div key={idx} className="relative flex-shrink-0 group">
                                                {preview.type === 'image' ? (
                                                    <img
                                                        src={preview.url}
                                                        alt="preview"
                                                        className="w-14 h-14 rounded-xl object-cover border border-gray-200 shadow-sm"
                                                    />
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center bg-indigo-50 border border-indigo-100 rounded-xl w-14 h-14 p-1.5 gap-1">
                                                        <Paperclip size={14} className="text-indigo-500" />
                                                        <span className="text-[8px] text-gray-600 truncate w-full px-0.5 leading-tight text-center">{preview.name}</span>
                                                    </div>
                                                )}
                                                <button
                                                    onClick={() => removeAttachment(idx)}
                                                    className="absolute -top-1.5 -right-1.5 bg-gray-800 text-white rounded-full w-4 h-4 flex items-center justify-center shadow hover:bg-red-500 transition opacity-0 group-hover:opacity-100"
                                                >
                                                    <X size={9} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ── Input bar ── */}
                            <footer className="px-4 py-3 bg-white border-t border-gray-100 flex-shrink-0">
                                <input ref={imageInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleFileSelect} />
                                <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.txt,.zip,.csv,.xlsx" className="hidden" onChange={handleFileSelect} />

                                <div className="flex items-end gap-2">
                                    {/* Emoji */}
                                    <div className="relative flex-shrink-0" ref={emojiRef}>
                                        <button
                                            onClick={() => setShowEmojiPicker((v) => !v)}
                                            className={`p-2 rounded-full transition ${showEmojiPicker ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-gray-100 text-gray-400'}`}
                                        >
                                            <Smile size={20} />
                                        </button>
                                        {showEmojiPicker && (
                                            <div className="absolute bottom-12 left-0 z-50 shadow-2xl rounded-2xl overflow-hidden">
                                                <EmojiPicker
                                                    onEmojiClick={(e) => { setNewMessage((p) => p + e.emoji); inputRef.current?.focus(); }}
                                                    height={380} width={320}
                                                    previewConfig={{ showPreview: false }}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <button onClick={() => imageInputRef.current?.click()} className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition flex-shrink-0">
                                        <ImageIcon size={20} />
                                    </button>
                                    <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition flex-shrink-0">
                                        <Paperclip size={20} />
                                    </button>

                                    <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-2.5">
                                        <textarea
                                            ref={inputRef}
                                            value={newMessage}
                                            onChange={(e) => {
                                                setNewMessage(e.target.value);
                                                e.target.style.height = 'auto';
                                                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                                            }}
                                            onKeyDown={handleKeyDown}
                                            placeholder="Type a message…"
                                            rows={1}
                                            className="w-full bg-transparent outline-none resize-none text-sm text-gray-800 placeholder-gray-400 leading-relaxed"
                                            style={{ maxHeight: '120px' }}
                                        />
                                    </div>

                                    <button
                                        onClick={handleSend}
                                        disabled={(!newMessage.trim() && selectedFiles.length === 0) || sending}
                                        className={`p-3 rounded-full transition-all duration-150 flex-shrink-0
                                            ${(newMessage.trim() || selectedFiles.length > 0)
                                                ? 'bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-md hover:scale-105'
                                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                            }`}
                                    >
                                        <Send size={18} className={sending ? 'opacity-50' : ''} />
                                    </button>
                                </div>
                            </footer>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center select-none">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shadow-inner">
                                <Send size={36} className="text-indigo-400 rotate-[-20deg]" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-700">Your Messages</h3>
                                <p className="text-sm text-gray-400 mt-1">Select a conversation to start chatting</p>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </>
    );
};

export default MessagesPage;