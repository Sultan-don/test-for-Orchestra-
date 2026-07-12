import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Auth() {
    const [isLogin, setIsLogin] = useState(true)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [username, setUsername] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    // OTP State
    const [otpFlow, setOtpFlow] = useState(false)
    const [otpCode, setOtpCode] = useState('')

    const handleAuth = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({ email, password })
                if (error) throw error
            } else {
                const { data, error } = await supabase.auth.signUp({ email, password })
                if (error) throw error

                // If the user was returned but session is null, email confirmation is active
                if (data?.user && !data.session) {
                    setOtpFlow(true)
                } else if (data?.user && data.session) {
                    // Fallback just in case confirmation is disabled on Supabase end
                    const { error: profileError } = await supabase.from('profiles').insert([{ id: data.user.id, username }])
                    if (profileError) throw profileError
                }
            }
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const verifyOtp = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        try {
            const { data, error } = await supabase.auth.verifyOtp({
                email,
                token: otpCode,
                type: 'signup'
            })
            if (error) throw error

            // Insert profile after successful OTP registration confirmation
            if (data?.user) {
                const { error: profileError } = await supabase.from('profiles').insert([{ id: data.user.id, username }])
                if (profileError && profileError.code !== '23505') {
                    throw profileError
                }
            }
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#fafafa] dark:bg-black px-4 py-8 fade-in transition-colors duration-200">
            <div className="w-full max-w-[350px]">
                {/* Main Card */}
                <div className="bg-white dark:bg-black border border-[#dbdbdb] dark:border-[#262626] sm:rounded-sm p-8 pb-10 mb-3 text-center transition-colors">
                    <h1 className="text-4xl font-bold mb-10 pt-2 text-black dark:text-[#f5f5f5]" style={{ fontFamily: 'cursive' }}>
                        Ribbo
                    </h1>

                    {error && (
                        <div className="mb-4 text-center text-[#ff3040] text-[14px]">
                            {error}
                        </div>
                    )}

                    {!otpFlow ? (
                        <form onSubmit={handleAuth} className="space-y-2">
                            {!isLogin && (
                                <div>
                                    <input
                                        type="text"
                                        placeholder="Имя пользователя"
                                        required
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        className="w-full bg-[#fafafa] dark:bg-[#121212] border border-[#dbdbdb] dark:border-[#262626] text-[#262626] dark:text-[#f5f5f5] rounded-sm px-3 py-2.5 text-xs focus:outline-none focus:border-gray-400 dark:focus:border-gray-600"
                                    />
                                </div>
                            )}
                            <div>
                                <input
                                    type="email"
                                    placeholder="Электронный адрес"
                                    required
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full bg-[#fafafa] dark:bg-[#121212] border border-[#dbdbdb] dark:border-[#262626] text-[#262626] dark:text-[#f5f5f5] rounded-sm px-3 py-2.5 text-xs focus:outline-none focus:border-gray-400 dark:focus:border-gray-600"
                                />
                            </div>
                            <div>
                                <input
                                    type="password"
                                    placeholder="Пароль"
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full bg-[#fafafa] dark:bg-[#121212] border border-[#dbdbdb] dark:border-[#262626] text-[#262626] dark:text-[#f5f5f5] rounded-sm px-3 py-2.5 text-xs focus:outline-none focus:border-gray-400 dark:focus:border-gray-600"
                                />
                            </div>

                            <div className="pt-3">
                                <button disabled={loading || !password || !email || (!isLogin && !username)} className="bg-[#0095f6] hover:bg-[#1877f2] text-white font-semibold text-[14px] px-5 py-2 rounded-lg transition-colors w-full disabled:opacity-70 disabled:hover:bg-[#0095f6]">
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                                    ) : (
                                        isLogin ? 'Войти' : 'Регистрация'
                                    )}
                                </button>
                            </div>

                            {/* Divider */}
                            <div className="flex items-center gap-4 py-3 mt-4">
                                <div className="h-[1px] w-full bg-[#dbdbdb] dark:bg-[#262626]"></div>
                                <div className="text-[#a8a8a8] text-[13px] font-semibold tracking-wide">ИЛИ</div>
                                <div className="h-[1px] w-full bg-[#dbdbdb] dark:bg-[#262626]"></div>
                            </div>

                            {isLogin && (
                                <div className="text-center mt-3">
                                    <a href="#" className="text-xs text-[#00376b] dark:text-[#e0f1ff] hover:text-[#0095f6] transition-colors">Забыли пароль?</a>
                                </div>
                            )}
                        </form>
                    ) : (
                        <form onSubmit={verifyOtp} className="space-y-3 fade-in">
                            <p className="text-black dark:text-[#f5f5f5] text-[14px] mb-4">
                                Мы отправили 6-значный код подтверждения на почту <br /><b className="font-semibold">{email}</b>
                            </p>
                            <div>
                                <input
                                    type="text"
                                    placeholder="Введите проверочный код"
                                    required
                                    maxLength={8}
                                    value={otpCode}
                                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                                    className="w-full text-center tracking-[0.5em] font-bold text-lg bg-[#fafafa] dark:bg-[#121212] border border-[#dbdbdb] dark:border-[#262626] text-[#262626] dark:text-[#f5f5f5] rounded-sm px-3 py-3 focus:outline-none focus:border-gray-400 dark:focus:border-gray-600"
                                />
                            </div>
                            <div className="pt-2">
                                <button disabled={loading || otpCode.length < 6} className="bg-[#0095f6] hover:bg-[#1877f2] text-white font-semibold text-[14px] px-5 py-2 rounded-lg transition-colors w-full disabled:opacity-70 disabled:hover:bg-[#0095f6]">
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                                    ) : (
                                        'Подтвердить'
                                    )}
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={() => { setOtpFlow(false); setOtpCode('') }}
                                className="mt-4 text-[14px] text-[#0095f6] hover:text-[#00376b] dark:hover:text-[#e0f1ff] font-semibold"
                            >
                                Вернуться назад
                            </button>
                        </form>
                    )}
                </div>

                {/* Switch Login/Signup Box */}
                {!otpFlow && (
                    <div className="bg-white dark:bg-black border border-[#dbdbdb] dark:border-[#262626] sm:rounded-sm p-5 text-center text-[14px] transition-colors">
                        <span className="text-[#262626] dark:text-[#f5f5f5]">
                            {isLogin ? 'У вас нет аккаунта? ' : 'Есть аккаунт? '}
                        </span>
                        <button
                            onClick={() => { setIsLogin(!isLogin); setError(null) }}
                            className="font-semibold text-[#0095f6] hover:text-[#00376b] dark:hover:text-[#e0f1ff] transition-colors"
                        >
                            {isLogin ? 'Зарегистрироваться' : 'Вход'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
