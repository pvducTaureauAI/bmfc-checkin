// Login.tsx
import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { supabase } from '../utils/supabase'
import { useNavigate } from 'react-router'
import useAuth from '../hooks/useAuth'

const Login = () => {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/', { replace: true })
    }
  }, [authLoading, navigate, user])

  const loginHandler = async (username: string, password: string) => {
    try {
      setLoading(true)
      const res = await supabase.auth.signInWithPassword({
        email: username,
        password: password,
      })

      if (res.error) {
        toast.error('Đăng nhập thất bại! Sai tài khoản hoặc mật khẩu.')
      } else {
        toast.success('Chào mừng Admin BMFC quay trở lại! ⚽')
        navigate('/', { replace: true })
      }
    } catch (error) {
      console.error('Error logging in:', error)
      toast.error('Đã xảy ra lỗi hệ thống.')
    } finally {
      setLoading(false)
    }
  }

  const submitHandler = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const target = event.currentTarget
    const usernameInput = target.elements.namedItem(
      'username',
    ) as HTMLInputElement
    const passwordInput = target.elements.namedItem(
      'password',
    ) as HTMLInputElement

    if (!usernameInput.value || !passwordInput.value) {
      toast.warn('Vui lòng điền đầy đủ thông tin!')
      return
    }

    loginHandler(usernameInput.value, passwordInput.value)
  }

  if (authLoading || user) {
    return null
  }

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-sm p-6 bg-slate-800 rounded-2xl shadow-2xl border border-slate-700/60 transform transition-all">
        {/* LOGO & TITLE */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 text-2xl mb-2 border border-emerald-500/20">
            ⚽
          </div>
          <h2 className="text-xl font-bold text-slate-100">
            BMFC BAN ĐIỀU HÀNH
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Đăng nhập để quản lý điểm danh và quỹ phạt
          </p>
        </div>

        {/* FORM */}
        <form onSubmit={submitHandler} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5"
            >
              Email / Tài khoản Admin
            </label>
            <input
              type="email"
              id="username"
              name="username"
              placeholder="admin@bmfc.com"
              disabled={loading}
              className="w-full px-3.5 py-2 text-sm bg-slate-900 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all disabled:opacity-50"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5"
            >
              Mật khẩu
            </label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="••••••••"
              disabled={loading}
              className="w-full px-3.5 py-2 text-sm bg-slate-900 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg shadow-emerald-500/10 active:scale-[0.99] transition-all text-sm flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              'Đăng nhập hệ thống'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login
