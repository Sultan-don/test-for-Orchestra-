import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Settings, Grid, Bookmark, Camera, LogOut, ChevronRight, ChevronLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Profile({ session, openModal }) {
    const { username } = useParams()
    const navigate = useNavigate()
    const [profile, setProfile] = useState(null)
    const [posts, setPosts] = useState([])
    const [savedPosts, setSavedPosts] = useState([])
    const [stories, setStories] = useState([])

    // Stats
    const [followersCount, setFollowersCount] = useState(0)
    const [followingCount, setFollowingCount] = useState(0)
    const [isFollowing, setIsFollowing] = useState(false)

    // UI State
    const [loading, setLoading] = useState(true)
    const [followLoading, setFollowLoading] = useState(false)
    const [activeTab, setActiveTab] = useState('posts') // 'posts' | 'saved'

    // Modals
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
    const [activeStoryIndex, setActiveStoryIndex] = useState(null)
    const [currentTheme, setCurrentTheme] = useState('light')

    // Forms & Refs
    const [editForm, setEditForm] = useState({ full_name: '', bio: '', website: '' })
    const [saving, setSaving] = useState(false)
    const avatarInputRef = useRef(null)
    const storyInputRef = useRef(null)

    const isOwnProfile = !username || username === session?.user?.user_metadata?.username || (profile && profile.id === session?.user?.id);

    useEffect(() => {
        fetchData()
        setCurrentTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light')
    }, [session, username])

    const fetchData = async () => {
        setLoading(true)
        try {
            let queryUser = username || session?.user?.user_metadata?.username
            let userId = session.user.id

            // 1. Get profile
            let currentProfile = null;
            if (queryUser) {
                const { data: p } = await supabase.from('profiles').select('*').eq('username', queryUser).single()
                if (p) {
                    currentProfile = p
                    userId = p.id
                }
            } else {
                const { data: p } = await supabase.from('profiles').select('*').eq('id', userId).single()
                if (p) currentProfile = p
            }

            if (!currentProfile) {
                setProfile(null)
                setLoading(false)
                return
            }

            setProfile(currentProfile)

            if (!isOwnProfile) {
                const { data: checkFollow } = await supabase.from('follows').select('*').match({
                    follower_id: session.user.id,
                    following_id: userId
                }).single()
                setIsFollowing(!!checkFollow)
            } else {
                setEditForm({
                    full_name: currentProfile.full_name || '',
                    bio: currentProfile.bio || '',
                    website: currentProfile.website || ''
                })
            }

            // 2. Data fetching (Parallel)
            const [postsRes, followersRes, followingRes, storiesRes] = await Promise.all([
                supabase.from('posts').select('*, likes(id)').eq('user_id', userId).order('created_at', { ascending: false }),
                supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
                supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
                supabase.from('stories').select('*').eq('user_id', userId).order('created_at', { ascending: true })
            ])

            setPosts(postsRes.data || [])
            setFollowersCount(followersRes.count || 0)
            setFollowingCount(followingRes.count || 0)
            setStories(storiesRes.data || [])

            // 3. Saved Posts
            if (isOwnProfile) {
                const { data: savedData } = await supabase.from('saved_posts')
                    .select('post_id, posts(*, likes(id))')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false })
                if (savedData) {
                    setSavedPosts(savedData.map(s => s.posts).filter(Boolean))
                }
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const toggleTheme = () => {
        const isDark = document.documentElement.classList.contains('dark')
        if (isDark) {
            document.documentElement.classList.remove('dark')
            localStorage.setItem('theme', 'light')
            setCurrentTheme('light')
        } else {
            document.documentElement.classList.add('dark')
            localStorage.setItem('theme', 'dark')
            setCurrentTheme('dark')
        }
    }

    const toggleFollow = async () => {
        if (!profile) return
        setFollowLoading(true)
        try {
            if (isFollowing) {
                await supabase.from('follows').delete().match({ follower_id: session.user.id, following_id: profile.id })
                setFollowersCount(prev => Math.max(0, prev - 1))
            } else {
                await supabase.from('follows').insert([{ follower_id: session.user.id, following_id: profile.id }])
                setFollowersCount(prev => prev + 1)
            }
            setIsFollowing(!isFollowing)
        } catch (err) {
            console.error(err)
        } finally {
            setFollowLoading(false)
        }
    }

    const handleSaveProfile = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            const { error } = await supabase.from('profiles').update({ ...editForm }).eq('id', session.user.id)
            if (error) throw error
            await fetchData()
            setIsEditModalOpen(false)
        } catch (err) {
            alert(err.message)
        } finally {
            setSaving(false)
        }
    }

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return
        try {
            setSaving(true)
            const filePath = `${session.user.id}/avatar-${Date.now()}.${file.name.split('.').pop()}`
            const { error: uploadError } = await supabase.storage.from('ribbo').upload(filePath, file)
            if (uploadError) throw uploadError
            const { data: { publicUrl } } = supabase.storage.from('ribbo').getPublicUrl(filePath)
            const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', session.user.id)
            if (updateError) throw updateError
            await fetchData()
        } catch (err) {
            alert(err.message)
        } finally {
            setSaving(false)
        }
    }

    const handleStoryUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return
        try {
            const filePath = `${session.user.id}/story-${Date.now()}.${file.name.split('.').pop()}`
            await supabase.storage.from('ribbo').upload(filePath, file)
            const { data: { publicUrl } } = supabase.storage.from('ribbo').getPublicUrl(filePath)
            await supabase.from('stories').insert([{ user_id: session.user.id, image_url: publicUrl }])
            await fetchData()
        } catch (err) {
            alert(err.message)
        }
    }

    if (loading) return (
        <div className="w-full max-w-[935px] mx-auto pt-8 px-4 flex justify-center">
            <div className="w-10 h-10 border-4 border-gray-200 dark:border-[#262626] border-t-gray-500 rounded-full animate-spin"></div>
        </div>
    )

    if (!profile) return <div className="text-center py-20 font-bold text-xl dark:text-white">Пользователь не найден</div>

    const displayGrid = activeTab === 'posts' ? posts : savedPosts;

    // REMOVED 'fade-in' FROM THE ROOT CLASS TO FIX MODAL OVERLAY STACKING CONTEXT ISSUE
    return (
        <div className="w-full max-w-[935px] mx-auto pt-8 px-0 sm:px-4 bg-white dark:bg-black text-black dark:text-[#f5f5f5] min-h-screen pb-16 md:pb-0 transition-colors">

            <header className="flex flex-col md:flex-row mb-12 md:px-0">
                <div className="shrink-0 flex justify-center md:mr-16 lg:mr-24 mb-6 md:mb-0 md:pl-6 w-[100px] md:w-[280px]">
                    <div
                        onClick={() => stories.length > 0 && setActiveStoryIndex(0)}
                        className={`w-[150px] h-[150px] rounded-full p-1 cursor-pointer transition-transform active:scale-95 ${stories.length > 0 ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500' : 'bg-transparent'}`}
                    >
                        <div className="w-full h-full rounded-full overflow-hidden border-4 border-white dark:border-black bg-gray-50 dark:bg-gray-900 flex items-center justify-center relative">
                            {profile.avatar_url ? (
                                <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-5xl font-light text-gray-400">{profile.username?.[0]?.toUpperCase()}</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex flex-col px-4 md:px-0">
                    <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-5 mb-5 pl-1">
                        <h2 className="text-xl md:text-[20px] font-medium leading-tight">{profile.username}</h2>
                        <div className="flex items-center gap-2">
                            {isOwnProfile ? (
                                <>
                                    <button onClick={() => setIsEditModalOpen(true)} className="bg-[#efefef] dark:bg-[#363636] hover:bg-[#dbdbdb] dark:hover:bg-[#262626] text-[#000] dark:text-[#f5f5f5] font-semibold text-[14px] px-4 py-1.5 rounded-lg transition-colors leading-[18px]">
                                        Редактировать профиль
                                    </button>
                                    <button className="bg-[#efefef] dark:bg-[#363636] hover:bg-[#dbdbdb] dark:hover:bg-[#262626] text-[#000] dark:text-[#f5f5f5] font-semibold text-[14px] px-4 py-1.5 rounded-lg transition-colors leading-[18px] hidden sm:block">
                                        Посмотреть архив
                                    </button>
                                    <button onClick={() => setIsSettingsModalOpen(true)} className="p-1 hover:text-gray-500 dark:hover:text-gray-400">
                                        <Settings className="w-[24px] h-[24px]" />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button onClick={toggleFollow} disabled={followLoading} className={`font-semibold text-[14px] px-5 py-1.5 rounded-lg transition-colors leading-[18px] ${isFollowing ? 'bg-[#efefef] dark:bg-[#363636] hover:bg-[#dbdbdb] dark:hover:bg-[#262626] text-black dark:text-white' : 'bg-[#0095f6] hover:bg-[#1877f2] text-white'}`}>
                                        {isFollowing ? 'Подписки' : 'Подписаться'}
                                    </button>
                                    <button className="bg-[#efefef] dark:bg-[#363636] hover:bg-[#dbdbdb] dark:hover:bg-[#262626] text-[#000] dark:text-[#f5f5f5] font-semibold text-[14px] px-4 py-1.5 rounded-lg transition-colors leading-[18px]">
                                        Отправить сообщение
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="hidden md:flex gap-10 mb-5 pl-1 text-[16px]">
                        <div><span className="font-semibold">{posts.length}</span> публикаций</div>
                        <div className="cursor-pointer"><span className="font-semibold">{followersCount}</span> подписчиков</div>
                        <div className="cursor-pointer"><span className="font-semibold">{followingCount}</span> подписок</div>
                    </div>

                    <div className="hidden md:block pl-1 text-[14px] leading-[20px] max-w-[400px]">
                        {profile.full_name && <div className="font-semibold">{profile.full_name}</div>}
                        {profile.bio && <div className="whitespace-pre-wrap">{profile.bio}</div>}
                        {profile.website && (
                            <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noopener noreferrer" className="text-[#00376b] dark:text-[#e0f1ff] hover:underline font-semibold mt-1 inline-flex items-center break-all">
                                🔗 {profile.website.replace(/^https?:\/\//, '')}
                            </a>
                        )}
                    </div>
                </div>
            </header>

            {/* Mobile Bio */}
            <div className="md:hidden">
                <div className="px-4 mb-6 text-[14px] leading-[20px]">
                    {profile.full_name && <div className="font-semibold">{profile.full_name}</div>}
                    {profile.bio && <div className="whitespace-pre-wrap">{profile.bio}</div>}
                    {profile.website && (
                        <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noopener noreferrer" className="text-[#00376b] dark:text-[#e0f1ff] hover:underline font-semibold mt-1 inline-flex items-center break-all">
                            🔗 {profile.website.replace(/^https?:\/\//, '')}
                        </a>
                    )}
                </div>
                <div className="flex justify-around py-3 border-t border-gray-300 dark:border-[#262626] text-[14px] text-center">
                    <div><span className="font-semibold block">{posts.length}</span> <span className="text-gray-500 dark:text-gray-400">публикаций</span></div>
                    <div><span className="font-semibold block">{followersCount}</span> <span className="text-gray-500 dark:text-gray-400">подписчиков</span></div>
                    <div><span className="font-semibold block">{followingCount}</span> <span className="text-gray-500 dark:text-gray-400">подписок</span></div>
                </div>
            </div>

            <div className="px-4 md:px-0 md:ml-[150px] flex gap-4 mb-10 overflow-x-auto pb-2 items-center">
                {stories.map((story, i) => (
                    <div key={story.id} className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => setActiveStoryIndex(i)}>
                        <div className="w-[77px] h-[77px] rounded-full border border-gray-300 dark:border-[#262626] p-0.5">
                            <img src={story.image_url} alt="story" className="w-full h-full rounded-full object-cover" />
                        </div>
                    </div>
                ))}
                {isOwnProfile && (
                    <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => storyInputRef.current?.click()}>
                        <div className="w-[77px] h-[77px] rounded-full border border-gray-300 dark:border-[#262626] p-0.5 group-hover:border-gray-400 dark:group-hover:border-gray-500 transition-colors">
                            <div className="w-full h-full bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center">
                                <span className="text-gray-300 dark:text-gray-600 text-4xl mb-1">+</span>
                            </div>
                        </div>
                        <input type="file" accept="image/*" ref={storyInputRef} onChange={handleStoryUpload} className="hidden" />
                    </div>
                )}
            </div>

            <div className="flex border-t border-gray-300 dark:border-[#262626]">
                <div className="w-full flex justify-center uppercase text-[12px] font-semibold tracking-widest text-[#737373] dark:text-[#a8a8a8]">
                    <div className="flex gap-14 list-none m-0 p-0">
                        <div onClick={() => setActiveTab('posts')} className={`flex items-center gap-2 py-4 border-t cursor-pointer transition-colors ${activeTab === 'posts' ? 'border-gray-800 dark:border-[#f5f5f5] text-gray-800 dark:text-[#f5f5f5]' : 'border-transparent hover:text-gray-500 dark:hover:text-gray-300'}`}>
                            <Grid className="w-3 h-3" /> <span>Публикации</span>
                        </div>
                        {isOwnProfile && (
                            <div onClick={() => setActiveTab('saved')} className={`flex items-center gap-2 py-4 border-t cursor-pointer transition-colors ${activeTab === 'saved' ? 'border-gray-800 dark:border-[#f5f5f5] text-gray-800 dark:text-[#f5f5f5]' : 'border-transparent hover:text-gray-500 dark:hover:text-gray-300'}`}>
                                <Bookmark className="w-3 h-3" /> <span>Сохраненное</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-1 md:gap-4 mt-1 md:mt-2 pb-20">
                {displayGrid.map(post => (
                    <div
                        key={post.id}
                        onClick={() => openModal && openModal(post.id)}
                        className="aspect-square bg-gray-200 dark:bg-gray-800 group relative cursor-pointer overflow-hidden rounded-[2px] md:rounded-sm"
                    >
                        <img src={post.image_url} alt="post" className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" />
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-4">
                            <span className="text-white font-semibold text-sm flex items-center gap-1">
                                ❤️ {post.likes?.length || 0}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Settings Modal (Fixed Overlay) */}
            {isSettingsModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4" onClick={() => setIsSettingsModalOpen(false)}>
                    <div className="bg-white dark:bg-[#262626] rounded-xl w-full max-w-[400px] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 text-black dark:text-[#f5f5f5]" onClick={e => e.stopPropagation()}>
                        <button onClick={toggleTheme} className="w-full py-3.5 border-b border-gray-200 dark:border-gray-700 text-[14px] hover:bg-gray-50 dark:hover:bg-[#363636] transition-colors">
                            {currentTheme === 'dark' ? 'Включить светлую тему' : 'Включить темную тему'}
                        </button>
                        <button onClick={() => supabase.auth.signOut()} className="w-full py-3.5 border-b border-gray-200 dark:border-gray-700 text-[14px] font-bold text-red-500 hover:bg-gray-50 dark:hover:bg-[#363636] transition-colors">Выйти</button>
                        <button onClick={() => setIsSettingsModalOpen(false)} className="w-full py-3.5 text-[14px] hover:bg-gray-50 dark:hover:bg-[#363636] transition-colors">Отмена</button>
                    </div>
                </div>
            )}

            {/* Edit Profile Modal (Fixed Overlay) */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#262626] rounded-xl shadow-xl w-full max-w-[500px] overflow-hidden flex flex-col text-black dark:text-[#f5f5f5]">
                        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="font-bold text-lg">Редактировать профиль</h2>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white text-xl font-bold">✕</button>
                        </div>
                        <div className="p-6">
                            <div className="bg-gray-100 dark:bg-[#1a1a1a] rounded-xl p-4 flex items-center justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-[50px] h-[50px] rounded-full overflow-hidden bg-gray-300 dark:bg-gray-700">
                                        {profile.avatar_url && <img src={profile.avatar_url} className="w-full h-full object-cover" />}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-sm">{profile.username}</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">Изменить фото профиля</div>
                                    </div>
                                </div>
                                <button onClick={() => avatarInputRef.current?.click()} className="bg-[#0095f6] hover:bg-[#1877f2] text-white font-semibold text-sm px-4 py-1.5 rounded-lg">Изменить</button>
                                <input type="file" accept="image/*" ref={avatarInputRef} onChange={handleAvatarUpload} className="hidden" />
                            </div>

                            <form onSubmit={handleSaveProfile} className="space-y-4">
                                <div>
                                    <label className="block font-semibold mb-1 text-sm">Имя</label>
                                    <input className="w-full bg-gray-50 dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm focus:outline-none" value={editForm.full_name} onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block font-semibold mb-1 text-sm">О себе (Bio)</label>
                                    <textarea className="w-full bg-gray-50 dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm h-[100px] resize-none focus:outline-none" value={editForm.bio} onChange={e => setEditForm({ ...editForm, bio: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block font-semibold mb-1 text-sm">Веб-сайт</label>
                                    <input className="w-full bg-gray-50 dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm focus:outline-none" value={editForm.website} onChange={e => setEditForm({ ...editForm, website: e.target.value })} />
                                </div>
                                <div className="pt-4 flex justify-end">
                                    <button disabled={saving} className="bg-[#0095f6] hover:bg-[#1877f2] text-white font-semibold text-sm px-6 py-2 rounded-lg" type="submit">
                                        {saving ? 'Сохранение...' : 'Готово'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Story Viewer Modal */}
            {activeStoryIndex !== null && stories[activeStoryIndex] && (
                <div className="fixed inset-0 bg-black z-[200] flex flex-col animate-in fade-in duration-200">
                    <div className="p-4 flex justify-between items-center z-10 absolute top-0 w-full bg-gradient-to-b from-black/50 to-transparent text-white">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-500">
                                {profile.avatar_url && <img src={profile.avatar_url} className="w-full h-full object-cover" />}
                            </div>
                            <span className="font-semibold text-sm">{profile.username}</span>
                        </div>
                        <button onClick={() => setActiveStoryIndex(null)} className="text-white hover:text-gray-300 text-3xl font-light">&times;</button>
                    </div>
                    <div className="flex-1 flex justify-between items-center relative">
                        {activeStoryIndex > 0 ? <button onClick={() => setActiveStoryIndex(prev => prev - 1)} className="p-4 text-white z-10 hidden sm:block"><ChevronLeft className="w-8 h-8" /></button> : <div className="w-16"></div>}
                        <div className="h-full w-full max-w-[500px] mx-auto bg-[#1a1a1a] sm:rounded-lg overflow-hidden flex items-center justify-center relative shadow-2xl">
                            <img src={stories[activeStoryIndex].image_url} className="w-full h-full object-cover" />
                            <div className="absolute inset-y-0 left-0 w-1/3 z-10" onClick={() => activeStoryIndex > 0 && setActiveStoryIndex(prev => prev - 1)}></div>
                            <div className="absolute inset-y-0 right-0 w-1/3 z-10" onClick={() => { activeStoryIndex < stories.length - 1 ? setActiveStoryIndex(prev => prev + 1) : setActiveStoryIndex(null) }}></div>
                        </div>
                        {activeStoryIndex < stories.length - 1 ? <button onClick={() => setActiveStoryIndex(prev => prev + 1)} className="p-4 text-white z-10 hidden sm:block"><ChevronRight className="w-8 h-8" /></button> : <div className="w-16"></div>}
                    </div>
                </div>
            )}
        </div>
    )
}
