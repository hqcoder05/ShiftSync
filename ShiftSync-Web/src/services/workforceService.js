import api from './api';

export const createWorkforceRequest = (storeId, data) =>
  api.post(`/stores/${storeId}/workforce-requests`, data);

export const getOutgoingWorkforceRequests = (storeId) =>
  api.get(`/stores/${storeId}/workforce-requests/outgoing`);

export const getIncomingWorkforceRequests = (storeId) =>
  api.get(`/stores/${storeId}/workforce-requests/incoming`);

export const cancelWorkforceRequest = (storeId, id) =>
  api.put(`/stores/${storeId}/workforce-requests/${id}/cancel`);

export const rejectWorkforceRequest = (storeId, id) =>
  api.put(`/stores/${storeId}/workforce-requests/${id}/reject`);

export const createWorkforceProposal = (storeId, id, data) =>
  api.post(`/stores/${storeId}/workforce-requests/${id}/proposals`, data);

export const getMyWorkforceProposals = () =>
  api.get('/users/me/workforce-proposals');

export const respondToWorkforceProposal = (id, data) =>
  api.put(`/users/me/workforce-proposals/${id}/respond`, data);

export const getEligibleStaffForRequest = (storeId, id) =>
  api.get(`/stores/${storeId}/workforce-requests/${id}/eligible-staff`);

