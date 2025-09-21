import { load, save } from './storage'
const k = (u)=>'addresses_'+u;
export const listAddresses = (u)=> load(k(u), []);
export const addAddress = (u,a)=>{ const l=listAddresses(u); const n={id:crypto.randomUUID(),...a}; if(!l.some(x=>x.isDefault)) n.isDefault=true; const nw=[n,...l]; save(k(u), nw); return nw; };
export const updateAddress = (u,id,patch)=>{ const l=listAddresses(u).map(x=>x.id===id?{...x,...patch}:x); save(k(u),l); return l; };
export const removeAddress = (u,id)=>{ const l=listAddresses(u).filter(x=>x.id!==id); if(!l.some(x=>x.isDefault)&&l[0]) l[0].isDefault=true; save(k(u),l); return l; };
export const setDefault = (u,id)=>{ const l=listAddresses(u).map(x=>({...x,isDefault:x.id===id})); save(k(u),l); return l; };
