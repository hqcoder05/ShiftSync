export const SPATIAL_WORKSPACE_PATH = '/store-3d';

export function isLegacySpatialScheduleSearch(search = '') {
  return new URLSearchParams(search).get('view')?.toLowerCase() === '3d';
}
