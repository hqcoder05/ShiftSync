import api from './api';
import { cachedRequest } from './offlineCache';

const base = (storeId) => `/stores/${encodeURIComponent(storeId)}/messaging`;
const sessionConfig = (ownerEmail) => ownerEmail ? { expectedSessionEmail: ownerEmail.trim().toLowerCase() } : {};
let unreadCount = 0;
let unreadGeneration = 0;
let unreadRequest = 0;
let unreadRetryAfter = 0;
const unreadListeners = new Set();
export const getMessagingUnreadSnapshot = () => unreadCount;
export const subscribeMessagingUnread = (listener) => { unreadListeners.add(listener); return () => unreadListeners.delete(listener); };
const publishUnread = (count) => {
  const next = Math.max(0, Math.trunc(Number(count) || 0));
  if (next === unreadCount) return;
  unreadCount = next;
  unreadListeners.forEach((listener) => { try { listener(); } catch {} });
};
export function resetMessagingUnread() { unreadGeneration += 1; unreadRetryAfter = 0; publishUnread(0); }
export async function refreshMessagingUnreadCount() {
  if (Date.now() < unreadRetryAfter) return;
  const generation = unreadGeneration;
  const request = ++unreadRequest;
  let response;
  try {
    response = await api.get('/users/me/messaging/unread-count');
    unreadRetryAfter = 0;
  } catch (error) {
    // Avoid repeatedly hitting an endpoint that this server does not expose.
    // Retry later so a backend update can be detected without restarting.
    if (generation === unreadGeneration && error?.response?.status === 404) unreadRetryAfter = Date.now() + 5 * 60 * 1000;
    throw error;
  }
  if (generation === unreadGeneration && request === unreadRequest) publishUnread(response.data?.unreadCount);
  return response;
}

export const getMessagingContacts = (storeId, ownerEmail) => cachedRequest(`messaging:${storeId}:contacts`,
  () => api.get(`${base(storeId)}/contacts`, sessionConfig(ownerEmail)));
export const getMessagingThreads = (storeId, ownerEmail) => cachedRequest(`messaging:${storeId}:threads`,
  () => api.get(`${base(storeId)}/threads`, sessionConfig(ownerEmail)));
export const createMessagingThread = (storeId, recipientId, ownerEmail) =>
  api.post(`${base(storeId)}/threads`, { recipientId }, sessionConfig(ownerEmail));
export const getThreadMessages = (storeId, threadId, { before, limit = 50, ownerEmail } = {}) =>
  cachedRequest(`messaging:${storeId}:${threadId}:${before || 'latest'}`,
    () => api.get(`${base(storeId)}/threads/${encodeURIComponent(threadId)}/messages`, {
      ...sessionConfig(ownerEmail), params: { limit, ...(before ? { before } : {}) },
    }));
export const sendThreadMessage = (storeId, threadId, message, ownerEmail) =>
  api.post(`${base(storeId)}/threads/${encodeURIComponent(threadId)}/messages`, message, sessionConfig(ownerEmail));
export const markThreadRead = (storeId, threadId, lastReadMessageId, ownerEmail) =>
  api.post(`${base(storeId)}/threads/${encodeURIComponent(threadId)}/read`, { lastReadMessageId }, sessionConfig(ownerEmail));
export const getStoreAnnouncements = (storeId, ownerEmail) => cachedRequest(`messaging:${storeId}:announcements`,
  () => api.get(`${base(storeId)}/announcements`, sessionConfig(ownerEmail)));
export const publishStoreAnnouncement = (storeId, announcement, ownerEmail) =>
  api.post(`${base(storeId)}/announcements`, announcement, sessionConfig(ownerEmail));

export function createClientMessageId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const value = Math.floor(Math.random() * 16);
    return (character === 'x' ? value : (value & 3) | 8).toString(16);
  });
}

export function mergeThreadMessages(current, incoming) {
  const byId = new Map(current.map((message) => [String(message.id), message]));
  incoming.forEach((message) => byId.set(String(message.id), message));
  return [...byId.values()].sort((a, b) => Number.isFinite(a.sequence) && Number.isFinite(b.sequence)
    ? a.sequence - b.sequence : Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

// If the newest page no longer overlaps what is on screen, there can be
// unseen messages between the two pages. Offer pagination from the new page.
export function latestMessageGapCursor(current, incoming, page) {
  if (!current.length || !incoming.length || !page?.hasMore || !page?.nextBefore) return null;
  const ids = new Set(current.map((message) => String(message.id)));
  return incoming.some((message) => ids.has(String(message.id))) ? null : page.nextBefore;
}
