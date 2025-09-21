import { create } from 'zustand'
import * as Cart from '../services/cart'
import { useAuth } from './useAuth'

export const useCart = create((set,get)=>({
  items: [],
  init(){
    const u = useAuth.getState().user; if(!u) return;
    set({items: Cart.getCart(u.id)})
  },
  add(book,qty=1){
    const u=useAuth.getState().user; if(!u) throw new Error('Cần đăng nhập');
    set({items: Cart.addToCart(u.id, book, qty)});
  },
  update(id,qty){
    const u=useAuth.getState().user; set({items: Cart.updateCart(u.id,id,qty)})
  },
  remove(id){
    const u=useAuth.getState().user; set({items: Cart.removeFromCart(u.id,id)})
  },
  clear(){
    const u=useAuth.getState().user; set({items: Cart.clearCart(u.id)})
  },
}))
