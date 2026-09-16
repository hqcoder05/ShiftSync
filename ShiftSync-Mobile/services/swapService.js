import api from './api';

export const createSwapRequest = (data) =>
  api.post('/users/me/swaps', data);

export const getMySwapRequests = () =>
  api.get('/users/me/swaps');

export const respondToSwapRequest = (requestId, data) =>
  api.put(`/users/me/swaps/${requestId}/respond`, data);
