'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import { processFile, processYoutubeUrl } from './actions'
import { FileText, Loader2, Upload, History, Trash2, LogOut, Sparkles, ChevronRight, Menu, X, Link, Youtube } from 'lucide-react'
import clsx from 'clsx'
import ReactMarkdown from 'react-markdown'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"

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
              {/* Main Upload Area */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#1A1A1A]/80 backdrop-blur-sm rounded-xl border border-white/5 relative overflow-hidden group">
              {/* Animated Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              
              <Tabs defaultValue="file" className="w-full max-w-xl mx-auto z-10">
                <TabsList className="grid w-full grid-cols-2 mb-8 bg-black/40 p-1 border border-white/10 rounded-lg">
                  <TabsTrigger value="file" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">
                    <p className="flex items-center gap-2"><Upload className="w-4 h-4" /> 파일 업로드</p>
                  </TabsTrigger>
                  <TabsTrigger value="link" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">
                    <p className="flex items-center gap-2"><Link className="w-4 h-4" /> 유튜브 링크</p>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="file" className="mt-0">
                  <div
                    {...getRootProps()}
                    className={clsx(
                      'w-full aspect-video rounded-xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center gap-6 cursor-pointer relative overflow-hidden',
                      isDragActive
                        ? 'border-indigo-500 bg-indigo-500/10 scale-[1.02]'
                        : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                    )}
                  >
                    <input {...getInputProps()} />
                    
                    <div className={clsx(
                      "w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-500",
                      isDragActive ? "bg-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.5)]" : "bg-gradient-to-br from-indigo-500 to-purple-500 shadow-xl"
                    )}>
                      <Upload className="w-10 h-10 text-white" />
                    </div>

                    <div className="text-center space-y-2 relative z-10">
                      <p className="text-xl font-medium text-white/90">
                        {isDragActive ? '파일을 놓아주세요' : '파일을 여기에 드래그하세요'}
                      </p>
                      <p className="text-sm text-white/50">
                        PDF, 이미지, 오디오, 비디오 지원 (최대 50MB)
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="link" className="mt-0">
                  <div className="w-full aspect-video rounded-xl border border-white/10 bg-black/20 flex flex-col items-center justify-center p-8 gap-6">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center shadow-xl mb-2">
                       <Youtube className="w-10 h-10 text-white" />
                    </div>
                    <div className="w-full space-y-4">
                      <div className="text-center space-y-1">
                        <h3 className="text-lg font-medium text-white">유튜브 영상 요약</h3>
                        <p className="text-sm text-white/50">영상 주소를 입력하면 자막을 분석하여 요약해 드립니다.</p>
                      </div>
                      <form onSubmit={async (e) => {
                        e.preventDefault();
                        const updateUrl = new FormData(e.currentTarget).get('url') as string;
                        if (!updateUrl) return;

                        setIsAnalyzing(true);
                        setSummary("");
                        
                        try {
                           // Use imported action
                           const { processYoutubeUrl } = await import('./actions'); 
                           const result = await processYoutubeUrl(updateUrl);
                           
                           if (!result.success) {
                             alert(result.error);
                             return;
                           }
                           
                           setSummary(result.summary);
                           await saveSummary(user.id, result.summary, result.fileName || 'YouTube Video');
                           // Refresh history
                           const { data } = await supabase.from('summaries').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
                           if (data) setHistory(data);

                        } catch (err: any) {
                          alert('Error processing URL: ' + err.message);
                        } finally {
                          setIsAnalyzing(false);
                        }
                      }} className="flex gap-2">
                         <input 
                           name="url"
                           type="url" 
                           placeholder="https://www.youtube.com/watch?v=..."
                           className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                           required
                         />
                         <Button type="submit" disabled={isAnalyzing} className="bg-white text-black hover:bg-white/90">
                            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : "요약하기"}
                         </Button>
                      </form>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Security Badge */}
              <div className="mt-8 flex items-center gap-2 text-xs text-white/30">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
                 엔터프라이즈급 보안 암호화
              </div>
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
