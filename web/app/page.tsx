'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import { processFile } from './actions'
import { FileText, Loader2, Upload, History, Trash2, LogOut, Sparkles, ChevronRight, Menu, X } from 'lucide-react'
import clsx from 'clsx'
import ReactMarkdown from 'react-markdown'
// I'll just render text with whitespace-pre-wrap for now or install react-markdown if needed later.
// For now, simple text display.

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const [history, setHistory] = useState<any[]>([])
  const [selectedHistory, setSelectedHistory] = useState<any>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Auth check
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
      } else {
        setUser(session.user)
        fetchHistory(session.user.id)
      }
      setLoading(false)
    }
    checkUser()
  }, [router])

  const fetchHistory = async (userId: string) => {
    const { data, error } = await supabase
      .from('summaries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (data) setHistory(data)
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return
    const file = acceptedFiles[0]
    setProcessing(true)
    setSummary(null)
    setSelectedHistory(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const result = await processFile(formData)
      if (result.success && result.summary) {
        setSummary(result.summary)
        
        // Save to Supabase
        if (user) {
          const { data, error } = await supabase.from('summaries').insert({
            user_id: user.id,
            file_name: file.name,
            file_type: file.type,
            summary: result.summary
          }).select().single()
          
          if (data) {
            setHistory([data, ...history])
            setSelectedHistory(data)
          }
        }
      } else {
        alert(result.error || "요약 생성에 실패했습니다")
      }
    } catch (e: any) {
      alert(e.message)
    } finally {
      setProcessing(false)
    }
  }, [user, history])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    maxFiles: 1,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
      'video/*': ['.mp4', '.mov']
    }
  })

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('정말 이 요약을 삭제하시겠습니까?')) return
    
    const { error } = await supabase.from('summaries').delete().eq('id', id)
    if (!error) {
      setHistory(history.filter(h => h.id !== id))
      if (selectedHistory?.id === id) {
        setSelectedHistory(null)
        setSummary(null)
      }
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-background text-foreground">
      <Loader2 className="animate-spin w-8 h-8 text-primary" />
    </div>
  )

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      {/* Abstract Background Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[100px]" />
      </div>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: sidebarOpen ? 300 : 0, opacity: sidebarOpen ? 1 : 0 }}
        className="glass border-r border-white/5 z-20 flex flex-col relative"
      >
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center space-x-2 overflow-hidden whitespace-nowrap">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="font-bold text-lg tracking-tight">NotebookLM</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">히스토리</div>
          {history.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-10 opacity-50">
              요약 기록이 없습니다
            </div>
          ) : (
            history.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => {
                  setSelectedHistory(item)
                  setSummary(item.summary)
                }}
                className={clsx(
                  "group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all border",
                  selectedHistory?.id === item.id 
                    ? "bg-primary/10 border-primary/20 text-primary" 
                    : "bg-secondary/30 border-transparent hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="flex items-center space-x-3 overflow-hidden">
                  <FileText className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm truncate w-full">{item.file_name}</span>
                </div>
                <button 
                  onClick={(e) => handleDelete(e, item.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </motion.div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-white/5">
          <button 
            onClick={handleSignOut}
            className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full p-2 rounded-lg hover:bg-white/5"
          >
            <LogOut className="w-4 h-4" />
            <span>로그아웃</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative z-10 w-full overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-white/5 flex items-center px-6 justify-between bg-background/50 backdrop-blur-sm">
          <div className="flex items-center">
            {!sidebarOpen && (
              <button 
                onClick={() => setSidebarOpen(true)}
                className="mr-4 p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <h2 className="font-medium text-lg">
              {selectedHistory ? selectedHistory.file_name : '대시보드'}
            </h2>
          </div>
          <div className="text-sm text-muted-foreground">
            {user?.email}
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10">
          <div className="max-w-4xl mx-auto space-y-8">
            
            {/* Upload Area */}
            {!summary && !processing && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div 
                  {...getRootProps()} 
                  className={clsx(
                    "border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 group bg-secondary/5",
                    isDragActive ? "border-primary bg-primary/5" : "border-white/10 hover:border-primary/50 hover:bg-white/5"
                  )}
                >
                  <input {...getInputProps()} />
                  <div className="w-16 h-16 rounded-full bg-secondary/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">파일을 여기에 놓으세요</h3>
                  <p className="text-muted-foreground mb-6 max-w-sm">
                    PDF, 이미지, 동영상 지원 <br/>
                    AI가 내용을 분석하고 요약해드립니다.
                  </p>
                  <button className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 font-medium">
                    파일 선택
                  </button>
                </div>
              </motion.div>
            )}

            {/* Processing State */}
            {processing && (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <h3 className="text-xl font-medium animate-pulse">Gemini가 내용을 분석 중입니다...</h3>
                <p className="text-muted-foreground mt-2">잠시만 기다려주세요.</p>
              </div>
            )}

            {/* Summary View */}
            {summary && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card min-h-[500px] flex flex-col"
              >
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">AI 요약</h3>
                      <p className="text-xs text-muted-foreground">Gemini 3 Flash (Preview) 생성</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setSummary(null); setSelectedHistory(null); }}
                    className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-all"
                  >
                    새 파일 업로드
                  </button>
                </div>
                
                <div className="prose prose-invert max-w-none text-muted-foreground leading-relaxed">
                  <ReactMarkdown>{summary}</ReactMarkdown>
                </div>
              </motion.div>
            )}

          </div>
        </div>
      </main>
    </div>
  )
}
