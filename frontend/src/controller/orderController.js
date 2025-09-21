import * as Orders from '../services/orders'
export const create = (userId, payload)=> Orders.createOrder(userId, payload);
export const list = (userId)=> Orders.listOrders(userId);
export const cancel = (userId, id)=> Orders.cancelOrder(userId,id);
export const rma = (userId, id, reason)=> Orders.requestRMA(userId,id,reason);
