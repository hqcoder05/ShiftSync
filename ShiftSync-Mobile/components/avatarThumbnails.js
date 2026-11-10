import { getAvatarById } from './avatarConfigs';
import PORTRAITS from './avatarPortraitData';

// Static previews rendered from the same graphic 3D portrait as UserAvatar.
// Picker rows use these images to avoid opening a GL context per option.
const thumbnailCache = {};

export function getAvatarSource(avatarId, framing = 'head') {
  const collection = PORTRAITS[framing] || PORTRAITS;
  return collection[getAvatarById(avatarId).id] || collection.dilan;
}

export function getAvatarThumbnail(avatarId) {
  const id = getAvatarById(avatarId).id;
  if (!thumbnailCache[id]) {
    thumbnailCache[id] = getAvatarSource(id).uri;
  }
  return thumbnailCache[id];
}

export function getAllAvatarThumbnails() {
  Object.keys(PORTRAITS.head || PORTRAITS).forEach(getAvatarThumbnail);
  return thumbnailCache;
}
