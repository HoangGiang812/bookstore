import api from './api'
import { save } from './storage'

export const register = async (payload) => {
  const data = await api.post('/auth/register', payload)
  const tokens = { accessToken: data.accessToken, refreshToken: data.refreshToken }
  save('current_user', data.user)
  save('tokens', tokens)
  return { user: data.user, tokens }
}

export const login = async ({ email, password }) => {
  const data = await api.post('/auth/login', { email, password })
  const tokens = { accessToken: data.accessToken, refreshToken: data.refreshToken }
  save('current_user', data.user)
  save('tokens', tokens)
  return { user: data.user, tokens }
}

export const me = async () => api.get('/users/me')

export const logoutAll = async () => {
  const wrap = JSON.parse(localStorage.getItem('bookstore_data_v1') || '{}')
  const rt = wrap?.tokens?.refreshToken
  if (rt) { try { await api.post('/auth/logout', { refreshToken: rt }) } catch {} }
  save('current_user', null)
  save('tokens', null)
}
