export function notificationRoute(notification = {}) {
  const type=String(notification.sourceType||notification.type||'').toLowerCase();
  if(type.includes('swap'))return '/marketplace?tab=SWAP';
  if(type.includes('workforce')||type.includes('proposal')||type.includes('cross_store'))return '/marketplace?tab=WORKFORCE';
  if(type.includes('leave'))return '/attendance/leave';
  if(type.includes('attendance')||type.includes('adjustment'))return '/attendance/explain';
  if(type.includes('schedule'))return '/schedule';
  if(type.includes('market')||type.includes('open_shift'))return '/marketplace';
  return '/dashboard';
}

export function legacyRequestRoute(pathname, search='') {
  const tab=new URLSearchParams(search).get('tab')?.toLowerCase();
  if(['leave','adjustment','adjustments','attendance','swap','swaps','workforce','proposals','cross_store','open_shift','marketplace','schedule'].includes(tab))return notificationRoute({type:tab});
  return pathname==='/notifications'?'/dashboard':'/attendance';
}
