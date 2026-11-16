const READY_PLAYER_ME_MODELS_ORIGIN = 'https://models.readyplayer.me';
export const MAX_GLB_SIZE_BYTES = 15 * 1024 * 1024;

export const isApprovedAvatarUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && url.origin === READY_PLAYER_ME_MODELS_ORIGIN
      && url.pathname.toLowerCase().endsWith('.glb');
  } catch {
    return false;
  }
};

export const isAllowedPersistedAvatarSource = (value) =>
  /^\/models\/[A-Za-z0-9_-]+\.glb$/.test(value || '') || isApprovedAvatarUrl(value);

export const avatarUrlError = (value) => isApprovedAvatarUrl(value)
  ? ''
  : 'Chỉ chấp nhận liên kết HTTPS .glb từ models.readyplayer.me.';

export const glbFileError = async (file) => {
  if (!file || !file.name.toLowerCase().endsWith('.glb')) return 'Chỉ hỗ trợ tệp .glb.';
  if (file.size > MAX_GLB_SIZE_BYTES) return 'Tệp GLB vượt quá giới hạn 15 MB.';
  const header = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  const signature = String.fromCharCode(...header);
  return signature === 'glTF' ? '' : 'Tệp không có chữ ký GLB hợp lệ.';
};
