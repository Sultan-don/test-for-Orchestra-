import { useState, useEffect } from 'react'
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function timeAgo(dateString) {
    const now = new Date()
    const past = new Date(dateString)
    const diffMs = now - past
    const diffMins = Math.round(diffMs / 60000)
    const diffHrs = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHrs / 24)

    if (diffMins < 1) return 'ТОЛЬКО ЧТО'
    if (diffMins < 60) return `${diffMins} МИНУТ НАЗАД`
    if (diffHrs < 24) return `${diffHrs} ЧАСОВ НАЗАД`
    return `${diffDays} ДНЕЙ НАЗАД`
}

export default function Feed({ session, openModal }) {
    const [posts, setPosts] = useState([])
    const [savedPostIds, setSavedPostIds] = useState([])
    const [loading, setLoading] = useState(true)
    const [likeAnimation, setLikeAnimation] = useState(null)
    const [likeTimeout, setLikeTimeout] = useState(null)

    // Comments state: { [postId]: 'text' }
    const [commentInputs, setCommentInputs] = useState({})
    const [submittingComment, setSubmittingComment] = useState(false)

    useEffect(() => {
        fetchPosts()
    }, [])

    const fetchPosts = async () => {
        try {
            const { data: postsData } = await supabase.from('posts').select('*').order('created_at', { ascending: false })
            const userIds = [...new Set((postsData || []).map(p => p.user_id))]

            let profilesMap = {}
            if (userIds.length > 0) {
                const { data: profilesData } = await supabase.from('profiles').select('*').in('id', userIds)
                    ; (profilesData || []).forEach(p => { profilesMap[p.id] = p })
            }

            const { data: likesData } = await supabase.from('likes').select('*')
            const { data: savedData } = await supabase.from('saved_posts').select('post_id').eq('user_id', session.user.id)
            const { data: commentsData } = await supabase.from('comments').select('*, profiles(username, avatar_url)').order('created_at', { ascending: true })

            setSavedPostIds(savedData?.map(s => s.post_id) || [])

            const merged = (postsData || []).map(post => ({
                ...post,
                profiles: profilesMap[post.user_id] || null,
                likes: (likesData || []).filter(l => l.post_id === post.id),
                comments: (commentsData || []).filter(c => c.post_id === post.id)
            }))

            setPosts(merged)
        } catch (error) {
            console.error('Error fetching posts:', error)
        } finally {
            setLoading(false)
        }
    }

    const toggleLike = async (postId, isLiked) => {
        try {
            if (isLiked) {
                await supabase.from('likes').delete().match({ post_id: postId, user_id: session.user.id })
            } else {
                await supabase.from('likes').insert([{ post_id: postId, user_id: session.user.id }])
            }
            await fetchPosts()
        } catch (error) {
            console.error('Error toggling like:', error)
        }
    }

    const handleDoubleTap = (postId, isLiked) => {
        if (likeTimeout) clearTimeout(likeTimeout)
        setLikeAnimation(postId)
        const t = setTimeout(() => setLikeAnimation(null), 1000)
        setLikeTimeout(t)

        if (!isLiked) {
            toggleLike(postId, false)
        }
    }

    const toggleSave = async (postId, isSaved) => {
        try {
            if (isSaved) {
                setSavedPostIds(savedPostIds.filter(id => id !== postId))
                await supabase.from('saved_posts').delete().match({ post_id: postId, user_id: session.user.id })
            } else {
                setSavedPostIds([...savedPostIds, postId])
                await supabase.from('saved_posts').insert([{ post_id: postId, user_id: session.user.id }])
            }
        } catch (err) {
            console.error(err)
        }
    }

    const handlePostComment = async (postId) => {
        const text = commentInputs[postId]
        if (!text || text.trim() === '') return

        setSubmittingComment(true)
        try {
            await supabase.from('comments').insert([{
                post_id: postId,
                user_id: session.user.id,
                text: text.trim()
            }])
            setCommentInputs(prev => ({ ...prev, [postId]: '' }))
            await fetchPosts()
        } catch (err) {
            console.error(err)
        } finally {
            setSubmittingComment(false)
        }
    }

    if (loading) return (
        <div className="space-y-8 py-8 w-full max-w-[470px] mx-auto opacity-50">
            {[1, 2].map(i => (
                <div key={i} className="animate-pulse bg-white dark:bg-black w-full rounded-sm border border-gray-200 dark:border-gray-800 p-4">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-800 rounded-full"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-800 w-32 rounded"></div>
                    </div>
                    <div className="w-full aspect-square bg-gray-200 dark:bg-gray-800 rounded-sm"></div>
                </div>
            ))}
        </div>
    )

    if (posts.length === 0) return (
        <div className="text-center py-20 text-gray-500 dark:text-gray-400 font-semibold text-lg">
            Нет постов для отображения
        </div>
    )

    return (
        <div className="flex justify-center pt-[30px] pb-20 w-full bg-white dark:bg-black transition-colors duration-200">
            <div className="w-full max-w-[470px] space-y-4">
                {posts.map(post => {
                    const isLiked = post.likes?.some(like => like.user_id === session.user.id)
                    const isSaved = savedPostIds.includes(post.id)

                    return (
                        <article key={post.id} className="pb-4 border-b border-[#dbdbdb] dark:border-[#262626] last:border-0 mb-4 bg-white dark:bg-black rounded-lg transition-colors">

                            {/* Header */}
                            <header className="flex items-center justify-between px-1 py-3">
                                <Link to={`/profile/${post.profiles?.username}`} className="flex items-center gap-3 hover:opacity-80 group">
                                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden flex items-center justify-center shrink-0">
                                        {post.profiles?.avatar_url ? (
                                            <img src={post.profiles.avatar_url} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-xs font-bold text-gray-500">{post.profiles?.username?.[0]?.toUpperCase()}</span>
                                        )}
                                    </div>
                                    <span className="font-semibold text-[14px] text-black dark:text-[#f5f5f5] group-hover:underline">
                                        {post.profiles?.username || 'Unknown'}
                                    </span>
                                </Link>
                                <button className="text-black dark:text-[#f5f5f5] hover:text-gray-500 dark:hover:text-gray-400">
                                    <MoreHorizontal className="w-5 h-5" />
                                </button>
                            </header>

                            {/* Image with Double Tap */}
                            <div
                                className="w-full bg-black rounded-sm border border-[#efefef] dark:border-[#262626] flex items-center justify-center aspect-[4/5] sm:aspect-square relative overflow-hidden group cursor-pointer"
                                onDoubleClick={() => handleDoubleTap(post.id, isLiked)}
                            >
                                <img
                                    src={post.image_url}
                                    alt="post"
                                    className="w-full h-full object-cover"
                                    onClick={() => openModal && openModal(post.id)}
                                />
                                <div className={`absolute pointer-events-none transition-all duration-300 transform ${likeAnimation === post.id ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>
                                    <Heart className="w-24 h-24 text-white fill-white drop-shadow-2xl" />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="px-1 py-3">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex gap-4">
                                        <button onClick={() => toggleLike(post.id, isLiked)} className={`hover:text-gray-500 dark:hover:text-gray-400 transition-transform ${isLiked ? 'hover:scale-110 active:scale-95' : ''}`}>
                                            <Heart className={`w-[26px] h-[26px] ${isLiked ? 'fill-[#ff3040] text-[#ff3040] stroke-none' : 'text-black dark:text-[#f5f5f5]'}`} />
                                        </button>
                                        <button className="text-black dark:text-[#f5f5f5] hover:text-gray-500 dark:hover:text-gray-400 cursor-pointer">
                                            <MessageCircle className="w-[26px] h-[26px]" />
                                        </button>
                                        <button className="text-black dark:text-[#f5f5f5] hover:text-gray-500 dark:hover:text-gray-400">
                                            <Send className="w-[26px] h-[26px] -rotate-12 transform -translate-y-0.5" />
                                        </button>
                                    </div>
                                    <button onClick={() => toggleSave(post.id, isSaved)} className="text-black dark:text-[#f5f5f5] hover:text-gray-500 dark:hover:text-gray-400 hover:scale-110 transition-transform">
                                        <Bookmark className={`w-[26px] h-[26px] ${isSaved ? 'fill-black dark:fill-[#f5f5f5]' : ''}`} />
                                    </button>
                                </div>

                                {/* Likes */}
                                <div className="font-semibold text-[14px] text-black dark:text-[#f5f5f5] mb-2 leading-[18px]">
                                    {post.likes?.length || 0} отметок "Нравится"
                                </div>

                                {/* Caption */}
                                <div className="text-[14px] leading-[18px] text-black dark:text-[#f5f5f5] mb-2 flex">
                                    <span className="font-semibold mr-1.5 shrink-0 hover:underline cursor-pointer">
                                        <Link to={`/profile/${post.profiles?.username}`}>{post.profiles?.username || 'Unknown'}</Link>
                                    </span>
                                    <span className="whitespace-pre-wrap break-words inline">{post.caption}</span>
                                </div>

                                {/* Comments Section */}
                                {post.comments && post.comments.length > 0 && (
                                    <div className="mb-2">
                                        <div className="text-gray-500 dark:text-gray-400 text-[14px] mb-1 cursor-pointer">
                                            {post.comments.length > 2 ? `Посмотреть все комментарии (${post.comments.length})` : ''}
                                        </div>
                                        {post.comments.slice(-2).map(comment => (
                                            <div key={comment.id} className="text-[14px] leading-[18px] text-black dark:text-[#f5f5f5] mb-1 flex">
                                                <span className="font-semibold mr-1.5 shrink-0 hover:underline cursor-pointer">
                                                    <Link to={`/profile/${comment.profiles?.username}`}>{comment.profiles?.username || 'Unknown'}</Link>
                                                </span>
                                                <span className="whitespace-pre-wrap break-words">{comment.text}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Date */}
                                <div className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold tracking-wide uppercase mb-3">
                                    {timeAgo(post.created_at)}
                                </div>

                                {/* Add Comment Input */}
                                <div className="border-t border-[#efefef] dark:border-[#262626] pt-3 flex items-center">
                                    <input
                                        type="text"
                                        placeholder="Добавьте комментарий..."
                                        value={commentInputs[post.id] || ''}
                                        onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handlePostComment(post.id) }}
                                        className="w-full text-[14px] bg-transparent outline-none text-black dark:text-white placeholder-gray-500"
                                    />
                                    {(commentInputs[post.id] || '').trim() !== '' && (
                                        <button
                                            disabled={submittingComment}
                                            onClick={() => handlePostComment(post.id)}
                                            className="text-[#0095f6] font-semibold text-[14px] shrink-0 ml-2 disabled:opacity-50"
                                        >
                                            Опубликовать
                                        </button>
                                    )}
                                </div>

                            </div>
                        </article>
                    )
                })}
            </div>
        </div>
    )
}
