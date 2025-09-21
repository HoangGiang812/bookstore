import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import * as Auth from '../services/auth'

const jget = (k, d=null) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch { return d } }
const jset = (k, v) => localStorage.setItem(k, JSON.stringify(v))

function readStored() {
  const wrap = jget('bookstore_data_v1', {})
  const auth = jget('auth', null)
  const t2   = jget('auth_tokens', null)

  const user =
    wrap?.current_user ||
    auth?.user || null

  const tokens =
    wrap?.tokens ||
    (auth?.accessToken ? { accessToken: auth.accessToken, refreshToken: auth.refreshToken } : null) ||
    t2 || null

  return { user, tokens }
}

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [tokens, setTokens] = useState(null)

  // Hydrate từ storage khi load app
  useEffect(() => {
    const { user: u, tokens: t } = readStored()
    setUser(u); setTokens(t)

    // Nếu đã có token mà chưa có user → gọi /users/me
    if (!u && t?.accessToken) {
      Auth.me().then((me)=>{ if (me) persist(me, t) }).catch(()=>{})
    }
  }, [])

  const persist = (u, t) => {
    setUser(u); setTokens(t)
    const wrap = jget('bookstore_data_v1', {})
    jset('bookstore_data_v1', { ...wrap, current_user: u, tokens: t })
    if (t) jset('auth_tokens', t); else localStorage.removeItem('auth_tokens')
    if (t) jset('auth', { user: u, accessToken: t.accessToken, refreshToken: t.refreshToken })
    else localStorage.removeItem('auth')
  }

  const login = async ({ email, password }) => {
    const data = await Auth.login({ email, password })
    // chấp mọi kiểu trả về
    let u = data?.user ?? readStored().user
    let t = data?.tokens ?? ((data?.accessToken || data?.refreshToken)
      ? { accessToken: data.accessToken, refreshToken: data.refreshToken }
      : readStored().tokens)

    if (!u && (t?.accessToken)) {
      try { u = await Auth.me() } catch {}
    }
    persist(u, t)
    return u
  }

  const register = async (payload) => {
    const data = await Auth.register(payload)
    let u = data?.user ?? readStored().user
    let t = data?.tokens ?? ((data?.accessToken || data?.refreshToken)
      ? { accessToken: data.accessToken, refreshToken: data.refreshToken }
      : readStored().tokens)
    if (!u && (t?.accessToken)) {
      try { u = await Auth.me() } catch {}
    }
    persist(u, t)
    return u
  }

  const logoutAll = async () => {
    try { await Auth.logoutAll?.() } catch {}
    persist(null, null)
  }

  const value = useMemo(() => ({ user, tokens, login, register, logoutAll }), [user, tokens])
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
