import React, { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import api from '@/services/api';
import useAuth from '@/hooks/useAuth';
import { getAvatarUrl } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Spinner from '@/components/Spinner';
import {
    Send, Smile, Search, MoreVertical, ImageIcon, Paperclip,
    X, Check, CheckCheck, Download, Reply, Trash2, CornerUpLeft, CheckSquare
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import toast from 'react-hot-toast';
import EmojiPicker from 'emoji-picker-react';

/* ─── constants ──────────────────────────────────────────────────────────── */
const QUICK_EMOJIS = ['❤️', '😂', '😮', '😢', '👍', '🙏'];

/* ─── helpers ──────────────────────────────────────────────────────────────*/
const formatTime      = (d) => format(new Date(d), 'h:mm a');
const formatDateLabel = (d) => {
    const date = new Date(d);
    if (isToday(date))     return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
};
const formatLastSeen = (date) => {
    if (!date) return 'Offline';
    const d        = new Date(date);
    const diffMins = Math.floor((new Date() - d) / 60000);
    if (diffMins < 2)   return 'Online';
    if (isToday(d))     return `last seen today at ${formatTime(d)}`;
    if (isYesterday(d)) return `last seen yesterday at ${formatTime(d)}`;
    return `last seen ${format(d, 'dd/MM/yyyy')}`;
};
const isUserOnline = (lastSeen) =>
    lastSeen && Math.floor((new Date() - new Date(lastSeen)) / 60000) < 2;

const groupMessagesByDate = (msgs) => {
    const groups = []; let lastDate = null;
    msgs.forEach((m) => {
        const lbl = formatDateLabel(m.createdAt);
        if (lbl !== lastDate) { groups.push({ type: 'date', label: lbl }); lastDate = lbl; }
        groups.push({ type: 'message', data: m });
    });
    return groups;
};

const getInitials = (name = '') =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

const deduplicateConversations = (convs, myId) => {
    const seen = new Map();
    convs.forEach((c) => {
        const id = c.userId?.toString();
        if (!id || id === myId?.toString()) return;
        if (!seen.has(id)) seen.set(id, c);
    });
    return Array.from(seen.values());
};

const parseMessageContent = (html = '') => {
    if (!html) return { text: '', images: [], files: [] };
    if (typeof window === 'undefined')
        return { text: html.replace(/<[^>]*>/g, '').trim(), images: [], files: [] };
    const doc    = new DOMParser().parseFromString(html, 'text/html');
    const images = [], files = [];
    doc.querySelectorAll('a').forEach((a) => {
        const img = a.querySelector('img');
        if (img) {
            images.push({ href: a.getAttribute('href') || img.getAttribute('src'), src: img.getAttribute('src'), name: img.getAttribute('alt') || 'image' });
            a.remove();
        } else if (a.hasAttribute('download')) {
            files.push({ href: a.getAttribute('href'), name: a.getAttribute('download') || a.textContent.replace('📎', '').trim() });
            a.remove();
        }
    });
    doc.querySelectorAll('div').forEach((d) => d.remove());
    return { text: (doc.body.textContent || '').replace(/\s+/g, ' ').trim(), images, files };
};

const getFileExtension = (f = '') => (f.split('.').pop() || '').toLowerCase();
const FILE_META = {
    pdf:  { bg: '#fff1f0', border: '#fca5a5', icon: '#ef4444', label: 'PDF'  },
    doc:  { bg: '#eff6ff', border: '#93c5fd', icon: '#2563eb', label: 'DOC'  },
    docx: { bg: '#eff6ff', border: '#93c5fd', icon: '#2563eb', label: 'DOCX' },
    xls:  { bg: '#f0fdf4', border: '#86efac', icon: '#16a34a', label: 'XLS'  },
    xlsx: { bg: '#f0fdf4', border: '#86efac', icon: '#16a34a', label: 'XLSX' },
    zip:  { bg: '#fefce8', border: '#fde047', icon: '#ca8a04', label: 'ZIP'  },
    txt:  { bg: '#f8fafc', border: '#cbd5e1', icon: '#475569', label: 'TXT'  },
    csv:  { bg: '#f0fdf4', border: '#86efac', icon: '#16a34a', label: 'CSV'  },
};

/* ─── canDeleteForEveryone (mirrors backend logic, used for UI gating) ────── */
const msgCanDeleteForEveryone = (msg, myId) => {
    if (!msg || msg.sender?.toString() !== myId?.toString()) return false;
    if (msg.deletedForEveryone) return false;
    if (!msg.read) return true;
    if (msg.readAt) {
        return (Date.now() - new Date(msg.readAt)) / 60000 <= 5;
    }
    return false;
};

/* ══════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
══════════════════════════════════════════════════════════════════════════ */

/* ── Sidebar item ── */
const ConversationItem = ({ conv, isActive, onClick }) => (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-3 transition-all rounded-xl text-left ${isActive ? 'bg-[#e9efff]' : 'hover:bg-gray-50'}`}>
        <div className="relative flex-shrink-0">
            <Avatar className="w-11 h-11">
                <AvatarImage src={getAvatarUrl(conv.user?.avatar)} />
                <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-purple-500 text-white text-sm font-semibold">{getInitials(conv.user?.name)}</AvatarFallback>
            </Avatar>
            {isUserOnline(conv.user?.lastSeen) && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full" />}
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-0.5">
                <span className={`font-semibold text-sm truncate ${isActive ? 'text-[#2563eb]' : 'text-gray-900'}`}>{conv.user?.name}</span>
                <span className="text-[10px] text-gray-400 ml-1 flex-shrink-0">{conv.createdAt ? format(new Date(conv.createdAt), 'h:mm a') : ''}</span>
            </div>
            <p className="text-xs text-gray-400 truncate">{conv.lastMessage?.replace(/<[^>]*>/g, '') || 'No messages yet'}</p>
        </div>
    </button>
);

/* ── Date divider ── */
const DateDivider = ({ label }) => (
    <div className="flex items-center gap-3 my-4 px-2">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-[11px] font-medium text-gray-400 bg-[#f0f2f5] px-3 py-1 rounded-full whitespace-nowrap">{label}</span>
        <div className="flex-1 h-px bg-gray-200" />
    </div>
);

/* ── Read tick ── */
const ReadTick = ({ read }) =>
    read
        ? <CheckCheck size={14} className="text-green-500 flex-shrink-0" />
        : <Check      size={13} className="text-gray-400  flex-shrink-0" />;

/* ── Image grid ── */
const ImageGrid = ({ images }) => {
    const count = images.length, single = count === 1;
    return (
        <div className="grid gap-0.5 overflow-hidden rounded-2xl" style={{ gridTemplateColumns: single ? '1fr' : 'repeat(2, 1fr)', maxWidth: single ? 260 : 300, width: '100%' }}>
            {images.map((img, i) => (
                <a key={i} href={img.href} target="_blank" rel="noopener noreferrer"
                    className={`block overflow-hidden ${count === 3 && i === 0 ? 'col-span-2' : ''}`}
                    style={{ aspectRatio: single ? 'auto' : '1/1' }}>
                    <img src={img.src} alt={img.name} className="w-full h-full object-cover hover:opacity-90 transition-opacity" style={{ display: 'block', maxHeight: single ? 260 : 180 }} />
                </a>
            ))}
        </div>
    );
};

/* ── File cards ── */
const FileCardSent = ({ file }) => {
    const meta = FILE_META[getFileExtension(file.name)] || { label: 'FILE' };
    return (
        <div title={file.name} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl rounded-br-sm" style={{ background: '#dbeafe', border: '1px solid #93c5fd', minWidth: 210, maxWidth: 300 }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: 'rgba(37,99,235,0.12)', color: '#2563eb' }}>{meta.label}</div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{file.name}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">File sent</p>
            </div>
        </div>
    );
};
const FileCardReceived = ({ file }) => {
    const meta = FILE_META[getFileExtension(file.name)] || { bg: '#f8fafc', border: '#e2e8f0', icon: '#6366f1', label: 'FILE' };
    return (
        <a href={file.href} target="_blank" rel="noopener noreferrer" download={file.name} title={file.name}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl group hover:brightness-95"
            style={{ background: meta.bg, border: `1px solid ${meta.border}`, minWidth: 210, maxWidth: 300 }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: '#fff', color: meta.icon, border: `1.5px solid ${meta.border}` }}>{meta.label}</div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{file.name}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Tap to download</p>
            </div>
            <Download size={14} className="text-gray-400 group-hover:text-gray-700 flex-shrink-0" />
        </a>
    );
};

/* ── Reply preview (input bar) ── */
const ReplyBanner = ({ msg, myId, onCancel }) => {
    const { text } = parseMessageContent(msg.content);
    const preview  = msg.deletedForEveryone ? 'This message was deleted' : (text || '📎 Attachment');
    const isMine   = msg.sender?.toString() === myId?.toString();
    return (
        <div className="px-4 py-2 bg-white border-t border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-2 bg-blue-50 border-l-4 border-blue-400 rounded-lg px-3 py-2">
                <CornerUpLeft size={13} className="text-blue-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-blue-500">{isMine ? 'You' : 'Them'}</p>
                    <p className="text-xs text-gray-500 truncate">{preview}</p>
                </div>
                <button onClick={onCancel} className="p-1 rounded-full hover:bg-gray-200"><X size={12} className="text-gray-400" /></button>
            </div>
        </div>
    );
};

/* ── Quoted snippet inside bubble ── */
const QuotedSnippet = ({ replyTo, myId }) => {
    if (!replyTo) return null;
    const { text } = parseMessageContent(replyTo.content);
    const preview  = replyTo.deletedForEveryone ? 'This message was deleted' : (text || '📎 Attachment');
    const isMine   = replyTo.sender?.toString() === myId?.toString();
    return (
        <div className="mb-1.5 rounded-lg border-l-4 border-blue-400 bg-black/5 px-2.5 py-1.5">
            <p className="text-[11px] font-semibold text-blue-500 mb-0.5">{isMine ? 'You' : 'Them'}</p>
            <p className="text-xs text-gray-600 truncate">{preview}</p>
        </div>
    );
};

/* ── Reactions strip ── */
const ReactionsStrip = ({ reactions, myId }) => {
    if (!reactions?.length) return null;
    const grouped = reactions.reduce((acc, r) => {
        acc[r.emoji] = acc[r.emoji] || { emoji: r.emoji, count: 0, mine: false };
        acc[r.emoji].count++;
        if (r.user?.toString() === myId?.toString()) acc[r.emoji].mine = true;
        return acc;
    }, {});
    return (
        <div className="flex flex-wrap gap-1 mt-1">
            {Object.values(grouped).map(({ emoji, count, mine }) => (
                <span key={emoji} className={`text-xs px-1.5 py-0.5 rounded-full border flex items-center gap-0.5 select-none ${mine ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
                    {emoji}{count > 1 && <span className="text-[10px] text-gray-500 ml-0.5">{count}</span>}
                </span>
            ))}
        </div>
    );
};

