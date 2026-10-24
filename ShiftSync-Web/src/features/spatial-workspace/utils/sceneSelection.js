/** Pick the nearest visible domain entity, ignoring decorative/unbound model nodes. */
export function pickSceneEntity(hits) {
  for (const hit of hits) {
    let visible = true;
    for (let node = hit.object; node; node = node.parent) {
      if (node.visible === false) { visible = false; break; }
    }
    if (!visible) continue;
    for (let node = hit.object; node; node = node.parent) {
      const data = node.userData || {};
      if (data.isPerson && data.employee) return { type: 'staff', value: data.employee, zone: data.zone };
      if (data.isWorkstation && data.workstation) return { type: 'workstation', value: data.workstation };
      if (data.isZone && data.zone) return { type: 'zone', value: data.zone };
    }
  }
  return null;
}
