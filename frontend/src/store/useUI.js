import { create } from 'zustand'
export const useUI = create((set)=>({
  toast:null,
  notify(msg,type='success'){ set({toast:{msg,type,ts:Date.now()}}); setTimeout(()=>set({toast:null}), 2200); }
}))
