// src/view/store/useAuth.js
import { create } from 'zustand'
import * as Auth from '../services/auth'
import { load, save } from '../services/storage'

export const useAuth = create((set,get)=>({
  user:   load('current_user', null),
  tokens: load('tokens', null),
  loading:false,
  error:null,

  async login(payload){
    set({loading:true,error:null})
    try{
      const res = await Auth.login(payload) // { user, tokens:{accessToken,refreshToken} }
      set({user:res.user, tokens:res.tokens})
      save('current_user', res.user)
      save('tokens',       res.tokens)
      return res.user
    }catch(e){
      set({error:e.message}); throw e
    }finally{ set({loading:false}) }
  },

  async register(payload){
    set({loading:true,error:null})
    try{ return await Auth.register(payload) }
    catch(e){ set({error:e.message}); throw e }
    finally{ set({loading:false}) }
  },

  async refreshProfile(){
    try{
      const u = await Auth.me()
      set({user:u}); save('current_user', u)
      return u
    } catch { /* ignore */ }
  },

  async verify(email){ return Auth.verifyEmail(email) },

  async logoutAll(){
    const u=get().user; if(!u) return
    await Auth.logoutAll(u.id || u._id)
    set({user:null,tokens:null})
    save('current_user', null)
    save('tokens', null)
  }
}))
