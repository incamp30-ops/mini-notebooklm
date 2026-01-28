'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { LogIn, UserPlus, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        alert('이메일 인증 링크를 확인해주세요!')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        router.push('/')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Abstract Background */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-900/30 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-900/20 rounded-full blur-[100px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full glass-card relative z-10"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 gradient-text">Mini NotebookLM</h1>
          <p className="text-muted-foreground">AI 기반 문서 요약 및 분석 서비스</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 ml-1 text-muted-foreground">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-secondary/50 border border-white/10 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-600"
              placeholder="hello@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 ml-1 text-muted-foreground">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-secondary/50 border border-white/10 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-600"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg border border-red-900/50">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-lg flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : mode === 'signin' ? (
              <>
                <LogIn className="w-4 h-4 mr-2" /> 로그인
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" /> 회원가입
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          {mode === 'signin' ? "계정이 없으신가요? " : "이미 계정이 있으신가요? "}
          <button
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="text-primary hover:text-primary/80 font-medium hover:underline transition-all"
          >
            {mode === 'signin' ? '회원가입' : '로그인'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