/* ── Context menu (right-click / "more") ── */
const ContextMenu = ({ x, y, msg, isMine, canDeleteEveryone, onReply, onReact, onDeleteMe, onDeleteEveryone, onSelect, onClose }) => {
    const ref = useRef(null);
    useEffect(() => {
        const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [onClose]);

    // Keep menu inside viewport
    const safeX = Math.min(x, window.innerWidth  - 220);
    const safeY = Math.min(y, window.innerHeight - 280);

    const Item = ({ icon, label, onClick, danger }) => (
        <button onClick={() => { onClick(); onClose(); }} className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left hover:bg-gray-50 ${danger ? 'text-red-500' : 'text-gray-700'}`}>
            {icon}{label}
        </button>
    );

    return (
        <div ref={ref} style={{ position: 'fixed', top: safeY, left: safeX, zIndex: 9999 }}
            className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden min-w-[190px] py-1">
            {/* Quick emoji row */}
            <div className="flex items-center justify-around px-3 py-2.5 border-b border-gray-100">
                {QUICK_EMOJIS.map(e => (
                    <button key={e} onClick={() => { onReact(msg._id, e); onClose(); }}
                        className="text-xl hover:scale-125 transition-transform">{e}</button>
                ))}
            </div>
            <Item icon={<Reply size={15}/>}       label="Reply"                onClick={() => onReply(msg)} />
            <Item icon={<CheckSquare size={15}/>} label="Select"               onClick={() => onSelect(msg._id)} />
            <div className="h-px bg-gray-100 my-1" />
            <Item icon={<Trash2 size={15}/>}      label="Delete for me"        onClick={() => onDeleteMe(msg._id)} danger />
            {isMine && canDeleteEveryone && (
                <Item icon={<Trash2 size={15}/>}  label="Delete for everyone"  onClick={() => onDeleteEveryone(msg._id)} danger />
            )}
        </div>
    );
};

/* ── Multi-select toolbar ── */
const SelectionToolbar = ({ count, canDeleteEveryone, onDeleteMe, onDeleteEveryone, onCancel }) => (
    <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
            <button onClick={onCancel} className="p-1.5 rounded-full hover:bg-gray-100"><X size={18} className="text-gray-600" /></button>
            <span className="text-sm font-semibold text-gray-800">{count} selected</span>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={onDeleteMe}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 text-xs font-semibold transition">
                <Trash2 size={13}/> Delete for me
            </button>
            {canDeleteEveryone && (
                <button onClick={onDeleteEveryone}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition">
                    <Trash2 size={13}/> Delete for everyone
                </button>
            )}
        </div>
    </div>
);

/* ── MessageBubble ── */
const MessageBubble = ({ msg, isMine, myId, isSelected, isSelectMode, onLongPress, onSelect, onReply, onReact, onDeleteMe, onDeleteEveryone, canDeleteEveryone }) => {
    const [showActions,    setShowActions]    = useState(false);
    const [showEmojiPick,  setShowEmojiPick]  = useState(false);
    const [ctxMenu,        setCtxMenu]        = useState(null);
    const emojiRef        = useRef(null);
    const longPressTimer  = useRef(null);

    useEffect(() => {
        const h = (e) => { if (emojiRef.current && !emojiRef.current.contains(e.target)) setShowEmojiPick(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    const handleContextMenu = (e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY }); };
    const handleClick       = ()  => { if (isSelectMode) onSelect(msg._id); };
    const onTouchStart      = ()  => { longPressTimer.current = setTimeout(() => onLongPress(msg._id), 500); };
    const onTouchEnd        = ()  => clearTimeout(longPressTimer.current);

    /* ── Deleted placeholder ── */
    if (msg.deletedForEveryone) {
        return (
            <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} px-1`}>
                <div className="px-4 py-2 rounded-2xl text-xs italic text-gray-400 border border-dashed border-gray-300 bg-white flex items-center gap-1.5">
                    <Trash2 size={12} className="text-gray-300"/> This message was deleted
                </div>
            </div>
        );
    }

    const { text, images, files } = parseMessageContent(msg.content);
    const hasText        = !!text;
    const hasImages      = images.length > 0;
    const hasFiles       = files.length > 0;
    const hasAttachments = hasImages || hasFiles;

    const bubbleBase = isMine
        ? 'bg-[#dbeafe] text-gray-800 rounded-2xl rounded-br-sm'
        : 'bg-white text-gray-800 rounded-2xl rounded-bl-sm border border-gray-100';

    return (
        <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} px-1 relative group`}
            onContextMenu={handleContextMenu}
            onMouseEnter={() => !isSelectMode && setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
            onClick={handleClick}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
        >
            {/* Checkbox */}
            {isSelectMode && (
                <div className={`flex items-center ${isMine ? 'order-2 ml-2' : 'mr-2'}`}>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-400 bg-white'}`}>
                        {isSelected && <Check size={12} className="text-white"/>}
                    </div>
                </div>
            )}

            <div className={`flex flex-col gap-1 ${isMine ? 'items-end' : 'items-start'} relative`} style={{ maxWidth: 'min(78%, 360px)' }}>
                {/* Quoted snippet */}
                {msg.replyTo && <QuotedSnippet replyTo={msg.replyTo} myId={myId}/>}

                {/* Text bubble */}
                {hasText && (
                    <div className={`px-4 py-2.5 text-sm shadow-sm leading-relaxed break-words w-full ${bubbleBase} ${isSelected ? 'ring-2 ring-blue-400' : ''}`}>
                        {text}
                        {!hasAttachments && (
                            <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : ''}`}>
                                <span className="text-[10px] text-gray-400">{formatTime(msg.createdAt)}</span>
                                {isMine && <ReadTick read={!!msg.read}/>}
                            </div>
                        )}
                    </div>
                )}

                {/* Images */}
                {hasImages && (
                    <div className={`overflow-hidden rounded-2xl shadow-sm ${isSelected ? 'ring-2 ring-blue-400' : ''}`}>
                        <ImageGrid images={images}/>
                    </div>
                )}

                {/* Files */}
                {hasFiles && (
                    <div className={`flex flex-col gap-1.5 w-full ${isMine ? 'items-end' : 'items-start'}`}>
                        {files.map((f, i) => isMine ? <FileCardSent key={i} file={f}/> : <FileCardReceived key={i} file={f}/>)}
                    </div>
                )}

                {/* Time row for attachments */}
                {hasAttachments && (
                    <div className={`flex items-center gap-1 ${isMine ? 'justify-end' : ''}`}>
                        <span className="text-[10px] text-gray-400">{formatTime(msg.createdAt)}</span>
                        {isMine && <ReadTick read={!!msg.read}/>}
                    </div>
                )}

                {/* Reactions */}
                <ReactionsStrip reactions={msg.reactions} myId={myId}/>
            </div>

            {/* Hover action bar */}
            {showActions && !isSelectMode && (
                <div className={`absolute top-0 flex items-center gap-1 z-10 ${isMine ? 'right-full mr-2' : 'left-full ml-2'}`}>
                    <div className="flex items-center bg-white border border-gray-200 rounded-full shadow-md px-1 py-1 gap-0.5">
                        <button onClick={() => onReply(msg)} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500" title="Reply"><Reply size={14}/></button>
                        <div className="relative" ref={emojiRef}>
                            <button onClick={() => setShowEmojiPick(v => !v)} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500" title="React"><Smile size={14}/></button>
                            {showEmojiPick && (
                                <div className={`absolute bottom-10 z-50 shadow-2xl rounded-2xl overflow-hidden ${isMine ? 'right-0' : 'left-0'}`}>
                                    <div className="flex items-center gap-1 px-3 py-2 bg-white border-b border-gray-100">
                                        {QUICK_EMOJIS.map(e => (
                                            <button key={e} onClick={() => { onReact(msg._id, e); setShowEmojiPick(false); }} className="text-xl hover:scale-125 transition-transform">{e}</button>
                                        ))}
                                    </div>
                                    <EmojiPicker onEmojiClick={e => { onReact(msg._id, e.emoji); setShowEmojiPick(false); }} height={300} width={300} previewConfig={{ showPreview: false }}/>
                                </div>
                            )}
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setCtxMenu({ x: e.clientX, y: e.clientY }); }} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500" title="More"><MoreVertical size={14}/></button>
                    </div>
                </div>
            )}

            {/* Context menu */}
            {ctxMenu && (
                <ContextMenu
                    x={ctxMenu.x} y={ctxMenu.y}
                    msg={msg} isMine={isMine} canDeleteEveryone={canDeleteEveryone}
                    onReply={onReply} onReact={onReact}
                    onDeleteMe={onDeleteMe} onDeleteEveryone={onDeleteEveryone}
                    onSelect={onSelect} onClose={() => setCtxMenu(null)}
                />
            )}
        </div>
    );
};

/* ══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════════════ */
const MessagesPage = () => {
    const { user, loading: authLoading } = useAuth();
    const router     = useRouter();
    const { userId } = router.query;

    const [conversations,  setConversations]  = useState([]);
    const [activeChatUser, setActiveChatUser] = useState(null);
    const [messages,       setMessages]       = useState([]);
    const [newMessage,     setNewMessage]     = useState('');
    const [loading,        setLoading]        = useState(true);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [searchQuery,    setSearchQuery]    = useState('');
    const [sending,        setSending]        = useState(false);
    const [selectedFiles,  setSelectedFiles]  = useState([]);
    const [previews,       setPreviews]       = useState([]);
    const [replyingTo,     setReplyingTo]     = useState(null);
    const [selectedMsgs,   setSelectedMsgs]   = useState(new Set());
    const [isSelectMode,   setIsSelectMode]   = useState(false);

    const messagesEndRef = useRef(null);
    const inputRef       = useRef(null);
    const emojiRef       = useRef(null);
    const imageInputRef  = useRef(null);
    const fileInputRef   = useRef(null);

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    useEffect(() => {
        const h = (e) => { if (emojiRef.current && !emojiRef.current.contains(e.target)) setShowEmojiPicker(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    /* polling + ping */
    useEffect(() => {
        let poll, ping;
        if (!authLoading && !user) { router.push('/login'); return; }

        const init = async () => {
            try {
                api.put('/users/ping').catch(() => {});
                ping = setInterval(() => api.put('/users/ping').catch(() => {}), 60000);

                const convRes = await api.get('/chat/conversations');
                setConversations(convRes.data || []);

                if (userId) {
                    await api.put(`/chat/${userId}/read`).catch(() => {});
                    const [userRes, msgRes] = await Promise.all([api.get(`/users/${userId}`), api.get(`/chat/${userId}`)]);
                    setActiveChatUser(userRes.data);
                    setMessages(msgRes.data || []);

                    poll = setInterval(async () => {
                        try {
                            const [m, u] = await Promise.all([api.get(`/chat/${userId}`), api.get(`/users/${userId}`)]);
                            await api.put(`/chat/${userId}/read`).catch(() => {});
                            setMessages(m.data || []);
                            setActiveChatUser(u.data);
                        } catch { /* ignore */ }
                    }, 3000);
                }
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };

        if (user) init();
        return () => { clearInterval(poll); clearInterval(ping); };
    }, [user, authLoading, userId]);

    useEffect(scrollToBottom, [messages]);

    /* file handlers */
    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        if (selectedFiles.length + files.length > 15) return toast.error('Max 15 files at once.');
        const nf = [...selectedFiles, ...files];
        setSelectedFiles(nf);
        setPreviews(nf.map(f => ({ type: f.type.startsWith('image/') ? 'image' : 'file', url: f.type.startsWith('image/') ? URL.createObjectURL(f) : null, name: f.name })));
        e.target.value = '';
    };
    const removeAttachment = (i) => {
        const nf = [...selectedFiles]; nf.splice(i, 1); setSelectedFiles(nf);
        const np = [...previews]; if (np[i].url) URL.revokeObjectURL(np[i].url); np.splice(i, 1); setPreviews(np);
    };
    const clearAttachments = () => { setSelectedFiles([]); previews.forEach(p => p.url && URL.revokeObjectURL(p.url)); setPreviews([]); };

    /* send */
    const handleSend = async () => {
        const text = newMessage.trim();
        if (!text && selectedFiles.length === 0) return;
        if (sending) return;
        setSending(true);
        try {
            let finalContent = text;
            if (selectedFiles.length > 0) {
                const fd = new FormData();
                selectedFiles.forEach(f => fd.append('files', f));
                const up = await api.post('/upload/multiple', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                const base = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
                let html = `<div class="flex flex-wrap gap-2 mt-2 w-full">`;
                up.data.files.forEach(f => {
                    const url = `${base}${f.url}`;
                    html += f.type === 'image'
                        ? `<a href="${url}" target="_blank"><img src="${url}" alt="${f.name}" /></a>`
                        : `<a href="${url}" target="_blank" rel="noopener noreferrer" download="${f.name}">📎 ${f.name}</a>`;
                });
                html += `</div>`;
                finalContent = finalContent ? `${finalContent}<br/>${html}` : html;
            }
            const res = await api.post('/chat', { recipientId: activeChatUser._id, content: finalContent, replyToId: replyingTo?._id || null });
            setMessages(prev => [...prev, res.data]);
            api.put('/users/ping').catch(() => {});
            setNewMessage(''); clearAttachments(); setShowEmojiPicker(false); setReplyingTo(null);
            inputRef.current?.focus();
        } catch { toast.error('Failed to send message.'); }
        finally { setSending(false); }
    };

    const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

    /* reply */
    const handleReply = useCallback((msg) => { setReplyingTo(msg); inputRef.current?.focus(); }, []);

    /* react */
    const handleReact = useCallback(async (messageId, emoji) => {
        try {
            const res = await api.post(`/chat/message/${messageId}/react`, { emoji });
            setMessages(prev => prev.map(m => m._id === messageId ? { ...m, reactions: res.data.reactions } : m));
        } catch { toast.error('Failed to add reaction.'); }
    }, []);

    /* delete single */
    const handleDeleteForMe = useCallback(async (messageId) => {
        try {
            await api.delete(`/chat/message/${messageId}/me`);
            setMessages(prev => prev.filter(m => m._id !== messageId));
            toast.success('Message deleted');
        } catch { toast.error('Failed to delete.'); }
    }, []);

    const handleDeleteForEveryone = useCallback(async (messageId) => {
        try {
            await api.delete(`/chat/message/${messageId}/everyone`);
            setMessages(prev => prev.map(m => m._id === messageId ? { ...m, deletedForEveryone: true } : m));
            toast.success('Deleted for everyone');
        } catch (err) { toast.error(err?.response?.data?.msg || 'Cannot delete for everyone.'); }
    }, []);

    /* multi-select */
    const toggleSelectMsg = useCallback((id) => {
        setIsSelectMode(true);
        setSelectedMsgs(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            if (next.size === 0) setIsSelectMode(false);
            return next;
        });
    }, []);

    const cancelSelect = () => { setIsSelectMode(false); setSelectedMsgs(new Set()); };

    const handleLongPress = (id) => { setIsSelectMode(true); setSelectedMsgs(new Set([id])); };

    /* bulk delete */
    const handleBulkDelete = async (deleteType) => {
        const ids = Array.from(selectedMsgs);
        try {
            const res = await api.delete('/chat/messages/bulk', { data: { messageIds: ids, deleteType } });
            if (deleteType === 'forMe') {
                setMessages(prev => prev.filter(m => !res.data.success.map(String).includes(m._id.toString())));
            } else {
                setMessages(prev => prev.map(m => res.data.success.map(String).includes(m._id.toString()) ? { ...m, deletedForEveryone: true } : m));
            }
            if (res.data.failed.length) toast.error(`${res.data.failed.length} message(s) couldn't be deleted for everyone (time limit passed).`);
            else toast.success(deleteType === 'forMe' ? 'Deleted for you' : 'Deleted for everyone');
            cancelSelect();
        } catch { toast.error('Bulk delete failed.'); }
    };

    const canBulkDeleteEveryone = Array.from(selectedMsgs).every(id => {
        const m = messages.find(x => x._id === id);
        return msgCanDeleteForEveryone(m, user?._id);
    });

    const grouped    = groupMessagesByDate(messages);
    const isOnline   = isUserOnline(activeChatUser?.lastSeen);
    const cleanConvs = deduplicateConversations(conversations, user?._id);
    const filteredConvs = cleanConvs.filter(c => (c.user?.name || '').toLowerCase().includes(searchQuery.toLowerCase()));

    if (authLoading || loading)
        return <div className="h-screen flex items-center justify-center bg-gray-50"><Spinner/></div>;

    return (
        <>
            <Head><title>Messages | CodeFlow</title></Head>
            <div className="flex overflow-hidden bg-[#f0f2f5]" style={{ height: 'calc(100vh - 64px)', fontFamily: "'DM Sans', system-ui, sans-serif" }}>

                {/* ── Sidebar ── */}
                <aside className="w-[300px] flex-shrink-0 flex flex-col bg-white border-r border-gray-200">
                    <div className="px-4 pt-5 pb-3 border-b border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <h1 className="text-xl font-bold text-gray-900">Chats</h1>
                            <button className="p-2 rounded-full hover:bg-gray-100 text-gray-500"><MoreVertical size={18}/></button>
                        </div>
                        <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
                            <Search size={14} className="text-gray-400 flex-shrink-0"/>
                            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search conversations…" className="bg-transparent text-sm outline-none flex-1 text-gray-700 placeholder-gray-400"/>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
                        {filteredConvs.length === 0
                            ? <p className="text-center text-sm text-gray-400 mt-10">No conversations yet</p>
                            : filteredConvs.map(c => (
                                <ConversationItem key={c.userId} conv={c} isActive={activeChatUser?._id === c.userId} onClick={() => router.push(`/messages?userId=${c.userId}`)}/>
                            ))
                        }
                    </div>
                </aside>

                {/* ── Chat area ── */}
                <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    {activeChatUser ? (
                        <>
                            {/* Header / Selection toolbar */}
                            {isSelectMode ? (
                                <SelectionToolbar
                                    count={selectedMsgs.size}
                                    canDeleteEveryone={canBulkDeleteEveryone && selectedMsgs.size > 0}
                                    onDeleteMe={() => handleBulkDelete('forMe')}
                                    onDeleteEveryone={() => handleBulkDelete('forEveryone')}
                                    onCancel={cancelSelect}
                                />
                            ) : (
                                <header className="flex items-center gap-3 px-5 py-3 bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
                                    <button onClick={() => router.push(`/profile/${activeChatUser._id}`)} className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity">
                                        <div className="relative flex-shrink-0">
                                            <Avatar className="w-10 h-10">
                                                <AvatarImage src={getAvatarUrl(activeChatUser.avatar)}/>
                                                <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-purple-500 text-white text-sm font-semibold">{getInitials(activeChatUser.name)}</AvatarFallback>
                                            </Avatar>
                                            {isOnline && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full"/>}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 text-sm leading-tight">{activeChatUser.name}</p>
                                            <p className={`text-xs font-medium ${isOnline ? 'text-green-500' : 'text-gray-400'}`}>{formatLastSeen(activeChatUser.lastSeen)}</p>
                                        </div>
                                    </button>
                                </header>
                            )}

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-[#f0f2f5]">
                                {grouped.map((item, i) =>
                                    item.type === 'date' ? (
                                        <DateDivider key={`d${i}`} label={item.label}/>
                                    ) : (
                                        <MessageBubble
                                            key={item.data._id}
                                            msg={item.data}
                                            isMine={item.data.sender?.toString() === user._id?.toString()}
                                            myId={user._id}
                                            isSelected={selectedMsgs.has(item.data._id)}
                                            isSelectMode={isSelectMode}
                                            onLongPress={handleLongPress}
                                            onSelect={toggleSelectMsg}
                                            onReply={handleReply}
                                            onReact={handleReact}
                                            onDeleteMe={handleDeleteForMe}
                                            onDeleteEveryone={handleDeleteForEveryone}
                                            canDeleteEveryone={msgCanDeleteForEveryone(item.data, user._id)}
                                        />
                                    )
                                )}
                                <div ref={messagesEndRef}/>
                            </div>

                            {/* Reply banner */}
                            {replyingTo && <ReplyBanner msg={replyingTo} myId={user._id} onCancel={() => setReplyingTo(null)}/>}

                            {/* Attachment previews */}
                            {previews.length > 0 && (
                                <div className="px-4 py-2.5 bg-white border-t border-gray-100 flex-shrink-0">
                                    <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
                                        {previews.map((p, idx) => (
                                            <div key={idx} className="relative flex-shrink-0 group">
                                                {p.type === 'image'
                                                    ? <img src={p.url} alt="preview" className="w-14 h-14 rounded-xl object-cover border border-gray-200 shadow-sm"/>
                                                    : <div className="flex flex-col items-center justify-center bg-indigo-50 border border-indigo-100 rounded-xl w-14 h-14 p-1.5 gap-1"><Paperclip size={14} className="text-indigo-500"/><span className="text-[8px] text-gray-600 truncate w-full text-center">{p.name}</span></div>
                                                }
                                                <button onClick={() => removeAttachment(idx)} className="absolute -top-1.5 -right-1.5 bg-gray-800 text-white rounded-full w-4 h-4 flex items-center justify-center shadow hover:bg-red-500 transition opacity-0 group-hover:opacity-100"><X size={9}/></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Input bar */}
                            <footer className="px-4 py-3 bg-white border-t border-gray-100 flex-shrink-0">
                                <input ref={imageInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleFileSelect}/>
                                <input ref={fileInputRef}  type="file" multiple accept=".pdf,.doc,.docx,.txt,.zip,.csv,.xlsx" className="hidden" onChange={handleFileSelect}/>
                                <div className="flex items-end gap-2">
                                    <div className="relative flex-shrink-0" ref={emojiRef}>
                                        <button onClick={() => setShowEmojiPicker(v => !v)} className={`p-2 rounded-full transition ${showEmojiPicker ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-gray-100 text-gray-400'}`}><Smile size={20}/></button>
                                        {showEmojiPicker && (
                                            <div className="absolute bottom-12 left-0 z-50 shadow-2xl rounded-2xl overflow-hidden">
                                                <EmojiPicker onEmojiClick={e => { setNewMessage(p => p + e.emoji); inputRef.current?.focus(); }} height={380} width={320} previewConfig={{ showPreview: false }}/>
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={() => imageInputRef.current?.click()} className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition flex-shrink-0"><ImageIcon size={20}/></button>
                                    <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition flex-shrink-0"><Paperclip size={20}/></button>
                                    <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-2.5">
                                        <textarea ref={inputRef} value={newMessage}
                                            onChange={e => { setNewMessage(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
                                            onKeyDown={handleKeyDown} placeholder="Type a message…" rows={1}
                                            className="w-full bg-transparent outline-none resize-none text-sm text-gray-800 placeholder-gray-400 leading-relaxed" style={{ maxHeight: '120px' }}/>
                                    </div>
                                    <button onClick={handleSend} disabled={(!newMessage.trim() && selectedFiles.length === 0) || sending}
                                        className={`p-3 rounded-full transition-all duration-150 flex-shrink-0 ${(newMessage.trim() || selectedFiles.length > 0) ? 'bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-md hover:scale-105' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                                        <Send size={18} className={sending ? 'opacity-50' : ''}/>
                                    </button>
                                </div>
                            </footer>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center select-none">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shadow-inner">
                                <Send size={36} className="text-indigo-400 rotate-[-20deg]"/>
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