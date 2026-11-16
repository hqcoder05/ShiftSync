import test from 'node:test';
import assert from 'node:assert/strict';
import { avatarUrlError, isAllowedPersistedAvatarSource } from './avatarSecurity.js';

test('only accepts HTTPS Ready Player Me GLB URLs for remote avatars', () => {
  assert.equal(avatarUrlError('https://models.readyplayer.me/avatar.glb'), '');
  assert.notEqual(avatarUrlError('http://models.readyplayer.me/avatar.glb'), '');
  assert.notEqual(avatarUrlError('https://example.invalid/avatar.glb'), '');
  assert.notEqual(avatarUrlError('https://models.readyplayer.me/avatar.png'), '');
});

test('allows only approved remote URLs or bundled model paths to persist', () => {
  assert.equal(isAllowedPersistedAvatarSource('/models/ShiftSync_Barista.glb'), true);
  assert.equal(isAllowedPersistedAvatarSource('blob:https://app.invalid/preview'), false);
  assert.equal(isAllowedPersistedAvatarSource('https://example.invalid/avatar.glb'), false);
});
