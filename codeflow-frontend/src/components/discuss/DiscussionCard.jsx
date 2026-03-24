import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ThumbsUp, MessageSquare, Share2, Send, MoreHorizontal, Bookmark, X, Trash, Image as ImageIcon, Smile, Loader2, Link as LinkIcon } from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { FaGlobeAmericas } from 'react-icons/fa';
import { getAvatarUrl } from '@/lib/utils';
import useAuth from '@/hooks/useAuth';
import EmojiPicker from 'emoji-picker-react';

const REACTIONS = [
    { id: 'like',       icon: '👍', name: 'Like',       color: 'text-blue-500' },
    { id: 'celebrate',  icon: '👏', name: 'Celebrate',  color: 'text-emerald-500' },
    { id: 'support',    icon: '🤝', name: 'Support',    color: 'text-violet-500' },
    { id: 'love',       icon: '❤️', name: 'Love',       color: 'text-rose-500' },
    { id: 'insightful', icon: '💡', name: 'Insightful', color: 'text-amber-500' },
    { id: 'funny',      icon: '😂', name: 'Funny',      color: 'text-cyan-500' },
];

const REACTION_TYPES = {
    like:       { icon: '👍', color: 'text-blue-500',    label: 'Like' },
    celebrate:  { icon: '👏', color: 'text-emerald-500', label: 'Celebrate' },
    love:       { icon: '❤️', color: 'text-rose-500',    label: 'Love' },
    insightful: { icon: '💡', color: 'text-amber-500',   label: 'Insightful' },
};

