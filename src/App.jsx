import { useState, useEffect, useCallback } from 'react'
import { Routes, Route } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Navbar from './components/Navbar'
import Auth from './pages/Auth'
import Feed from './pages/Feed'
import Profile from './pages/Profile'
import CreatePost from './pages/CreatePost'
import PostModal from './components/PostModal'

export default function App() {
    const [session, setSession] = useState(null)
    const [loading, setLoading] = useState(true)
    const [selectedPostId, setSelectedPostId] = useState(null)

    const openModal = useCallback((postId) => setSelectedPostId(postId), [])
    const closeModal = useCallback(() => setSelectedPostId(null), [])

    useEffect(() => {
        // Theme initialization
        const savedTheme = localStorage.getItem('theme') || 'light'
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark')
        }

        // Auth
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            setLoading(false)
        })
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setSession(session))
        return () => subscription.unsubscribe()
    }, [])

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-white dark:bg-black text-black dark:text-white">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black dark:border-white"></div>
        </div>
    )

    if (!session) return <Auth />

    return (
        <div className="flex bg-white dark:bg-black text-black dark:text-[#f5f5f5] min-h-screen transition-colors duration-200">
            {/* Sidebar / Bottom Bar */}
            <Navbar session={session} />

            {/* Main Content Area */}
            <main className="main-content flex-1 md:ml-[244px] lg:ml-[244px] xl:ml-[300px] w-full min-h-screen border-l border-gray-200 dark:border-[#262626] transition-colors duration-200">
                <div className="max-w-[800px] mx-auto w-full h-full">
                    <Routes>
                        <Route path="/" element={<Feed session={session} openModal={openModal} />} />
                        <Route path="/create" element={<CreatePost session={session} />} />
                        <Route path="/profile" element={<Profile session={session} openModal={openModal} />} />
                        <Route path="/profile/:username" element={<Profile session={session} openModal={openModal} />} />
                    </Routes>
                </div>
            </main>

            {/* Global Post Modal */}
            {selectedPostId && (
                <PostModal
                    postId={selectedPostId}
                    session={session}
                    onClose={closeModal}
                />
            )}
        </div>
    )
}
