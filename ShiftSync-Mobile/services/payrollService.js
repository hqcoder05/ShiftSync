import api from './api';
import { cachedRequest } from './offlineCache';
import { Platform } from 'react-native';

export const getMyPayslips = () => cachedRequest('payslips', () => api.get('/users/me/payslips'));

function safeFilename(value, payslipId) {
  const match = String(value || '').match(/filename\*?=(?:UTF-8''|"?)([^;"\n]+)/i);
  const decoded = match?.[1] ? decodeURIComponent(match[1].trim()) : `phieu-luong-${payslipId}.pdf`;
  return decoded.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_') || `phieu-luong-${payslipId}.pdf`;
}

export async function downloadAndSharePayslipPdf(payslipId) {
  if (!payslipId) throw new Error('Không xác định được phiếu lương.');
  const response = await api.get(`/users/me/payslips/${encodeURIComponent(payslipId)}/pdf`, {
    responseType: Platform.OS === 'web' ? 'blob' : 'arraybuffer',
  });
  const filename = safeFilename(response.headers?.['content-disposition'], payslipId);
  const mimeType = String(response.headers?.['content-type'] || 'application/pdf').split(';')[0];

  if (Platform.OS === 'web') {
    const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { mode: 'download', filename };
  }

  const { File, Paths } = await import('expo-file-system');
  const Sharing = await import('expo-sharing');
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.write(new Uint8Array(response.data));
  if (!await Sharing.isAvailableAsync()) throw new Error('Thiết bị chưa hỗ trợ chia sẻ tệp PDF.');
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: 'Chia sẻ phiếu lương' });
  return { mode: 'share', filename };
}
