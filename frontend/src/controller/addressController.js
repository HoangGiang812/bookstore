import * as Address from '../services/address'
export const list = (userId)=> Address.listAddresses(userId);
export const add = (userId, addr)=> Address.addAddress(userId, addr);
export const update = (userId, id, patch)=> Address.updateAddress(userId, id, patch);
export const remove = (userId, id)=> Address.removeAddress(userId, id);
export const setDefault = (userId, id)=> Address.setDefault(userId,id);
