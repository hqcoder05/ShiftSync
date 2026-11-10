import api from './api';

const weekPath = (weekStart) => `/availability/weeks/${weekStart}`;
const flattenWeek = (res) => ({ ...res, week: res.data, data: res.data?.slots || [] });
export const getMyAvailability = (weekStart) => weekStart
  ? api.get(weekPath(weekStart)).then(flattenWeek)
  : api.get('/availability');

export const getStaffAvailability = (userId, weekStart) => weekStart
  ? api.get(`${weekPath(weekStart)}/users/${userId}`).then((res) => ({ ...res, week: res.data, data: res.data?.source === 'REGISTERED' ? res.data.slots : [] }))
  : api.get(`/availability/users/${userId}`);

export const getStoreStaffAvailability = (storeId, weekStart) => weekStart
  ? api.get(`${weekPath(weekStart)}/stores/${storeId}`).then((res) => ({
    ...res,
    weeks: res.data,
    data: (res.data || []).filter((week) => week.source === 'REGISTERED').flatMap((week) => week.slots || []),
  }))
  : api.get(`/availability/stores/${storeId}`);

export const createAvailability = async ({ weekStart, ...data }) => {
  if (!weekStart) return api.post('/availability', data);
  const current = await api.get(weekPath(weekStart));
  return api.put(weekPath(weekStart), {
    revision: current.data.revision,
    slots: [...current.data.slots, data].map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime })),
  });
};

export const updateAvailability = (id, data) => api.put(`/availability/${id}`, data);

export const deleteAvailability = async (id, weekStart) => {
  if (!weekStart) return api.delete(`/availability/${id}`);
  const current = await api.get(weekPath(weekStart));
  return api.put(weekPath(weekStart), {
    revision: current.data.revision,
    slots: current.data.slots.filter((slot) => slot.id !== id)
      .map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime })),
  });
};
