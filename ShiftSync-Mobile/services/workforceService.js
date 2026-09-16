import api from './api';

export const getMyProposals = () =>
  api.get('/users/me/workforce-proposals');

export const respondProposal = (id, data) =>
  api.put(`/users/me/workforce-proposals/${id}/respond`, data);