// ─── REACTION STACK (comments/replies) ────────────────────────────────────────
const ReactionStack = ({ likes }) => {
    if (!likes || likes.length === 0) return null;

    const typeCounts = likes.reduce((acc, like) => {
        const type = typeof like === 'string' ? 'like' : (like.type || 'like');
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {});

    const sortedTypes = Object.keys(typeCounts)
        .sort((a, b) => typeCounts[b] - typeCounts[a])
        .slice(0, 3);

    return (
        <div className="cf-reaction-stack">
            <div className="cf-reaction-stack__icons">
                {sortedTypes.map((type, i) => {
                    const reaction = REACTIONS.find(r => r.id === type) || REACTIONS[0];
                    return (
                        <span key={type} className="cf-reaction-stack__bubble emoji-font" style={{ zIndex: 3 - i }}>
                            {reaction.icon}
                        </span>
                    );
                })}
            </div>
            <span className="cf-reaction-stack__count">{likes.length}</span>
        </div>
    );
};

// ─── POST REACTIONS ────────────────────────────────────────────────────────────
const PostReactions = ({ post, currentUser, commentsCount, onCommentClick }) => {
    const [reactions, setReactions]   = useState(post.reactions || post.likes || []);
    const [isHovering, setIsHovering] = useState(false);
    const [modalOpen, setModalOpen]   = useState(false);
    const [activeTab, setActiveTab]   = useState('All');

    const handleReact = async (type) => {
        if (!currentUser) return toast.error("Please login");
        const previousReactions = [...reactions];
        const existingReaction  = reactions.find(r => (r.user?._id || r._id || r)?.toString() === currentUser._id?.toString());
        const currentlyLiked    = !!existingReaction;
        const isRemoving        = currentlyLiked && (existingReaction.type || 'like') === type;

        if (isRemoving) {
            setReactions(prev => prev.filter(r => (r.user?._id || r._id || r)?.toString() !== currentUser._id?.toString()));
        } else if (currentlyLiked) {
            setReactions(prev => prev.map(r =>
                (r.user?._id || r._id || r)?.toString() === currentUser._id?.toString() ? { ...r, type } : r
            ));
        } else {
            setReactions(prev => [...prev, {
                user: { _id: currentUser._id, name: currentUser.name, avatar: currentUser.avatar, bio: currentUser.bio },
                type,
            }]);
        }
        setIsHovering(false);

        try {
            const res = await api.put(`/discussions/${post._id}/react`, { reactionType: type });
            setReactions(res.data);
        } catch (err) {
            toast.error("Failed to react");
            setReactions(previousReactions);
        }
    };

    const getReactionSummary = () => {
        if (!reactions || reactions.length === 0) return null;
        const myId = currentUser?._id?.toString();
        const priorityNames = [];

        const connectedIds = new Set(
            (currentUser?.connections || [])
                .filter(c => c.status === 'connected')
                .map(c => { const u = c.user; return (typeof u === 'object' ? u._id : u)?.toString(); })
                .filter(Boolean)
        );

        const iReacted = reactions.some(r => (r.user?._id || r.user || r._id || r)?.toString() === myId);
        if (iReacted) priorityNames.push('You');

        for (const r of reactions) {
            if (priorityNames.length >= 2) break;
            const rUser = r.user;
            if (!rUser || typeof rUser !== 'object') continue;
            const uid = rUser._id?.toString();
            if (uid === myId) continue;
            if (connectedIds.has(uid) && rUser.name) priorityNames.push(rUser.name.split(' ')[0]);
        }

        const others = reactions.length - priorityNames.length;
        if (priorityNames.length === 0) return reactions.length.toString();
        if (priorityNames.length === 1 && others === 0) return priorityNames[0];
        if (priorityNames.length === 1) return `${priorityNames[0]} and ${others} ${others === 1 ? 'other' : 'others'}`;
        if (others === 0) return `${priorityNames[0]} and ${priorityNames[1]}`;
        return `${priorityNames[0]}, ${priorityNames[1]} and ${others} others`;
    };

    const myReaction = (() => {
        const myId = currentUser?._id?.toString();
        if (!myId) return null;
        const found = reactions.find(r => (r.user?._id || r.user || r._id || r)?.toString() === myId);
        return found?.type || (found ? 'like' : null);
    })();

    return (
        <>
            {/* ── reaction summary bar ── */}
            <div className="cf-post__meta">
                <div className="cf-post__meta-left">
                    {reactions.length > 0 && (
                        <button className="cf-post__reaction-summary" onClick={() => setModalOpen(true)}>
                            <div className="cf-reaction-stack__icons">
                                {[...new Set(reactions.map(r => r.type || 'like'))].slice(0, 3).map((type, i) => (
                                    <span key={type} className="cf-reaction-stack__bubble emoji-font" style={{ zIndex: 3 - i }}>
                                        {REACTION_TYPES[type]?.icon || '👍'}
                                    </span>
                                ))}
                            </div>
                            <span className="cf-post__reaction-label">{getReactionSummary()}</span>
                        </button>
                    )}
                </div>
                <button className="cf-post__comment-count" onClick={onCommentClick}>
                    {commentsCount} {commentsCount === 1 ? 'comment' : 'comments'}
                </button>
            </div>

            {/* ── action bar ── */}
            <div className="cf-post__actions">
                <div
                    className="cf-post__action-wrap"
                    onMouseLeave={() => setTimeout(() => setIsHovering(false), 300)}
                >
                    {isHovering && (
                        <div
                            className="cf-reaction-picker"
                            onMouseEnter={() => setIsHovering(true)}
                        >
                            {Object.entries(REACTION_TYPES).map(([type, data]) => (
                                <button
                                    key={type}
                                    className="cf-reaction-picker__btn"
                                    onClick={() => handleReact(type)}
                                    title={data.label}
                                >
                                    <span className="emoji-font">{data.icon}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    <button
                        className={`cf-post__action-btn ${myReaction ? REACTION_TYPES[myReaction]?.color : ''}`}
                        onMouseEnter={() => setIsHovering(true)}
                        onClick={() => handleReact(myReaction || 'like')}
                    >
                        {myReaction
                            ? <span className="emoji-font cf-post__action-emoji">{REACTION_TYPES[myReaction]?.icon}</span>
                            : <ThumbsUp size={16} />
                        }
                        <span>{myReaction ? REACTION_TYPES[myReaction]?.label : 'Like'}</span>
                    </button>
                </div>

                <PostActionBtn Icon={MessageSquare} text="Comment" onClick={onCommentClick} />
                <PostActionBtn Icon={Share2}        text="Repost" />
                <PostActionBtn Icon={Send}          text="Send" />
            </div>

            {/* ── reactions modal ── */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="cf-modal">
                    <DialogHeader className="cf-modal__header">
                        <DialogTitle className="cf-modal__title">Reactions</DialogTitle>
                    </DialogHeader>

                    <div className="cf-modal__tabs">
                        <button
                            className={`cf-modal__tab ${activeTab === 'All' ? 'cf-modal__tab--active' : ''}`}
                            onClick={() => setActiveTab('All')}
                        >
                            All {reactions.length}
                        </button>
                        {Object.entries(REACTION_TYPES).map(([type, data]) => {
                            const count = reactions.filter(r => (r.type || 'like') === type).length;
                            if (!count) return null;
                            return (
                                <button
                                    key={type}
                                    className={`cf-modal__tab ${activeTab === type ? 'cf-modal__tab--active' : ''}`}
                                    onClick={() => setActiveTab(type)}
                                >
                                    <span className="emoji-font">{data.icon}</span> {count}
                                </button>
                            );
                        })}
                    </div>

                    <div className="cf-modal__list">
                        {reactions
                            .filter(r => activeTab === 'All' || (r.type || 'like') === activeTab)
                            .map((r, idx) => {
                                const rUser = (r.user && typeof r.user === 'object' && r.user.name) ? r.user : null;
                                if (!rUser) return null;
                                const rType = r.type || 'like';
                                return (
                                    <Link key={idx} href={`/profile/${rUser._id || '#'}`} onClick={() => setModalOpen(false)}>
                                        <div className="cf-modal__row">
                                            <div className="cf-modal__avatar-wrap">
                                                <Avatar className="cf-modal__avatar">
                                                    <AvatarImage src={getAvatarUrl(rUser.avatar)} />
                                                    <AvatarFallback>{rUser.name?.[0] ?? '?'}</AvatarFallback>
                                                </Avatar>
                                                <span className="cf-modal__reaction-badge emoji-font">
                                                    {REACTION_TYPES[rType]?.icon}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="cf-modal__name">{rUser.name}</p>
                                                <p className="cf-modal__bio">{rUser.bio || 'CodeFlow Member'}</p>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

const PostActionBtn = ({ Icon, text, onClick }) => (
    <button onClick={onClick} className="cf-post__action-btn">
        <Icon size={16} />
        <span>{text}</span>
    </button>
);

// ─── NESTED REPLY ──────────────────────────────────────────────────────────────
const NestedReplyItem = ({ reply, postId, parentCommentId, currentUser, onReplyClick }) => {
    const [likes, setLikes] = useState(reply.likes || []);
    // ✅ FIX: use controlled state instead of CSS group-hover
    const [isHoveringReaction, setIsHoveringReaction] = useState(false);
    const hoverTimeoutRef = useRef(null);

    const myId     = currentUser?._id?.toString();
    const userLike = likes.find(l => (l.user?._id || l._id || l)?.toString() === myId);
    const isLiked  = !!userLike;

    const [activeReaction, setActiveReaction] = useState(
        userLike?.type ? REACTIONS.find(r => r.id === userLike.type) : (isLiked ? REACTIONS[0] : null)
    );

    const repAuthor = typeof reply.author === 'object' ? reply.author : null;

    const handleMouseEnter = () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        setIsHoveringReaction(true);
    };

    const handleMouseLeave = () => {
        hoverTimeoutRef.current = setTimeout(() => setIsHoveringReaction(false), 200);
    };

    const handleReaction = async (reaction = REACTIONS[0]) => {
        if (!currentUser) return toast.error("Please login");
        const previousLikes    = [...likes];
        const previousReaction = activeReaction;
        const isRemoving       = isLiked && activeReaction?.id === reaction.id;

        setActiveReaction(isRemoving ? null : reaction);
        if (!isLiked) {
            setLikes(prev => [...prev, { _id: currentUser._id, type: reaction.id }]);
        } else if (isRemoving) {
            setLikes(prev => prev.filter(l => (l.user?._id || l._id || l)?.toString() !== myId));
        } else {
            setLikes(prev => prev.map(l =>
                (l.user?._id || l._id || l)?.toString() === myId ? { ...l, type: reaction.id } : l
            ));
        }
        setIsHoveringReaction(false);

        try {
            const res = await api.put(`/discussions/${postId}/comments/${parentCommentId}/replies/${reply._id}/like`);
            setLikes(res.data);
        } catch (error) {
            toast.error("Failed to react");
            setLikes(previousLikes);
            setActiveReaction(previousReaction);
        }
    };

    return (
        <div className="cf-reply">
            <Link href={`/profile/${repAuthor?._id || '#'}`}>
                <Avatar className="cf-reply__avatar">
                    <AvatarImage src={getAvatarUrl(repAuthor?.avatar)} />
                    <AvatarFallback>{repAuthor?.name?.[0] ?? '?'}</AvatarFallback>
                </Avatar>
            </Link>
            <div className="cf-reply__body">
                <div className="cf-bubble cf-bubble--sm">
                    <div className="cf-bubble__header">
                        <Link href={`/profile/${repAuthor?._id || '#'}`}>
                            <span className="cf-bubble__author">{repAuthor?.name || 'Unknown'}</span>
                        </Link>
                        <span className="cf-bubble__time">
                            {formatDistanceToNow(new Date(reply.createdAt || Date.now()))}
                        </span>
                    </div>
                    <div className="cf-bubble__content post-content" dangerouslySetInnerHTML={{ __html: reply.content }} />
                </div>

                <div className="cf-inline-actions">
                    {/* ✅ FIX: controlled hover with mouse enter/leave + timeout */}
                    <div
                        className="cf-inline-actions__reaction-wrap"
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                    >
                        {isHoveringReaction && (
                            <div
                                className="cf-mini-picker"
                                onMouseEnter={handleMouseEnter}
                                onMouseLeave={handleMouseLeave}
                            >
                                {REACTIONS.map(reaction => (
                                    <button key={reaction.id} className="cf-mini-picker__btn" onClick={() => handleReaction(reaction)} title={reaction.name}>
                                        <span className="emoji-font">{reaction.icon}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        <button
                            onClick={() => handleReaction(activeReaction || REACTIONS[0])}
                            className={`cf-inline-actions__btn ${activeReaction ? activeReaction.color : ''}`}
                        >
                            {activeReaction && <span className="emoji-font text-[10px]">{activeReaction.icon}</span>}
                            {activeReaction ? activeReaction.name : 'Like'}
                        </button>
                    </div>
                    <span className="cf-inline-actions__dot" />
                    <button className="cf-inline-actions__btn" onClick={() => onReplyClick(repAuthor?.name || '')}>
                        Reply
                    </button>
                    <ReactionStack likes={likes} />
                </div>
            </div>
        </div>
    );
};

// ─── COMMENT ITEM ──────────────────────────────────────────────────────────────
const CommentItem = ({ comment, postId, currentUser }) => {
    const [likes,       setLikes]       = useState(comment.likes || []);
    const [replies,     setReplies]     = useState(comment.replies || []);
    const [isReplying,  setIsReplying]  = useState(false);
    const [replyToName, setReplyToName] = useState('');
    // ✅ FIX: use controlled state instead of CSS group-hover
    const [isHoveringReaction, setIsHoveringReaction] = useState(false);
    const hoverTimeoutRef = useRef(null);

    const myId     = currentUser?._id?.toString();
    const userLike = likes.find(like => (like.user?._id || like._id || like)?.toString() === myId);
    const isLiked  = !!userLike;

    const [activeReaction, setActiveReaction] = useState(
        userLike?.type ? REACTIONS.find(r => r.id === userLike.type) : (isLiked ? REACTIONS[0] : null)
    );

    const author     = typeof comment.author === 'object' ? comment.author : null;
    const authorName = author?.name || 'Unknown User';

    const handleMouseEnter = () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        setIsHoveringReaction(true);
    };

    const handleMouseLeave = () => {
        hoverTimeoutRef.current = setTimeout(() => setIsHoveringReaction(false), 200);
    };

    const handleReaction = async (reaction = REACTIONS[0]) => {
        if (!currentUser) return toast.error("Please login");
        const previousReaction = activeReaction;
        const previousLikes    = [...likes];
        const isRemoving       = isLiked && activeReaction?.id === reaction.id;

        setActiveReaction(isRemoving ? null : reaction);
        if (!isLiked) {
            setLikes(prev => [...prev, { _id: currentUser._id, type: reaction.id }]);
        } else if (isRemoving) {
            setLikes(prev => prev.filter(like => (like.user?._id || like._id || like)?.toString() !== myId));
        } else {
            setLikes(prev => prev.map(like =>
                (like.user?._id || like._id || like)?.toString() === myId ? { ...like, type: reaction.id } : like
            ));
        }
        setIsHoveringReaction(false);

        try {
            const res = await api.put(`/discussions/${postId}/comments/${comment._id}/like`, { type: reaction.id });
            setLikes(res.data);
        } catch (error) {
            toast.error("Failed to react to comment");
            setLikes(previousLikes);
            setActiveReaction(previousReaction);
        }
    };

    const handleReplyAdded = (newReply) => {
        setReplies(prev => [...prev, newReply]);
        setIsReplying(false);
        setReplyToName('');
    };

    const handleOpenReply = (name = '') => {
        setReplyToName(name);
        setIsReplying(true);
    };

    return (
        <div className="cf-comment">
            <Link href={`/profile/${author?._id || '#'}`}>
                <Avatar className="cf-comment__avatar">
                    <AvatarImage src={getAvatarUrl(author?.avatar)} />
                    <AvatarFallback>{authorName[0] ?? '?'}</AvatarFallback>
                </Avatar>
            </Link>
            <div className="cf-comment__body">
                <div className="cf-bubble">
                    <div className="cf-bubble__header">
                        <div>
                            <Link href={`/profile/${author?._id || '#'}`}>
                                <span className="cf-bubble__author">{authorName}</span>
                            </Link>
                            <p className="cf-bubble__bio">{author?.bio || 'Member'}</p>
                        </div>
                        <span className="cf-bubble__time">
                            {formatDistanceToNow(new Date(comment.createdAt || Date.now()))}
                        </span>
                    </div>
                    <div className="cf-bubble__content post-content" dangerouslySetInnerHTML={{ __html: comment.content }} />
                </div>

                <div className="cf-inline-actions">
                    {/* ✅ FIX: controlled hover with mouse enter/leave + timeout */}
                    <div
                        className="cf-inline-actions__reaction-wrap"
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                    >
                        {isHoveringReaction && (
                            <div
                                className="cf-mini-picker"
                                onMouseEnter={handleMouseEnter}
                                onMouseLeave={handleMouseLeave}
                            >
                                {REACTIONS.map(reaction => (
                                    <button key={reaction.id} className="cf-mini-picker__btn" onClick={() => handleReaction(reaction)} title={reaction.name}>
                                        <span className="emoji-font">{reaction.icon}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        <button
                            onClick={() => handleReaction(activeReaction || REACTIONS[0])}
                            className={`cf-inline-actions__btn ${activeReaction ? activeReaction.color : ''}`}
                        >
                            {activeReaction && <span className="emoji-font text-[10px]">{activeReaction.icon}</span>}
                            {activeReaction ? activeReaction.name : 'Like'}
                        </button>
                    </div>
                    <span className="cf-inline-actions__dot" />
                    <button className="cf-inline-actions__btn" onClick={() => handleOpenReply(authorName)}>
                        Reply
                    </button>
                    <ReactionStack likes={likes} />
                </div>

                {isReplying && (
                    <div className="cf-reply-input-wrap">
                        {currentUser ? (
                            <CommentInput
                                postId={postId}
                                currentUser={currentUser}
                                onCommentAdded={handleReplyAdded}
                                isReply={true}
                                commentId={comment._id}
                                replyToName={replyToName}
                            />
                        ) : (
                            <p className="cf-login-hint">Please log in to reply.</p>
                        )}
                    </div>
                )}

                {replies.length > 0 && (
                    <div className="cf-replies">
                        {replies.map((reply, rIdx) => (
                            <NestedReplyItem
                                key={reply._id || rIdx}
                                reply={reply}
                                postId={postId}
                                parentCommentId={comment._id}
                                currentUser={currentUser}
                                onReplyClick={(name) => handleOpenReply(name)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── COMMENT INPUT ─────────────────────────────────────────────────────────────
const CommentInput = ({ postId, currentUser, onCommentAdded, isReply = false, commentId = null, replyToName = '' }) => {
    const [commentHtml,     setCommentHtml]     = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showLinkPrompt,  setShowLinkPrompt]  = useState(false);
    const [linkUrl,         setLinkUrl]         = useState('');
    const [loading,         setLoading]         = useState(false);
    const [imageUploading,  setImageUploading]  = useState(false);

    const editorRef    = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (isReply && replyToName && editorRef.current) {
            const mention = `<span style="color:#2563eb;font-weight:600;">@${replyToName}</span>&nbsp;`;
            editorRef.current.innerHTML = mention;
            setCommentHtml(mention);
            const range = document.createRange();
            const sel   = window.getSelection();
            range.selectNodeContents(editorRef.current);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
            editorRef.current.focus();
        }
    }, [replyToName, isReply]);

    const onEmojiClick = (emojiObject) => {
        if (editorRef.current) {
            editorRef.current.innerHTML += emojiObject.emoji;
            setCommentHtml(editorRef.current.innerHTML);
            const range = document.createRange();
            const sel   = window.getSelection();
            range.selectNodeContents(editorRef.current);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
            editorRef.current.focus();
        }
    };

    const handleApplyLink = () => {
        if (!linkUrl.trim()) { setShowLinkPrompt(false); return; }
        let url = linkUrl.trim();
        if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
        const html = `&nbsp;<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#2563eb;text-decoration:underline;font-weight:600;">${url}</a>&nbsp;`;
        if (editorRef.current) {
            editorRef.current.innerHTML += html;
            setCommentHtml(editorRef.current.innerHTML);
            const range = document.createRange();
            const sel   = window.getSelection();
            range.selectNodeContents(editorRef.current);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
            editorRef.current.focus();
        }
        setLinkUrl('');
        setShowLinkPrompt(false);
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImageUploading(true);
        try {
            const formData = new FormData();
            formData.append('image', file);
            const res = await api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            const imageUrl  = `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'}${res.data.url}`;
            const imageHtml = `<br/><img src="${imageUrl}" alt="Comment Image" style="max-width:200px;border-radius:8px;margin-top:8px;" /><br/>`;
            if (editorRef.current) {
                editorRef.current.innerHTML += imageHtml;
                setCommentHtml(editorRef.current.innerHTML);
            }
        } catch { toast.error("Failed to upload image"); }
        finally  { setImageUploading(false); }
    };

    const handleSubmit = async () => {
        const plainText = editorRef.current?.innerText || '';
        if (!plainText.trim() && !commentHtml.includes('<img') && !commentHtml.includes('<a')) return;
        setLoading(true);
        try {
            let res;
            if (isReply && commentId) {
                res = await api.post(`/discussions/${postId}/comments/${commentId}/reply`, { content: commentHtml });
                onCommentAdded(res.data);
            } else {
                res = await api.post(`/discussions/${postId}/comment`, { content: commentHtml });
                const newComment = res.data.comments
                    ? res.data.comments[res.data.comments.length - 1]
                    : { content: commentHtml, author: currentUser, createdAt: new Date() };
                onCommentAdded(newComment);
            }
            setCommentHtml('');
            if (editorRef.current) editorRef.current.innerHTML = '';
            toast.success(isReply ? 'Reply posted' : 'Comment posted');
        } catch { toast.error('Failed to post'); }
        finally  { setLoading(false); }
    };

    return (
        <div className="cf-input">
            <Avatar className="cf-input__avatar">
                <AvatarImage src={getAvatarUrl(currentUser?.avatar)} />
                <AvatarFallback>{currentUser?.name?.[0] ?? '?'}</AvatarFallback>
            </Avatar>
            <div className="cf-input__editor-wrap">
                <div
                    ref={editorRef}
                    contentEditable
                    onInput={e => setCommentHtml(e.currentTarget.innerHTML)}
                    className="cf-input__editor"
                    data-placeholder={isReply ? 'Write a reply…' : 'Add a comment…'}
                />
                <div className="cf-input__toolbar">
                    <div className="cf-input__tools">
                        <button className="cf-input__tool-btn" onClick={() => setShowEmojiPicker(!showEmojiPicker)} title="Emoji">
                            <Smile size={16} />
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                        <button className="cf-input__tool-btn" onClick={() => fileInputRef.current?.click()} disabled={imageUploading} title="Image">
                            {imageUploading ? <Loader2 size={16} className="animate-spin text-blue-500" /> : <ImageIcon size={16} />}
                        </button>
                        <button className="cf-input__tool-btn" onClick={() => setShowLinkPrompt(!showLinkPrompt)} title="Link">
                            <LinkIcon size={16} />
                        </button>
                    </div>
                    {commentHtml && (
                        <button onClick={handleSubmit} disabled={loading} className="cf-input__submit">
                            {loading ? '…' : 'Post'}
                        </button>
                    )}
                </div>

                {showLinkPrompt && (
                    <div className="cf-link-prompt">
                        <LinkIcon size={14} className="text-gray-400" />
                        <input
                            type="text"
                            placeholder="Paste a link…"
                            className="cf-link-prompt__input"
                            value={linkUrl}
                            onChange={e => setLinkUrl(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleApplyLink()}
                            autoFocus
                        />
                        <button onClick={handleApplyLink} className="cf-link-prompt__apply">Apply</button>
                    </div>
                )}

                {showEmojiPicker && (
                    <div className="cf-emoji-picker">
                        <div className="cf-emoji-picker__header">
                            <span>Emoji</span>
                            <button onClick={() => setShowEmojiPicker(false)}><X size={14} /></button>
                        </div>
                        <EmojiPicker
                            theme="light"
                            emojiStyle="native"
                            onEmojiClick={onEmojiClick}
                            searchDisabled={false}
                            skinTonesDisabled={false}
                            previewConfig={{ showPreview: false }}
                            width={300}
                            height={380}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── DISCUSSION CARD ───────────────────────────────────────────────────────────
const DiscussionCard = ({ post, currentUser: propUser }) => {
    const { user: authUser, refreshUser } = useAuth();
    const currentUser = authUser || propUser || null;

    const [comments,     setComments]     = useState(post.comments || []);
    const [showComments, setShowComments] = useState(false);
    const [isExpanded,   setIsExpanded]   = useState(false);
    const [isOverflowing,setIsOverflowing]= useState(false);
    const contentRef = useRef(null);

    const isSaved = currentUser?.savedPosts?.some(id => id?.toString() === post._id?.toString()) || false;
    const isOwner = currentUser?._id?.toString() === post.author?._id?.toString();

    useEffect(() => {
        if (contentRef.current) setIsOverflowing(contentRef.current.scrollHeight > 120);
    }, [post.content]);

    useEffect(() => {
        if (post.comments) setComments(post.comments);
    }, [post]);

    const handleSavePost = async () => {
        if (!currentUser) return toast.error('Please login');
        try {
            await api.post(`/discussions/${post._id}/save`);
            await refreshUser();
            toast.success(isSaved ? 'Post removed from saved' : 'Post saved');
        } catch { toast.error('Failed to save'); }
    };

    const handleDeletePost = async () => {
        if (!confirm('Are you sure you want to delete this post?')) return;
        try {
            await api.delete(`/discussions/${post._id}`);
            window.location.reload();
        } catch { toast.error('Failed to delete'); }
    };

    return (
        <div className="cf-card">
            {/* ── header ── */}
            <div className="cf-card__header">
                <Link href={`/profile/${post.author?._id}`}>
                    <Avatar className="cf-card__author-avatar">
                        <AvatarImage src={getAvatarUrl(post.author?.avatar)} />
                        <AvatarFallback>{post.author?.name?.[0] ?? '?'}</AvatarFallback>
                    </Avatar>
                </Link>
                <div className="cf-card__author-info">
                    <Link href={`/profile/${post.author?._id}`}>
                        <span className="cf-card__author-name">{post.author?.name || 'Unknown User'}</span>
                    </Link>
                    <p className="cf-card__author-bio">{post.author?.bio || 'CodeFlow Member'}</p>
                    <div className="cf-card__meta">
                        <span>{formatDistanceToNow(new Date(post.createdAt))} ago</span>
                        <span className="cf-card__meta-dot" />
                        <FaGlobeAmericas className="cf-card__globe" />
                    </div>
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="cf-card__more-btn">
                            <MoreHorizontal size={18} />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="cf-dropdown">
                        <DropdownMenuItem onClick={handleSavePost} className="cf-dropdown__item">
                            <Bookmark size={15} className={isSaved ? 'fill-current text-gray-900' : ''} />
                            {isSaved ? 'Unsave post' : 'Save post'}
                        </DropdownMenuItem>
                        {isOwner && (
                            <DropdownMenuItem onClick={handleDeletePost} className="cf-dropdown__item cf-dropdown__item--danger">
                                <Trash size={15} />
                                Delete post
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* ── content ── */}
            <div className="cf-card__content">
                {post.title && post.category === 'Article' && (
                    <div className="cf-card__article-head">
                        <h2 className="cf-card__article-title">{post.title}</h2>
                        {post.media && (
                            <img
                                src={post.media.startsWith('http') ? post.media : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'}${post.media}`}
                                alt="Article Cover"
                                className="cf-card__article-img"
                            />
                        )}
                    </div>
                )}
                <div
                    ref={contentRef}
                    className={`cf-card__text-wrap ${!isExpanded ? 'cf-card__text-wrap--clamped' : ''}`}
                >
                    <div className="post-content" dangerouslySetInnerHTML={{ __html: post.content }} />
                </div>
                {isOverflowing && !isExpanded && (
                    <button onClick={() => setIsExpanded(true)} className="cf-card__see-more">
                        …see more
                    </button>
                )}
            </div>

            {/* ── reactions + actions ── */}
            <PostReactions
                post={post}
                currentUser={currentUser}
                commentsCount={comments.length}
                onCommentClick={() => setShowComments(!showComments)}
            />

            {/* ── comments ── */}
            {showComments && (
                <div className="cf-card__comments">
                    {currentUser && (
                        <CommentInput
                            postId={post._id}
                            currentUser={currentUser}
                            onCommentAdded={c => setComments(prev => [...prev, c])}
                        />
                    )}
                    <div className="cf-comment-list">
                        {comments.map((comment, idx) => (
                            <CommentItem
                                key={comment._id || idx}
                                comment={comment}
                                postId={post._id}
                                currentUser={currentUser}
                            />
                        ))}
                    </div>
                </div>
            )}

            <style jsx global>{`
                .emoji-font { font-family: "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji" !important; }
                .post-content { font-size:0.875rem; line-height:1.6; color:#1a1a2e; word-wrap:break-word; }
                .post-content a { color:#2563eb; font-weight:600; text-decoration:none; }
                .post-content a:hover { text-decoration:underline; }
                .post-content img { max-width:100%; height:auto; border-radius:10px; margin-top:8px; max-height:260px; object-fit:contain; }

                /* CARD */
                .cf-card { background:#fff; border-radius:16px; border:1px solid #e8eaf0; box-shadow:0 1px 4px rgba(0,0,0,.06); margin-bottom:12px; overflow:hidden; transition:box-shadow .2s; }
                .cf-card:hover { box-shadow:0 4px 16px rgba(0,0,0,.09); }
                .cf-card__header { display:flex; align-items:flex-start; gap:12px; padding:16px 16px 10px; position:relative; }
                .cf-card__author-avatar { width:46px; height:46px; border-radius:50%; border:2px solid #e8eaf0; flex-shrink:0; cursor:pointer; }
                .cf-card__author-info { flex:1; min-width:0; }
                .cf-card__author-name { font-size:.875rem; font-weight:700; color:#0f172a; cursor:pointer; transition:color .15s; }
                .cf-card__author-name:hover { color:#2563eb; }
                .cf-card__author-bio { font-size:.72rem; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px; }
                .cf-card__meta { display:flex; align-items:center; gap:5px; font-size:.68rem; color:#94a3b8; margin-top:3px; }
                .cf-card__meta-dot { width:3px; height:3px; border-radius:50%; background:#cbd5e1; }
                .cf-card__globe { font-size:10px; }
                .cf-card__more-btn { padding:6px; border-radius:50%; color:#64748b; transition:background .15s,color .15s; flex-shrink:0; }
                .cf-card__more-btn:hover { background:#f1f5f9; color:#0f172a; }
                .cf-card__content { padding:4px 16px 12px; }
                .cf-card__article-head { margin-bottom:12px; }
                .cf-card__article-title { font-size:1.2rem; font-weight:800; color:#0f172a; line-height:1.3; margin-bottom:10px; }
                .cf-card__article-img { width:100%; max-height:320px; object-fit:cover; border-radius:12px; border:1px solid #e8eaf0; }
                .cf-card__text-wrap { position:relative; overflow:hidden; transition:max-height .3s; }
                .cf-card__text-wrap--clamped { max-height:140px; }
                .cf-card__see-more { font-size:.75rem; font-weight:600; color:#64748b; margin-top:4px; float:right; transition:color .15s; }
                .cf-card__see-more:hover { color:#2563eb; }

                /* POST META */
                .cf-post__meta { display:flex; justify-content:space-between; align-items:center; padding:6px 16px 8px; border-top:1px solid #f1f5f9; }
                .cf-post__meta-left { display:flex; align-items:center; gap:8px; flex:1; }
                .cf-post__reaction-summary { display:flex; align-items:center; gap:6px; cursor:pointer; border-radius:6px; padding:2px 6px; transition:background .15s; }
                .cf-post__reaction-summary:hover { background:#f8fafc; }
                .cf-post__reaction-label { font-size:.72rem; color:#64748b; }
                .cf-post__reaction-summary:hover .cf-post__reaction-label { color:#2563eb; }
                .cf-post__comment-count { font-size:.72rem; color:#64748b; flex-shrink:0; padding:2px 6px; border-radius:6px; transition:background .15s,color .15s; }
                .cf-post__comment-count:hover { background:#f8fafc; color:#2563eb; }

                /* ACTION BAR */
                .cf-post__actions { display:flex; border-top:1px solid #f1f5f9; padding:2px 4px; }
                .cf-post__action-wrap { flex:1; position:relative; }
                .cf-post__action-btn { width:100%; display:flex; align-items:center; justify-content:center; gap:6px; padding:10px 6px; border-radius:10px; font-size:.8rem; font-weight:600; color:#64748b; transition:background .15s,color .15s; }
                .cf-post__action-btn:hover { background:#f8fafc; color:#0f172a; }
                .cf-post__action-emoji { font-size:1rem; }

                /* REACTION PICKER */
                .cf-reaction-picker { position:absolute; bottom:calc(100% + 6px); left:0; background:#fff; border:1px solid #e8eaf0; border-radius:999px; padding:6px 10px; display:flex; gap:4px; box-shadow:0 8px 24px rgba(0,0,0,.12); z-index:50; animation:cfPickerIn .15s ease; }
                @keyframes cfPickerIn { from{opacity:0;transform:translateY(6px) scale(.95)} to{opacity:1;transform:translateY(0) scale(1)} }
                .cf-reaction-picker__btn { width:40px; height:40px; display:flex; align-items:center; justify-content:center; border-radius:50%; font-size:1.25rem; transition:transform .15s,background .15s; }
                .cf-reaction-picker__btn:hover { background:#f1f5f9; transform:scale(1.3) translateY(-2px); }

                /* REACTION STACK */
                .cf-reaction-stack { display:flex; align-items:center; gap:4px; color:#64748b; cursor:pointer; transition:color .15s; }
                .cf-reaction-stack:hover { color:#2563eb; }
                .cf-reaction-stack__icons { display:flex; }
                .cf-reaction-stack__bubble { width:16px; height:16px; border-radius:50%; background:#fff; border:1px solid #e8eaf0; display:flex; align-items:center; justify-content:center; font-size:9px; margin-right:-4px; box-shadow:0 1px 3px rgba(0,0,0,.08); }
                .cf-reaction-stack__count { font-size:11px; }

                /* COMMENTS SECTION */
                .cf-card__comments { background:#f8fafc; border-top:1px solid #f1f5f9; padding:14px 16px; }
                .cf-comment-list { margin-top:14px; display:flex; flex-direction:column; gap:12px; }
                .cf-comment { display:flex; gap:10px; }
                .cf-comment__avatar { width:34px; height:34px; border-radius:50%; border:1.5px solid #e8eaf0; flex-shrink:0; cursor:pointer; }
                .cf-comment__body { flex:1; min-width:0; }
                .cf-reply { display:flex; gap:8px; margin-top:8px; }
                .cf-reply__avatar { width:26px; height:26px; border-radius:50%; border:1.5px solid #e8eaf0; flex-shrink:0; margin-top:2px; cursor:pointer; }
                .cf-reply__body { flex:1; min-width:0; }
                .cf-replies { margin-top:8px; padding-left:4px; border-left:2px solid #e8eaf0; display:flex; flex-direction:column; gap:2px; }

                /* BUBBLE */
                .cf-bubble { background:#fff; border:1px solid #e8eaf0; border-radius:0 14px 14px 14px; padding:10px 14px; display:inline-block; width:100%; }
                .cf-bubble--sm { padding:8px 12px; border-radius:0 12px 12px 12px; }
                .cf-bubble__header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4px; }
                .cf-bubble__author { font-size:.78rem; font-weight:700; color:#0f172a; cursor:pointer; transition:color .15s; }
                .cf-bubble__author:hover { color:#2563eb; text-decoration:underline; }
                .cf-bubble__bio { font-size:.68rem; color:#94a3b8; margin-top:1px; }
                .cf-bubble__time { font-size:.68rem; color:#94a3b8; white-space:nowrap; margin-left:8px; flex-shrink:0; }
                .cf-bubble__content { font-size:.82rem; color:#1e293b; line-height:1.5; }

                /* INLINE ACTIONS */
                .cf-inline-actions { display:flex; align-items:center; gap:2px; margin-top:4px; padding-left:4px; }
                .cf-inline-actions__dot { width:3px; height:3px; border-radius:50%; background:#cbd5e1; flex-shrink:0; }
                .cf-inline-actions__btn { font-size:.72rem; font-weight:600; color:#64748b; padding:2px 6px; border-radius:6px; display:flex; align-items:center; gap:4px; transition:background .15s,color .15s; }
                .cf-inline-actions__btn:hover { background:#f1f5f9; color:#0f172a; }
                .cf-inline-actions__reaction-wrap { position:relative; }

                /* MINI PICKER — now rendered via JS state, no CSS hover needed */
                .cf-mini-picker { position:absolute; bottom:calc(100% + 4px); left:0; background:#fff; border:1px solid #e8eaf0; border-radius:999px; padding:4px 8px; display:flex; gap:2px; box-shadow:0 6px 20px rgba(0,0,0,.1); z-index:50; animation:cfPickerIn .15s ease; }
                .cf-mini-picker__btn { width:26px; height:26px; display:flex; align-items:center; justify-content:center; border-radius:50%; font-size:.9rem; transition:transform .12s,background .12s; }
                .cf-mini-picker__btn:hover { background:#f1f5f9; transform:scale(1.25); }
                .cf-reply-input-wrap { margin-top:10px; padding-left:2px; }

                /* COMMENT INPUT */
                .cf-input { display:flex; gap:10px; align-items:flex-start; }
                .cf-input__avatar { width:34px; height:34px; border-radius:50%; border:1.5px solid #e8eaf0; flex-shrink:0; }
                .cf-input__editor-wrap { flex:1; position:relative; }
                .cf-input__editor { width:100%; min-height:40px; border:1.5px solid #e2e8f0; border-radius:20px; padding:10px 16px 36px; font-size:.85rem; color:#0f172a; background:#fff; outline:none; transition:border-color .2s,box-shadow .2s; cursor:text; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
                .cf-input__editor:focus { border-color:#93c5fd; box-shadow:0 0 0 3px rgba(147,197,253,.25); }
                .cf-input__editor:empty::before { content:attr(data-placeholder); color:#94a3b8; pointer-events:none; }
                .cf-input__toolbar { position:absolute; bottom:8px; left:12px; right:8px; display:flex; align-items:center; justify-content:space-between; }
                .cf-input__tools { display:flex; gap:2px; }
                .cf-input__tool-btn { width:28px; height:28px; display:flex; align-items:center; justify-content:center; border-radius:50%; color:#64748b; transition:background .15s,color .15s; }
                .cf-input__tool-btn:hover { background:#f1f5f9; color:#0f172a; }
                .cf-input__submit { background:#2563eb; color:#fff; font-size:.75rem; font-weight:700; padding:4px 16px; border-radius:999px; transition:background .15s,transform .1s; }
                .cf-input__submit:hover { background:#1d4ed8; transform:scale(1.02); }
                .cf-input__submit:disabled { opacity:.6; }

                /* LINK PROMPT */
                .cf-link-prompt { position:absolute; bottom:52px; left:40px; z-index:50; background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:8px; display:flex; align-items:center; gap:8px; box-shadow:0 8px 24px rgba(0,0,0,.1); animation:cfPickerIn .15s ease; }
                .cf-link-prompt__input { font-size:.8rem; border:1px solid #e2e8f0; border-radius:8px; padding:6px 10px; width:180px; outline:none; color:#0f172a; transition:border-color .15s; }
                .cf-link-prompt__input:focus { border-color:#93c5fd; }
                .cf-link-prompt__apply { background:#2563eb; color:#fff; font-size:.75rem; font-weight:700; padding:6px 14px; border-radius:8px; transition:background .15s; }
                .cf-link-prompt__apply:hover { background:#1d4ed8; }

                /* EMOJI PICKER */
                .cf-emoji-picker { position:absolute; top:48px; left:0; z-index:50; border:1px solid #e2e8f0; border-radius:14px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,.12); background:#fff; }
                .cf-emoji-picker__header { display:flex; justify-content:space-between; align-items:center; padding:8px 12px; border-bottom:1px solid #f1f5f9; font-size:.75rem; font-weight:600; color:#64748b; }
                .cf-emoji-picker__header button { color:#94a3b8; transition:color .15s; }
                .cf-emoji-picker__header button:hover { color:#ef4444; }

                /* MODAL */
                .cf-modal { background:#fff; border-radius:20px; border:none; padding:0; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,.15); max-width:480px; }
                .cf-modal__header { padding:16px 20px; border-bottom:1px solid #f1f5f9; }
                .cf-modal__title { font-size:1rem; font-weight:700; color:#0f172a; }
                .cf-modal__tabs { display:flex; padding:0 20px; border-bottom:1px solid #f1f5f9; overflow-x:auto; }
                .cf-modal__tab { padding:12px 16px; font-size:.8rem; font-weight:600; color:#64748b; border-bottom:2px solid transparent; white-space:nowrap; display:flex; align-items:center; gap:4px; transition:color .15s,border-color .15s; }
                .cf-modal__tab--active { color:#2563eb; border-bottom-color:#2563eb; }
                .cf-modal__list { max-height:380px; overflow-y:auto; padding:8px; }
                .cf-modal__row { display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:12px; transition:background .15s; cursor:pointer; }
                .cf-modal__row:hover { background:#f8fafc; }
                .cf-modal__avatar-wrap { position:relative; flex-shrink:0; }
                .cf-modal__avatar { width:44px; height:44px; border-radius:50%; border:2px solid #e8eaf0; }
                .cf-modal__reaction-badge { position:absolute; bottom:-2px; right:-2px; width:18px; height:18px; background:#fff; border:1px solid #e8eaf0; border-radius:50%; font-size:10px; display:flex; align-items:center; justify-content:center; box-shadow:0 1px 3px rgba(0,0,0,.1); }
                .cf-modal__name { font-size:.85rem; font-weight:700; color:#0f172a; }
                .cf-modal__bio { font-size:.72rem; color:#94a3b8; margin-top:1px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:280px; }

                /* DROPDOWN */
                .cf-dropdown { background:#fff; border:1px solid #e8eaf0; border-radius:12px; box-shadow:0 8px 24px rgba(0,0,0,.1); padding:4px; min-width:160px; }
                .cf-dropdown__item { display:flex; align-items:center; gap:8px; padding:10px 12px; border-radius:8px; font-size:.82rem; font-weight:500; color:#334155; cursor:pointer; transition:background .15s; }
                .cf-dropdown__item:hover { background:#f8fafc; }
                .cf-dropdown__item--danger { color:#ef4444; }
                .cf-dropdown__item--danger:hover { background:#fef2f2; }
                .cf-login-hint { font-size:.75rem; color:#94a3b8; padding:4px 0; }
            `}</style>
        </div>
    );
};

export default DiscussionCard;