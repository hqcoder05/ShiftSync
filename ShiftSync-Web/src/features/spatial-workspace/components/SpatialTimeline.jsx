import { useState } from 'react';
import { Play, Pause, RotateCcw, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { getShiftTimeRange, formatShiftMinute } from '../utils/shiftTimeRange.js';
import './store-explorer.css';
export default function SpatialTimeline({ currentTimeMinutes = 0, onTimeChange, isPlaying = false, onTogglePlay, playSpeed = 1, onChangePlaySpeed, activeStaffCount = 0, activeShift, isDrawerOpen = true }) {
 const [collapsed, setCollapsed] = useState(false);
 const range = getShiftTimeRange(activeShift);
 const value = Math.max(range.start, Math.min(range.end, currentTimeMinutes));
 return <div className={`se-timeline ${isDrawerOpen ? 'se-timeline--docked' : ''}`} aria-label="Dòng thời gian ca">
  <div className="se-time-heading"><div className="se-time-controls">
   <button type="button" className="se-icon-button" disabled={!activeShift} onClick={onTogglePlay} aria-label={isPlaying ? 'Dừng phát ca' : 'Phát diễn biến ca'}>{isPlaying ? <Pause size={15}/> : <Play size={15}/>}</button>
   <strong>{formatShiftMinute(value)}</strong><span className="se-time-mode">Xem diễn biến ca</span>
   <button type="button" className="se-icon-button" disabled={!activeShift} onClick={()=>onTimeChange?.(range.start)} aria-label="Về đầu ca"><RotateCcw size={14}/></button>
   <select aria-label="Tốc độ phát" value={playSpeed} onChange={event=>onChangePlaySpeed?.(Number(event.target.value))}><option value={1}>1×</option><option value={2}>2×</option><option value={5}>5×</option></select>
  </div><div className="se-time-controls"><span><Users size={13}/> {activeStaffCount} phân công</span><button type="button" className="se-icon-button" aria-label={collapsed ? 'Mở dòng thời gian' : 'Thu dòng thời gian'} aria-expanded={!collapsed} onClick={()=>setCollapsed(!collapsed)}>{collapsed ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}</button></div></div>
  {!collapsed && <><input aria-label="Thời điểm trong ca" type="range" min={range.start} max={range.end} step={1} value={value} disabled={!activeShift} onChange={event=>onTimeChange?.(Number(event.target.value))}/><div className="se-time-labels"><span>{formatShiftMinute(range.start)}</span><span>{activeShift ? activeShift.name || 'Ca đang chọn' : 'Chọn ca để xem phân công'}</span><span>{formatShiftMinute(range.end)}</span></div><small>Phân công theo mốc giờ · Điểm danh theo dữ liệu đã tải</small></>}
 </div>;
}
