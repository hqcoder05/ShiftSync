import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import { getNetworkSnapshot } from './networkState';
import { findScheduleConflicts, isAssignedTo, shiftIntervalVN } from '../utils/scheduleConflicts';

const sameId = (left, right) => left != null && right != null && String(left) === String(right);
const unavailable = () => new Error('Chưa thể kiểm tra lịch làm mới nhất. Vui lòng kết nối mạng và thử lại; yêu cầu chưa được gửi.');

async function freshSchedule({ userId, storeId, candidateShiftId, excludedShiftId, targetStaffId }) {
  if (!userId || !storeId || !candidateShiftId || !getNetworkSnapshot().online) throw unavailable();
  const values = new Map(await AsyncStorage.multiGet(['userEmail', 'accessToken']));
  const email = values.get('userEmail')?.trim().toLowerCase();
  if (!email || !values.get('accessToken')) throw unavailable();
  // Bind every request, including the eventual write, to the account that began this check.
  const config = { expectedSessionEmail: email };
  const { data: user } = await api.get('/users/me', config);
  if (!sameId(user?.id, userId)) throw new Error('Tài khoản đã thay đổi. Vui lòng tải lại màn hình.');
  const results = await Promise.all([
    api.get(`/users/${userId}/stores`, config),
    api.get('/users/me/shifts', config),
    api.get(`/stores/${storeId}/shifts`, config),
  ]);
  const [memberships, mine, storeShifts] = results.map((result) => result.data);
  if (!Array.isArray(memberships) || !memberships.some((store) =>
    sameId(store.storeId || store.id, storeId) && store.status === 'ACTIVE')) {
    throw new Error('Bạn không còn thuộc chi nhánh này. Vui lòng tải lại màn hình.');
  }
  if (!Array.isArray(mine) || !Array.isArray(storeShifts)) throw unavailable();
  const candidate = storeShifts.find((shift) => sameId(shift.id, candidateShiftId) && sameId(shift.storeId, storeId));
  if (!candidate || candidate.status !== 'PUBLISHED') throw new Error('Ca nhận đã thay đổi hoặc không còn được công bố. Vui lòng tải lại.');
  if (excludedShiftId) {
    const source = mine.find((shift) => sameId(shift.id, excludedShiftId) && sameId(shift.storeId, storeId) && isAssignedTo(shift, userId));
    if (!source || source.status !== 'PUBLISHED' || !shiftIntervalVN(source) || shiftIntervalVN(source).start <= Date.now()
        || !isAssignedTo(candidate, targetStaffId) || sameId(targetStaffId, userId) || sameId(excludedShiftId, candidateShiftId)
        || !shiftIntervalVN(candidate) || shiftIntervalVN(candidate).start <= Date.now()) {
      throw new Error('Ca đổi không còn hợp lệ. Hãy chọn ca sắp tới của bạn và ca đồng nghiệp trong cùng chi nhánh.');
    }
  }
  const activeStoreIds = memberships.filter((store) => store.status === 'ACTIVE').map((store) => store.storeId || store.id);
  const conflicts = findScheduleConflicts(candidate, mine, { userId, storeId, excludedShiftId, activeStoreIds }).map((conflict) => {
    const branch = memberships.find((store) => sameId(store.storeId || store.id, conflict.shift.storeId));
    return { ...conflict, shift: { ...conflict.shift, storeName: conflict.shift.storeName || branch?.storeName || branch?.name } };
  });
  return { candidate, conflicts, config };
}

export async function submitCheckedClaim({ userId, storeId, shiftId }) {
  const checked = await freshSchedule({ userId, storeId, candidateShiftId: shiftId });
  if (checked.conflicts.length) return checked;
  await api.post(`/stores/${storeId}/marketplace/shifts/${shiftId}/claim`, undefined, checked.config);
  return checked;
}

export async function submitCheckedSwap({ userId, storeId, fromShiftId, toStaffId, toShiftId }) {
  const checked = await freshSchedule({ userId, storeId, candidateShiftId: toShiftId, excludedShiftId: fromShiftId, targetStaffId: toStaffId });
  if (checked.conflicts.length) return checked;
  await api.post('/users/me/swaps', { fromShiftId, toStaffId, toShiftId }, checked.config);
  return checked;
}
