import { load, save } from './storage'
const k = (u)=>'cart_'+u;
export const getCart = (u)=> load(k(u), []);
export const addToCart = (u,book,qty=1)=>{ const c=getCart(u); const e=c.find(i=>i.id===book.id); let nw; if(e){ nw=c.map(i=>i.id===book.id?{...i,quantity:i.quantity+qty}:i);} else { nw=[{...book,quantity:qty},...c]; } save(k(u),nw); return nw; };
export const updateCart = (u,id,qty)=>{ const c=getCart(u); const nw = qty<=0 ? c.filter(i=>i.id!==id) : c.map(i=>i.id===id?{...i,quantity:qty}:i); save(k(u),nw); return nw; };
export const clearCart = (u)=>{ save(k(u), []); return []; };
export const removeFromCart = (u,id)=>{ const c=getCart(u).filter(i=>i.id!==id); save(k(u),c); return c; };
export const applyCoupon = (code,subtotal)=>{ const map={'GIAM10':0.9,'FREESHIP300':1}; const rate=map[code]??1; return {valid: rate!==1, total: Math.round(subtotal*rate)}; };
export const shippingFee = (subtotal)=> subtotal>=300000?0:30000;
