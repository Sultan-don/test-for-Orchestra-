import { Link, useLocation } from 'react-router-dom'
import { Home, Search, Compass, PlusSquare, Heart, User, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Navbar({ session }) {
    const location = useLocation()
    const username = session?.user?.user_metadata?.username

    const navLinks = [
        { path: '/', icon: Home, label: 'Главная', outlinedIcon: true },
        { path: '#', icon: Search, label: 'Поисковый запрос' },
        { path: '#', icon: Compass, label: 'Интересное' },
        { path: '/create', icon: PlusSquare, label: 'Создать' },
        { path: '#', icon: Heart, label: 'Уведомления' },
    ]

    return (
        <div className="sidebar fixed top-0 left-0 w-full bottom-0 bg-white dark:bg-black md:w-[244px] lg:w-[244px] xl:w-[300px] md:h-screen md:bottom-auto border-t md:border-t-0 md:border-r border-[#dbdbdb] dark:border-[#262626] z-50 flex flex-col transition-colors duration-200">

            {/* Desktop Brand */}
            <div className="hidden md:block p-6 pt-10 pb-8">
                <Link to="/">
                    <h1 className="text-2xl font-bold text-black dark:text-[#f5f5f5] tracking-wide" style={{ fontFamily: 'cursive' }}>
                        Ribbo
                    </h1>
                </Link>
            </div>

            {/* Mobile Brand */}
            <div className="md:hidden absolute top-0 left-0 w-full h-[60px] border-b border-[#dbdbdb] dark:border-[#262626] bg-white dark:bg-black px-4 flex items-center justify-between z-50 transition-colors">
                <Link to="/">
                    <h1 className="text-xl font-bold text-black dark:text-[#f5f5f5]" style={{ fontFamily: 'cursive' }}>
                        Ribbo
                    </h1>
                </Link>
                <div className="flex bg-[#efefef] dark:bg-[#262626] w-8 h-8 rounded-full items-center justify-center relative shadow-sm cursor-pointer hover:bg-[#dbdbdb] dark:hover:bg-[#363636] transition-colors">
                    <Heart className="w-5 h-5 text-black dark:text-white" strokeWidth={2} />
                    <div className="absolute top-0 right-0 w-2 h-2 bg-[#ff3040] rounded-full border-2 border-white dark:border-black"></div>
                </div>
            </div>

            {/* Nav Links */}
            <nav className="flex md:flex-col justify-around md:justify-start w-full md:flex-1 pt-2 md:pt-0 px-2 md:px-3 text-black dark:text-[#f5f5f5] bg-white dark:bg-black mt-auto md:mt-2 transition-colors">
                {navLinks.map(({ path, icon: Icon, label }) => {
                    const isActive = location.pathname === path
                    return (
                        <Link
                            key={label}
                            to={path}
                            className={`flex items-center p-3 my-1 rounded-lg group hover:bg-[#fafafa] dark:hover:bg-[#262626] transition-all w-full md:w-auto mt-0 md:mt-1
                                ${isActive ? 'font-bold' : 'font-normal hover:scale-[1.02] active:scale-95'}`}
                        >
                            <div className="flex items-center justify-center relative shrink-0 text-black dark:text-white">
                                <Icon className="w-[24px] h-[24px] md:w-[26px] md:h-[26px] group-hover:scale-110 transition-transform duration-200" strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            <span className="hidden xl:block ml-4 text-[16px] leading-[24px] group-hover:translate-x-1 transition-transform">
                                {label}
                            </span>
                        </Link>
                    )
                })}

                {/* Profile Link */}
                <Link
                    to={username ? `/profile/${username}` : '/profile'}
                    className={`flex items-center p-3 my-1 rounded-lg group hover:bg-[#fafafa] dark:hover:bg-[#262626] transition-all w-full md:w-auto active:scale-95
                        ${location.pathname.startsWith('/profile') ? 'font-bold' : 'font-normal'}`}
                >
                    <div className="w-[24px] h-[24px] md:w-[26px] md:h-[26px] rounded-full overflow-hidden border border-[#dbdbdb] dark:border-gray-500 bg-gray-200 flex items-center justify-center shrink-0">
                        {session?.user?.user_metadata?.avatar_url ? (
                            <img src={session.user.user_metadata.avatar_url} className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-4 h-4 text-gray-500" />
                        )}
                    </div>
                    <span className="hidden xl:block ml-4 text-[16px] leading-[24px] group-hover:translate-x-1 transition-transform dark:text-[#f5f5f5]">
                        Профиль
                    </span>
                </Link>
            </nav>

            {/* Expanded bottom margin for Mobile */}
            <div className="h-[20px] md:h-0 bg-white dark:bg-black transition-colors"></div>

            {/* Logout (Desktop Only) */}
            <div className="hidden md:block p-4 mt-auto">
                <button
                    onClick={() => supabase.auth.signOut()}
                    className="flex items-center p-3 rounded-lg group hover:bg-[#fafafa] dark:hover:bg-[#262626] text-black dark:text-[#f5f5f5] transition-all w-full active:scale-95"
                >
                    <LogOut className="w-[24px] h-[24px] group-hover:text-red-500 transition-colors" />
                    <span className="hidden xl:block ml-4 text-[16px]">Выход</span>
                </button>
            </div>

        </div>
    )
}
