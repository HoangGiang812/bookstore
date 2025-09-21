import api from './api'

export async function login({ email, password }) {
  const r = await api.post('/auth/login', { email, password })
  const tokens = r.tokens || { accessToken: r.accessToken, refreshToken: r.refreshToken }
  return { user: r.user, tokens }
}
export async function register(payload) { return api.post('/auth/register', payload) }
export async function verifyEmail(email) { return api.post('/auth/verify-email', { email }) }
export async function logoutAll(userId) { try { await api.post('/auth/logout-all', { userId }) } catch {} }
export async function me() { return api.get('/users/me') } // hoặc '/auth/me' tùy BE
