import { useState, useEffect, useRef } from 'react'
import { Heart, Bookmark, MessageCircle, Send, X, MoreHorizontal } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function timeAgo(dateString) {
    const now = new Date()
    const past = new Date(dateString)
    const diffMs = now - past
    const diffMins = Math.round(diffMs / 60000)
    const diffHrs = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHrs / 24)

    if (diffMins < 1) return 'только что'
    if (diffMins < 60) return `${diffMins} мин. назад`
    if (diffHrs < 24) return `${diffHrs} ч. назад`
    return `${diffDays} дн. назад`
}

export default function PostModal({ postId, session, onClose }) {
    const [post, setPost] = useState(null)
    const [loading, setLoading] = useState(true)
    const [commentText, setCommentText] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [isSaved, setIsSaved] = useState(false)
    const [likeAnimation, setLikeAnimation] = useState(false)
    const commentsEndRef = useRef(null)
    const commentInputRef = useRef(null)

    useEffect(() => {
        if (postId) fetchPost()
    }, [postId])

    // Scroll to bottom of comments when they load
    useEffect(() => {
        if (post?.comments?.length > 0) {
            commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
    }, [post?.comments?.length])

    const fetchPost = async () => {
        setLoading(true)
        try {
            const [postRes, savedRes] = await Promise.all([
                supabase
                    .from('posts')
                    .select('*, profiles(*), likes(*), comments(*, profiles(username, avatar_url))')
                    .eq('id', postId)
                    .order('created_at', { foreignTable: 'comments', ascending: true })
                    .single(),
                supabase
                    .from('saved_posts')
                    .select('post_id')
                    .eq('user_id', session.user.id)
                    .eq('post_id', postId)
                    .maybeSingle()
            ])
            if (postRes.data) setPost(postRes.data)
            setIsSaved(!!savedRes.data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const toggleLike = async () => {
        if (!post) return
        const isLiked = post.likes?.some(l => l.user_id === session.user.id)
        // Optimistic update
        if (isLiked) {
            setPost(p => ({ ...p, likes: p.likes.filter(l => l.user_id !== session.user.id) }))
            await supabase.from('likes').delete().match({ post_id: postId, user_id: session.user.id })
        } else {
            const newLike = { id: Date.now().toString(), post_id: postId, user_id: session.user.id }
            setPost(p => ({ ...p, likes: [...(p.likes || []), newLike] }))
            await supabase.from('likes').insert([{ post_id: postId, user_id: session.user.id }])
        }
    }

    const handleDoubleTap = () => {
        const isLiked = post?.likes?.some(l => l.user_id === session.user.id)
        setLikeAnimation(true)
        setTimeout(() => setLikeAnimation(false), 900)
        if (!isLiked) toggleLike()
    }

    const toggleSave = async () => {
        if (isSaved) {
            setIsSaved(false)
            await supabase.from('saved_posts').delete().match({ post_id: postId, user_id: session.user.id })
        } else {
            setIsSaved(true)
            await supabase.from('saved_posts').insert([{ post_id: postId, user_id: session.user.id }])
        }
    }

    const handleComment = async () => {
        if (!commentText.trim()) return
        setSubmitting(true)
        try {
            const { data } = await supabase
                .from('comments')
                .insert([{ post_id: postId, user_id: session.user.id, text: commentText.trim() }])
                .select('*, profiles(username, avatar_url)')
                .single()
            if (data) {
                setPost(p => ({ ...p, comments: [...(p.comments || []), data] }))
                setCommentText('')
                setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setSubmitting(false)
        }
    }

    const isLiked = post?.likes?.some(l => l.user_id === session.user.id)

    return (
        // Backdrop
        <div
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            {/* Modal Container */}
            <div
                className="relative bg-white dark:bg-[#1c1c1c] rounded-xl overflow-hidden w-full max-w-[940px] max-h-[90vh] flex flex-col md:flex-row shadow-2xl"
                style={{ animation: 'modalIn 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 dark:bg-white/10 dark:hover:bg-white/20 flex items-center justify-center text-white transition-colors md:hidden"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* Left: Image */}
                <div
                    className="w-full md:w-[55%] bg-black flex-shrink-0 flex items-center justify-center relative overflow-hidden"
                    style={{ minHeight: '320px', maxHeight: '90vh' }}
                    onDoubleClick={handleDoubleTap}
                >
                    {loading ? (
                        <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            <img
                                src={post?.image_url}
                                alt="post"
                                className="w-full h-full object-cover cursor-pointer select-none"
                                style={{ maxHeight: '90vh' }}
                            />
                            {/* Double-tap heart */}
                            <div className={`absolute pointer-events-none transition-all duration-300 transform ${likeAnimation ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>
                                <Heart className="w-24 h-24 text-white fill-white drop-shadow-2xl" />
                            </div>
                        </>
                    )}
                </div>

                {/* Right: Details */}
                <div className="flex-1 flex flex-col min-h-0 md:max-h-[90vh]">
                    {/* Header */}
                    <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-[#262626] flex-shrink-0">
                        {loading ? (
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
                                <div className="w-28 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                            </div>
                        ) : (
                            <Link
                                to={`/profile/${post?.profiles?.username}`}
                                onClick={onClose}
                                className="flex items-center gap-3 hover:opacity-80 group"
                            >
                                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden border border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0">
                                    {post?.profiles?.avatar_url ? (
                                        <img src={post.profiles.avatar_url} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-xs font-bold text-gray-500">{post?.profiles?.username?.[0]?.toUpperCase()}</span>
                                    )}
                                </div>
                                <span className="font-semibold text-[14px] text-black dark:text-[#f5f5f5] group-hover:underline">
                                    {post?.profiles?.username || 'Unknown'}
                                </span>
                            </Link>
                        )}
                        <div className="flex items-center gap-3">
                            <button className="text-black dark:text-white hover:text-gray-500 dark:hover:text-gray-400 transition-colors">
                                <MoreHorizontal className="w-5 h-5" />
                            </button>
                            {/* Desktop close button */}
                            <button
                                onClick={onClose}
                                className="hidden md:flex w-7 h-7 rounded-full hover:bg-gray-100 dark:hover:bg-[#363636] items-center justify-center text-black dark:text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </header>

                    {/* Comments Area */}
                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0 scrollbar-thin">
                        {loading ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="flex gap-3 animate-pulse">
                                        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full shrink-0" />
                                        <div className="flex-1 space-y-1.5">
                                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <>
                                {/* Caption as first "comment" */}
                                {post?.caption && (
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden border border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0">
                                            {post?.profiles?.avatar_url ? (
                                                <img src={post.profiles.avatar_url} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-xs font-bold text-gray-500">{post?.profiles?.username?.[0]?.toUpperCase()}</span>
                                            )}
                                        </div>
                                        <div className="flex-1 text-[14px] leading-[18px] text-black dark:text-[#f5f5f5]">
                                            <Link to={`/profile/${post?.profiles?.username}`} onClick={onClose} className="font-semibold hover:underline mr-1.5">
                                                {post?.profiles?.username}
                                            </Link>
                                            <span className="whitespace-pre-wrap break-words">{post.caption}</span>
                                            <div className="text-[11px] text-gray-400 mt-1">{timeAgo(post?.created_at)}</div>
                                        </div>
                                    </div>
                                )}

                                {/* Divider if there are comments */}
                                {post?.comments?.length > 0 && (
                                    <div className="border-t border-gray-100 dark:border-[#262626]" />
                                )}

                                {/* Comments list */}
                                {(post?.comments || []).map(comment => (
                                    <div key={comment.id} className="flex gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden border border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0">
                                            {comment.profiles?.avatar_url ? (
                                                <img src={comment.profiles.avatar_url} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-xs font-bold text-gray-500">{comment.profiles?.username?.[0]?.toUpperCase()}</span>
                                            )}
                                        </div>
                                        <div className="flex-1 text-[14px] leading-[18px] text-black dark:text-[#f5f5f5]">
                                            <Link to={`/profile/${comment.profiles?.username}`} onClick={onClose} className="font-semibold hover:underline mr-1.5">
                                                {comment.profiles?.username || 'Unknown'}
                                            </Link>
                                            <span className="whitespace-pre-wrap break-words">{comment.text}</span>
                                            <div className="text-[11px] text-gray-400 mt-1">{timeAgo(comment.created_at)}</div>
                                        </div>
                                    </div>
                                ))}
                                <div ref={commentsEndRef} />
                            </>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="border-t border-gray-200 dark:border-[#262626] px-4 pt-3 pb-2 flex-shrink-0">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex gap-4">
                                <button onClick={toggleLike} className="transition-transform active:scale-90">
                                    <Heart className={`w-[26px] h-[26px] transition-colors ${isLiked ? 'fill-[#ff3040] text-[#ff3040] stroke-none' : 'text-black dark:text-[#f5f5f5] hover:text-gray-500'}`} />
                                </button>
                                <button onClick={() => commentInputRef.current?.focus()} className="text-black dark:text-[#f5f5f5] hover:text-gray-500 dark:hover:text-gray-400 transition-colors">
                                    <MessageCircle className="w-[26px] h-[26px]" />
                                </button>
                                <button className="text-black dark:text-[#f5f5f5] hover:text-gray-500 dark:hover:text-gray-400 transition-colors">
                                    <Send className="w-[26px] h-[26px] -rotate-12 -translate-y-0.5" />
                                </button>
                            </div>
                            <button onClick={toggleSave} className="transition-transform active:scale-90">
                                <Bookmark className={`w-[26px] h-[26px] transition-colors ${isSaved ? 'fill-black dark:fill-[#f5f5f5] text-black dark:text-[#f5f5f5]' : 'text-black dark:text-[#f5f5f5] hover:text-gray-500'}`} />
                            </button>
                        </div>
                        {/* Likes count */}
                        <div className="font-semibold text-[14px] text-black dark:text-[#f5f5f5] mb-1">
                            {post?.likes?.length || 0} отметок «Нравится»
                        </div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-2">
                            {post && timeAgo(post.created_at)}
                        </div>
                    </div>

                    {/* Comment Input */}
                    <div className="border-t border-gray-200 dark:border-[#262626] px-4 py-3 flex items-center gap-3 flex-shrink-0">
                        <input
                            ref={commentInputRef}
                            type="text"
                            placeholder="Добавьте комментарий..."
                            value={commentText}
                            onChange={e => setCommentText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleComment() }}
                            className="flex-1 text-[14px] bg-transparent outline-none text-black dark:text-white placeholder-gray-400"
                        />
                        {commentText.trim() && (
                            <button
                                disabled={submitting}
                                onClick={handleComment}
                                className="text-[#0095f6] font-semibold text-[14px] shrink-0 disabled:opacity-50 hover:text-[#1877f2] transition-colors"
                            >
                                {submitting ? '...' : 'Опубликовать'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes modalIn {
                    from { opacity: 0; transform: scale(0.92); }
                    to   { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    )
}
