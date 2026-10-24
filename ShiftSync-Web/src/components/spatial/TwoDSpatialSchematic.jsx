import { getZoneThemeColor, calculateZoneDistance } from './spatial.constants';

/**
 * TwoDSpatialSchematic
 * A crisp, accessible SVG architectural blueprint for 2D spatial view and WebGL fallback.
 */
export default function TwoDSpatialSchematic({
  layout,
  zones = [],
  workstations = [],
  showWorkstations = true,
  staff = [],
  selectedZone = null,
  onSelectZone,
  showDistances = false,
}) {
  const storeLength = layout?.length || 24;
  const storeWidth = layout?.width || 16;

  // Scale to SVG viewport: 800 x (800 * storeWidth / storeLength)
  const svgWidth = 800;
  const svgHeight = Math.max(450, Math.round((800 * storeWidth) / storeLength));
  const padding = 40;
  const usableWidth = svgWidth - padding * 2;
  const usableHeight = svgHeight - padding * 2;

  const scaleX = (x) => padding + (x / storeLength) * usableWidth;
  const scaleY = (y) => padding + (y / storeWidth) * usableHeight;
  const zoneDimensions=zone=>({
    width:zone.physicalFrame?Math.max(72,(usableWidth/storeLength)*(zone.physicalFrame.sizeX-.3)):Math.max(90,Math.min(160,(usableWidth/storeLength)*4)),
    height:zone.physicalFrame?Math.max(76,(usableHeight/storeWidth)*zone.physicalFrame.sizeZ):Math.max(60,Math.min(120,(usableHeight/storeWidth)*3)),
  });

  // Group staff by assigned zone
  const staffByZone = {};
  staff.forEach((s) => {
    const zid = s.zoneId || s.zone?.id;
    if (zid) {
      if (!staffByZone[zid]) staffByZone[zid] = [];
      staffByZone[zid].push(s);
    }
  });

  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#FAFAFA',
      borderRadius: 14,
      position: 'relative',
      overflow: 'hidden',
      border: '1px solid #E2E8F0',
      boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.03)',
    }}>
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <defs>
          {/* Subtle architectural grid */}
          <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="2,2" />
          </pattern>
        </defs>

        {/* Floor background */}
        <rect
          x={padding}
          y={padding}
          width={usableWidth}
          height={usableHeight}
          fill="url(#grid-pattern)"
          stroke="#94A3B8"
          strokeWidth="2.5"
          rx="8"
        />

        {/* Entrance indicator */}
        <path
          d={`M ${padding + usableWidth / 2 - 30} ${padding + usableHeight} L ${padding + usableWidth / 2 + 30} ${padding + usableHeight}`}
          stroke="#51A33D"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <text
          x={padding + usableWidth / 2}
          y={padding + usableHeight + 22}
          textAnchor="middle"
          fontSize="11"
          fontWeight="600"
          fill="#51A33D"
        >
          LỐI VÀO CHÍNH (ENTRANCE)
        </text>

        {/* Dimension labels */}
        <text x={svgWidth / 2} y={padding - 14} textAnchor="middle" fontSize="12" fill="#64748B" fontWeight="600">
          Chiều dài: {storeLength}m
        </text>
        <text
          x={padding - 14}
          y={svgHeight / 2}
          textAnchor="middle"
          fontSize="12"
          fill="#64748B"
          fontWeight="600"
          transform={`rotate(-90, ${padding - 14}, ${svgHeight / 2})`}
        >
          Chiều rộng: {storeWidth}m
        </text>

        {/* Distance connection lines between zones */}
        {showDistances && zones.length > 1 && (
          <g>
            {zones.map((zA, idx) =>
              zones.slice(idx + 1).map((zB) => {
                const x1 = scaleX(zA.x);
                const y1 = scaleY(zA.y);
                const x2 = scaleX(zB.x);
                const y2 = scaleY(zB.y);
                const dist = calculateZoneDistance(zA, zB).toFixed(1);
                const midX = (x1 + x2) / 2;
                const midY = (y1 + y2) / 2;

                return (
                  <g key={`dist-${zA.id || idx}-${zB.id}`}>
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#6366F1" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.6" />
                    <rect x={midX - 22} y={midY - 10} width="44" height="20" rx="4" fill="#EEF2FF" stroke="#C7D2FE" />
                    <text x={midX} y={midY + 4} textAnchor="middle" fontSize="10" fontWeight="600" fill="#4F46E5">
                      {dist}m
                    </text>
                  </g>
                );
              })
            )}
          </g>
        )}

        {/* Render Zones */}
        {zones.map((zone) => {
          const zx = scaleX(zone.x);
          const zy = scaleY(zone.y);
          const {width:zw,height:zh}=zoneDimensions(zone);
          const isSelected = selectedZone?.id === zone.id;
          const color = getZoneThemeColor(zone.name);
          const assignedStaff = staffByZone[zone.id] || [];

          return (
            <g
              key={zone.id || zone.name}
              data-zone-id={zone.id}
              data-store-x={zone.x}
              data-store-y={zone.y}
              onClick={() => onSelectZone?.(zone)}
              style={{ cursor: 'pointer' }}
            >
              {/* Zone Area Box */}
              <rect
                x={zx - zw / 2}
                y={zy - zh / 2}
                width={zw}
                height={zh}
                rx="8"
                fill={isSelected ? `${color}30` : `${color}15`}
                stroke={isSelected ? color : `${color}80`}
                strokeWidth={isSelected ? '2.5' : '1.5'}
              />

              {/* Zone Name Badge */}
              <rect
                x={zx - zw / 2 + 6}
                y={zy - zh / 2 + 6}
                width={zw - 12}
                height="22"
                rx="4"
                fill={color}
              />
              <text
                x={zx}
                y={zy - zh / 2 + 21}
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill="#FFFFFF"
              >
                {zone.name}
              </text>

              {/* Elevation tag if elevated */}
              {zone.z > 0 && (
                <text
                  x={zx + zw / 2 - 8}
                  y={zy - zh / 2 - 6}
                  textAnchor="end"
                  fontSize="9"
                  fontWeight="600"
                  fill="#8B5CF6"
                >
                  +{zone.z}m
                </text>
              )}

              {/* Capacity and occupancy counter */}
              <text
                x={zx}
                y={zy + 8}
                textAnchor="middle"
                fontSize="11"
                fontWeight="500"
                fill="#334155"
              >
                Nhân sự: <tspan fontWeight="700" fill={color}>{assignedStaff.length}</tspan> / {zone.capacity || 4}
              </text>

              {/* Staff dots inside zone */}
              <g>
                {assignedStaff.map((emp, sIdx) => {
                  const dotX = zx - ((assignedStaff.length - 1) * 12) / 2 + sIdx * 14;
                  const dotY = zy + 26;
                  return (
                    <g key={emp.id || sIdx}>
                      <circle cx={dotX} cy={dotY} r="5" fill={color} stroke="#FFFFFF" strokeWidth="1.5" />
                      <title>{emp.staffName || 'Nhân viên'}</title>
                    </g>
                  );
                })}
              </g>
            </g>
          );
        })}

        {/* Render Workstations Layer */}
        {showWorkstations && (workstations || []).map((ws) => {
          let wx = ws.x;
          let wy = ws.y;
          if (wx == null || wy == null) {
            const parentZone = zones.find((z) => z.id === ws.zoneId);
            if (parentZone) {
              wx = parentZone.x;
              wy = parentZone.y;
            } else {
              wx = 0;
              wy = 0;
            }
          }
          const sx = scaleX(wx);
          const sy = scaleY(wy);
          const parentZone=zones.find(zone=>zone.id===ws.zoneId);
          const siblingIndex=workstations.filter(item=>item.zoneId===ws.zoneId).findIndex(item=>item.id===ws.id);
          const labelY=parentZone?scaleY(parentZone.y)+zoneDimensions(parentZone).height/2+20+Math.max(0,siblingIndex)*20:sy+32;

          return (
            <g key={ws.id || ws.name} data-workstation-id={ws.id} style={{ pointerEvents: 'none' }}>
              <path d={`M ${sx} ${sy+8} L ${sx} ${labelY-14}`} stroke="#64748b" strokeWidth="1" />
              <circle cx={sx} cy={sy} r="7" fill="#0284C7" stroke="#FFFFFF" strokeWidth="2" />
              <rect
                x={sx - 36}
                y={labelY - 14}
                width="72"
                height="15"
                rx="3"
                fill="rgba(15, 23, 42, 0.85)"
              />
              <text
                x={sx}
                y={labelY - 3}
                textAnchor="middle"
                fontSize="8.5"
                fontWeight="700"
                fill="#FFFFFF"
              >
                {String(ws.name || 'Trạm').slice(0, 11)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
