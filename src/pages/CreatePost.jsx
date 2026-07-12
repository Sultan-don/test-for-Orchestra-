import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ImagePlus, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function CreatePost({ session }) {
    const navigate = useNavigate()
    const [file, setFile] = useState(null)
    const [preview, setPreview] = useState(null)
    const [caption, setCaption] = useState('')
    const [loading, setLoading] = useState(false)

    const handleFile = (e) => {
        const f = e.target.files[0]
        setFile(f)
        if (f) setPreview(URL.createObjectURL(f))
    }

    const handleUpload = async (e) => {
        e.preventDefault()
        if (!file) return
        setLoading(true)

        try {
            const fileExt = file.name.split('.').pop()
            const filePath = `${session.user.id}/${Math.random()}.${fileExt}`

            const { error: uploadError } = await supabase.storage.from('ribbo').upload(filePath, file)
            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage.from('ribbo').getPublicUrl(filePath)

            const { error: dbError } = await supabase.from('posts').insert([{ user_id: session.user.id, image_url: publicUrl, caption }])
            if (dbError) throw dbError

            navigate('/')
        } catch (err) {
            alert('Ошибка загрузки: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-[80vh] px-4 py-8 fade-in bg-white dark:bg-black transition-colors">
            <div className="w-full max-w-[600px] bg-white dark:bg-[#262626] rounded-xl overflow-hidden flex flex-col border border-gray-300 dark:border-[#363636] shadow-sm transition-colors">

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-300 dark:border-[#363636]">
                    <h2 className="font-semibold text-center flex-1 text-black dark:text-[#f5f5f5]">Создать новую публикацию</h2>
                    {preview && (
                        <button
                            onClick={handleUpload}
                            disabled={loading}
                            className="font-semibold text-[#0095f6] hover:text-[#00376b] dark:hover:text-[#e0f1ff] transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Публикация...' : 'Поделиться'}
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="flex flex-col md:flex-row min-h-[400px]">

                    {/* Image Area */}
                    <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] md:border-r border-gray-300 dark:border-[#363636] relative bg-[#fafafa] dark:bg-black transition-colors">
                        {preview ? (
                            <div className="w-full h-full absolute inset-0 group">
                                <img src={preview} alt="preview" className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => { setFile(null); setPreview(null) }}
                                    className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 backdrop-blur transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-6 text-center">
                                <ImagePlus className="w-20 h-20 text-black dark:text-white mb-4" strokeWidth={1.5} />
                                <h3 className="text-xl font-light text-black dark:text-white mb-6 tracking-wide">Перетащите фото сюда</h3>
                                <label className="bg-[#0095f6] hover:bg-[#1877f2] text-white font-semibold text-sm px-6 py-2 rounded-lg cursor-pointer transition-colors">
                                    Выбрать на компьютере
                                    <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
                                </label>
                            </div>
                        )}
                    </div>

                    {/* Caption Area */}
                    {preview && (
                        <div className="w-full md:w-[340px] flex flex-col bg-white dark:bg-[#262626] transition-colors">
                            <div className="p-4 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center text-gray-500 font-bold text-xs shrink-0 border border-gray-200 dark:border-gray-600">
                                    {session?.user?.user_metadata?.avatar_url ? (
                                        <img src={session.user.user_metadata.avatar_url} className="w-full h-full object-cover" />
                                    ) : (
                                        session?.user?.user_metadata?.username?.[0]?.toUpperCase() || 'U'
                                    )}
                                </div>
                                <span className="font-semibold text-black dark:text-[#f5f5f5]">
                                    {session?.user?.user_metadata?.username || 'user'}
                                </span>
                            </div>
                            <div className="flex-1 px-4 pb-4">
                                <textarea
                                    placeholder="Добавьте подпись..."
                                    value={caption}
                                    onChange={e => setCaption(e.target.value)}
                                    className="w-full h-[200px] bg-transparent text-black dark:text-[#f5f5f5] placeholder-gray-500 focus:outline-none resize-none"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
