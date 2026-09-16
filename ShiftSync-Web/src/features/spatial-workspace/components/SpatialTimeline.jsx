/**
 * SpatialTimeline.jsx
 * Temporal Engine UI for the ShiftSync 3D Store Digital Twin.
 * 
 * Provides interactive time scrubbing across the business day (06:00 - 23:00),
 * auto-playback (1x, 2x, 5x speed), real shift markers, and live staffing counts
 * directly grounded in Spring Boot shift scheduling data.
 */

import { useState, useMemo } from 'react';
import {
  Play,
  Pause,
  Clock,
  Users,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

function formatMinutesToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${hh}:${mm}`;
}

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

export default function SpatialTimeline({
  allDateShifts = [],
  currentTimeMinutes = 600, // 10:00 default
  onTimeChange,
  isPlaying = false,
  onTogglePlay,
  playSpeed = 1,
  onChangePlaySpeed,
  activeStaffCount = 0,
  activeShift = null,
  onSelectShift,
  isDrawerOpen = true,
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Time range bounds (06:00 to 23:00 = 360 to 1380 minutes)
  const minMinutes = 360;
  const maxMinutes = 1380;

  // Compute shift markers along the timeline
  const shiftBlocks = useMemo(() => {
    return allDateShifts.map((s) => {
      const startM = parseTimeToMinutes(s.startTime);
      const endM = parseTimeToMinutes(s.endTime);
      const leftPercent = Math.max(0, Math.min(100, ((startM - minMinutes) / (maxMinutes - minMinutes)) * 100));
      const rightPercent = Math.max(0, Math.min(100, ((endM - minMinutes) / (maxMinutes - minMinutes)) * 100));
      const widthPercent = Math.max(3, rightPercent - leftPercent);
      const count = Array.isArray(s.shiftAssignments) ? s.shiftAssignments.length : (s.staffId ? 1 : 0);

      return {
        id: s.id,
        name: s.name || s.templateName || 'Ca làm',
        startM,
        endM,
        leftPercent,
        widthPercent,
        count,
        raw: s,
      };
    });
  }, [allDateShifts]);

  // Compute 30-minute heat buckets for staffing density track
  const heatBuckets = useMemo(() => {
    const buckets = [];
    for (let m = minMinutes; m < maxMinutes; m += 30) {
      let count = 0;
      allDateShifts.forEach((s) => {
        const startM = parseTimeToMinutes(s.startTime);
        const endM = parseTimeToMinutes(s.endTime);
        if (m >= startM && m <= endM) {
          const sCount = Array.isArray(s.shiftAssignments) ? s.shiftAssignments.length : (s.staffId ? 1 : 0);
          count += sCount;
        }
      });
      buckets.push({
        minute: m,
        count,
        status: count >= 5 ? 'optimal' : count >= 2 ? 'tight' : count > 0 ? 'critical' : 'none',
      });
    }
    return buckets;
  }, [allDateShifts]);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 14,
        left: 14,
        right: isDrawerOpen ? 362 : 14,
        zIndex: 22,
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(16px)',
          borderRadius: 14,
          border: '1px solid #E2E8F0',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.10)',
          padding: isCollapsed ? '8px 14px' : '10px 16px 12px 16px',
          pointerEvents: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: isCollapsed ? 0 : 8,
        }}
      >
        {/* Top bar: Controls, Current Time & Shift Badges */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          {/* Left: Play/Pause, Speed, Current Time */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={onTogglePlay}
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                border: 'none',
                backgroundColor: isPlaying ? '#EF4444' : '#10B981',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: isPlaying
                  ? '0 2px 8px rgba(239, 68, 68, 0.35)'
                  : '0 2px 8px rgba(16, 185, 129, 0.35)',
                transition: 'all 0.15s ease',
              }}
              title={isPlaying ? 'Tạm dừng mô phỏng thời gian' : 'Phát tiến trình dòng thời gian'}
            >
              {isPlaying ? <Pause size={15} /> : <Play size={15} style={{ marginLeft: 2 }} />}
            </button>

            {/* Play Speed selector */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#F1F5F9',
                borderRadius: 8,
                padding: 2,
                border: '1px solid #E2E8F0',
              }}
            >
              {[1, 2, 5].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => onChangePlaySpeed?.(spd)}
                  style={{
                    padding: '2px 7px',
                    borderRadius: 6,
                    border: 'none',
                    backgroundColor: playSpeed === spd ? '#0F172A' : 'transparent',
                    color: playSpeed === spd ? '#FFFFFF' : '#64748B',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  title={`Tốc độ x${spd}`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            {/* Time display indicator */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 8,
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                fontFamily: 'monospace',
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: 0.5,
              }}
            >
              <Clock size={13} color="#38BDF8" />
              <span>{formatMinutesToTime(currentTimeMinutes)}</span>
            </div>

            {/* Quick Shift Chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {shiftBlocks.map((sb) => {
                const isActive = currentTimeMinutes >= sb.startM && currentTimeMinutes <= sb.endM;
                const isSelected = activeShift?.id === sb.id;
                return (
                  <button
                    key={sb.id}
                    type="button"
                    onClick={() => {
                      onTimeChange?.(sb.startM + 30);
                      onSelectShift?.(sb.id);
                    }}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 7,
                      border: isSelected
                        ? '1.5px solid #10B981'
                        : isActive
                        ? '1px solid #94A3B8'
                        : '1px solid #E2E8F0',
                      backgroundColor: isSelected
                        ? '#ECFDF5'
                        : isActive
                        ? '#F8FAFC'
                        : '#FFFFFF',
                      color: isSelected ? '#047857' : isActive ? '#0F172A' : '#64748B',
                      fontSize: 11,
                      fontWeight: isSelected || isActive ? 700 : 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      transition: 'all 0.15s ease',
                    }}
                    title={`Nhảy tới ${sb.name} (${formatMinutesToTime(sb.startM)} - ${formatMinutesToTime(sb.endM)})`}
                  >
                    <span>{sb.name}</span>
                    <span
                      style={{
                        fontSize: 9.5,
                        padding: '1px 4px',
                        borderRadius: 4,
                        backgroundColor: isSelected ? '#10B981' : '#E2E8F0',
                        color: isSelected ? '#FFF' : '#475569',
                      }}
                    >
                      {sb.count} NV
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Active Staff Badge & Collapse Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 10px',
                borderRadius: 8,
                backgroundColor: activeStaffCount > 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(100, 116, 139, 0.10)',
                color: activeStaffCount > 0 ? '#059669' : '#64748B',
                fontSize: 11.5,
                fontWeight: 700,
              }}
            >
              <Users size={13} />
              <span>{activeStaffCount} Nhân sự đang trực</span>
            </div>

            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
                alignItems: 'center',
              }}
              title={isCollapsed ? 'Mở rộng thanh thời gian' : 'Thu gọn thanh thời gian'}
            >
              {isCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {/* Bottom slider area (hidden if collapsed) */}
        {!isCollapsed && (
          <div style={{ position: 'relative', marginTop: 4 }}>
            {/* Shift blocks background bars */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
                height: 6,
                borderRadius: 3,
                backgroundColor: '#E2E8F0',
                pointerEvents: 'none',
                overflow: 'hidden',
              }}
            >
              {shiftBlocks.map((sb) => (
                <div
                  key={sb.id}
                  style={{
                    position: 'absolute',
                    left: `${sb.leftPercent}%`,
                    width: `${sb.widthPercent}%`,
                    top: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(16, 185, 129, 0.35)',
                    borderLeft: '1px solid #10B981',
                    borderRight: '1px solid #10B981',
                  }}
                />
              ))}
            </div>

            {/* Native slider element */}
            <input
              id="timeline-slider"
              type="range"
              min={minMinutes}
              max={maxMinutes}
              step={15}
              value={currentTimeMinutes}
              onChange={(e) => onTimeChange?.(Number(e.target.value))}
              style={{
                width: '100%',
                height: 14,
                appearance: 'none',
                background: 'transparent',
                cursor: 'pointer',
                position: 'relative',
                zIndex: 2,
                margin: 0,
              }}
            />

            {/* Time labels below slider */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 10,
                color: '#94A3B8',
                fontWeight: 600,
                marginTop: 2,
              }}
            >
              <span>06:00</span>
              <span>09:00</span>
              <span>12:00</span>
              <span>15:00</span>
              <span>18:00</span>
              <span>21:00</span>
              <span>23:00</span>
            </div>

            {/* Staffing Density & Understaffing Risk Heat Track */}
            <div
              style={{
                display: 'flex',
                height: 4,
                borderRadius: 2,
                overflow: 'hidden',
                marginTop: 4,
                backgroundColor: '#F1F5F9',
                gap: 1,
              }}
              title="Vạch nhiệt rủi ro nhân sự: Xanh = Đạt chuẩn, Vàng = Thiếu cục bộ, Đỏ = Trống nhân sự"
            >
              {heatBuckets.map((b, idx) => {
                const color =
                  b.status === 'optimal'
                    ? '#10B981'
                    : b.status === 'tight'
                    ? '#F59E0B'
                    : b.status === 'critical'
                    ? '#EF4444'
                    : '#CBD5E1';
                return (
                  <div
                    key={idx}
                    onClick={() => onTimeChange?.(b.minute)}
                    style={{
                      flex: 1,
                      backgroundColor: color,
                      cursor: 'pointer',
                      opacity: 0.85,
                      transition: 'opacity 0.15s ease',
                    }}
                    title={`${formatMinutesToTime(b.minute)}: ${b.count} nhân sự trực`}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
