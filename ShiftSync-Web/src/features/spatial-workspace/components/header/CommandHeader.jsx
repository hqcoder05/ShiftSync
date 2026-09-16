/**
 * CommandHeader.jsx
 * Global Command Header for the ShiftSync Workforce Command Center.
 * 
 * Provides:
 * - Store selection & status context
 * - Active Date & Shift context
 * - Attention Center badge (count of critical issues / understaffed zones)
 * - Simulation sandbox status indicator
 * - Primary operational actions: [Auto-Schedule], [Simulation Room], [Publish Schedule]
 */

import React from 'react';
import {
  Building2,
  Calendar,
  Clock,
  AlertTriangle,
  FlaskConical,
  Sparkles,
  Send,
} from 'lucide-react';

export default function CommandHeader({
  storeName = 'Chi nhánh cửa hàng',
  stores = [],
  selectedStoreId,
  onSelectStore,
  activeDate,
  currentShift,
  allDateShifts = [],
  onSelectShift,
  attentionCount = 0,
  onOpenAttentionCenter,
  isSimulating = false,
  onToggleSimulation,
  onOpenAutoSchedule,
  onPublishSchedule,
  isDrawerOpen = true,
  onToggleDrawer,
}) {
  const formattedDate = activeDate
    ? new Intl.DateTimeFormat('vi-VN', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(activeDate))
    : 'Hôm nay';

  return (
    <header
      style={{
        height: 52,
        backgroundColor: '#0F172A',
        color: '#F8FAFC',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        borderBottom: isSimulating ? '2px solid #F59E0B' : '1px solid #1E293B',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
        zIndex: 30,
        position: 'relative',
        userSelect: 'none',
      }}
    >
      {/* Left: Brand + Store Selector + Date/Shift Context */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: 14,
              color: '#FFFFFF',
              letterSpacing: -0.5,
            }}
          >
            S
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 0.5, color: '#FFFFFF', lineHeight: 1.1 }}>
              SHIFTSYNC
            </span>
            <span style={{ fontSize: 9.5, color: '#94A3B8', fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase' }}>
              Command Center
            </span>
          </div>
        </div>

        <div style={{ width: 1, height: 24, backgroundColor: '#334155' }} />

        {/* Store Selector Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Building2 size={15} color="#94A3B8" />
          {stores && stores.length > 1 ? (
            <select
              value={selectedStoreId || ''}
              onChange={(e) => onSelectStore?.(e.target.value)}
              style={{
                backgroundColor: '#1E293B',
                color: '#F8FAFC',
                border: '1px solid #334155',
                borderRadius: 6,
                padding: '4px 10px',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id} style={{ backgroundColor: '#0F172A', color: '#F8FAFC' }}>
                  {s.name}
                </option>
              ))}
            </select>
          ) : (
            <span style={{ fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>
              {storeName}
            </span>
          )}
        </div>

        <div style={{ width: 1, height: 24, backgroundColor: '#334155' }} />

        {/* Date Context */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#CBD5E1' }}>
          <Calendar size={14} color="#94A3B8" />
          <span style={{ fontWeight: 600 }}>{formattedDate}</span>
        </div>

        {/* Active Shift Selector */}
        {allDateShifts && allDateShifts.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={14} color="#94A3B8" />
            <select
              value={currentShift?.id || ''}
              onChange={(e) => {
                const found = allDateShifts.find((s) => String(s.id) === String(e.target.value));
                onSelectShift?.(found || null);
              }}
              style={{
                backgroundColor: '#1E293B',
                color: '#F8FAFC',
                border: '1px solid #334155',
                borderRadius: 6,
                padding: '3px 8px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {allDateShifts.map((s) => (
                <option key={s.id} value={s.id} style={{ backgroundColor: '#0F172A', color: '#F8FAFC' }}>
                  {s.name || s.templateName || 'Ca làm'} ({s.startTime || '08:00'} - {s.endTime || '16:00'})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Center: Simulation Status or Live Telemetry */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {isSimulating ? (
          <div
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid #F59E0B',
              borderRadius: 20,
              padding: '4px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
              fontWeight: 700,
              color: '#FBBF24',
              boxShadow: '0 0 12px rgba(245, 158, 11, 0.25)',
            }}
          >
            <FlaskConical size={14} />
            <span>CHẾ ĐỘ MÔ PHỎNG (SANDBOX) — DỮ LIỆU ĐỘC LẬP</span>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: 20,
              padding: '3px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11.5,
              fontWeight: 600,
              color: '#34D399',
            }}
          >
            <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#10B981' }} />
            <span>VẬN HÀNH THỜI GIAN THỰC</span>
          </div>
        )}
      </div>

      {/* Right: Attention Center Trigger + Operational Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Attention Center Action Badge */}
        <button
          type="button"
          onClick={onOpenAttentionCenter}
          title="Mở Attention Center xem các sự cố nhân sự cần giải quyết"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            borderRadius: 8,
            backgroundColor: attentionCount > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(148, 163, 184, 0.1)',
            border: attentionCount > 0 ? '1px solid #EF4444' : '1px solid #334155',
            color: attentionCount > 0 ? '#FCA5A5' : '#94A3B8',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <AlertTriangle size={14} color={attentionCount > 0 ? '#EF4444' : '#94A3B8'} />
          <span>{attentionCount > 0 ? `${attentionCount} Cảnh báo khu vực` : 'Không có sự cố'}</span>
        </button>

        {/* Auto-Schedule Action */}
        <button
          type="button"
          onClick={onOpenAutoSchedule}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            borderRadius: 8,
            backgroundColor: '#1E293B',
            border: '1px solid #3B82F6',
            color: '#60A5FA',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Sparkles size={14} />
          <span>Auto-Schedule</span>
        </button>

        {/* Simulation Mode Toggle Button */}
        <button
          type="button"
          onClick={onToggleSimulation}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            borderRadius: 8,
            backgroundColor: isSimulating ? '#F59E0B' : '#1E293B',
            border: isSimulating ? '1px solid #F59E0B' : '1px solid #64748B',
            color: isSimulating ? '#0F172A' : '#E2E8F0',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <FlaskConical size={14} />
          <span>{isSimulating ? 'Thoát Mô Phỏng' : 'Simulation Room'}</span>
        </button>

        {/* Publish Schedule Action */}
        <button
          type="button"
          onClick={onPublishSchedule}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 14px',
            borderRadius: 8,
            backgroundColor: '#2563EB',
            border: 'none',
            color: '#FFFFFF',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.35)',
            transition: 'all 0.15s ease',
          }}
        >
          <Send size={13} />
          <span>Lưu & Phát Hành</span>
        </button>
      </div>
    </header>
  );
}
