import React, { useState, useEffect } from 'react';
import { Sparkles, Camera, RotateCcw, Check, ExternalLink, Sliders, Palette, RefreshCw } from 'lucide-react';
import ReadyPlayerMeViewer from '../components/ReadyPlayerMeViewer';
import ReadyPlayerMeCreatorModal from '../components/ReadyPlayerMeCreatorModal';
import { useToast } from '../context/ToastContext';

/**
 * AvatarStudioPage
 * ─────────────────────────────────────────────────────────────────────────────
 * Trang Studio 3D Avatar cá nhân hóa theo phong cách bài viết DEV Community:
 * "How to Use Three.js And React to Render a 3D Model of Your Self"
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function AvatarStudioPage() {
  const { showToast } = useToast?.() || { showToast: alert };

  // Local storage key for custom user 3D avatar GLB
  const savedGlbUrl = typeof localStorage !== 'undefined' ? localStorage.getItem('user_profile_avatar_glb') : null;
  const [currentModelUrl, setCurrentModelUrl] = useState(savedGlbUrl || '/models/ShiftSync_Barista.glb');
  const [cameraPreset, setCameraPreset] = useState('full'); // 'full' | 'upper' | 'face'
  const [autoRotate, setAutoRotate] = useState(true);
  const [themeMode, setThemeMode] = useState('dark'); // 'dark' | 'light'
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);

  // Sync to localStorage
  const handleSetAsMyAvatar = () => {
    try {
      localStorage.setItem('user_profile_avatar_glb', currentModelUrl);
      if (showToast) {
        showToast('Đã lưu Avatar 3D thành công! Thực thể 3D này sẽ xuất hiện trong không gian làm việc.', 'success');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAvatarReady = (url) => {
    setCurrentModelUrl(url);
    try {
      localStorage.setItem('user_profile_avatar_glb', url);
      if (showToast) {
        showToast('Đã nạp thành công mô hình Avatar 3D từ Ready Player Me!', 'success');
      }
    } catch (e) {}
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 70px)',
      minHeight: 700,
      backgroundColor: '#0B1116',
      color: '#FFFFFF',
      fontFamily: 'Inter, system-ui, sans-serif',
      overflow: 'hidden',
    }}>
      {/* Top Studio Control Bar */}
      <div style={{
        padding: '12px 24px',
        backgroundColor: '#111A21',
        borderBottom: '1px solid #1E293B',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        {/* Title & Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #10B981, #059669)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
          }}>
            <Sparkles size={20} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em' }}>
                3D Avatar Studio (Three.js & React)
              </h2>
              <span style={{
                fontSize: 10.5,
                fontWeight: 700,
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#34D399',
                padding: '2px 8px',
                borderRadius: 99,
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}>
                Ready Player Me Powered
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 11.5, color: '#94A3B8' }}>
              Dựng thực thể nhân vật 3D hoàn chỉnh không ghép layer • Chuẩn glTF 2.0 Binary Rigged Humanoid
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Preset Buttons */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#1E293B',
            borderRadius: 8,
            padding: 3,
            gap: 2,
          }}>
            <button
              type="button"
              onClick={() => setCameraPreset('face')}
              style={{
                padding: '5px 11px',
                borderRadius: 6,
                border: 'none',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: cameraPreset === 'face' ? '#10B981' : 'transparent',
                color: '#FFFFFF',
              }}
            >
              Gương mặt
            </button>
            <button
              type="button"
              onClick={() => setCameraPreset('upper')}
              style={{
                padding: '5px 11px',
                borderRadius: 6,
                border: 'none',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: cameraPreset === 'upper' ? '#10B981' : 'transparent',
                color: '#FFFFFF',
              }}
            >
              Nửa thân trên
            </button>
            <button
              type="button"
              onClick={() => setCameraPreset('full')}
              style={{
                padding: '5px 11px',
                borderRadius: 6,
                border: 'none',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: cameraPreset === 'full' ? '#10B981' : 'transparent',
                color: '#FFFFFF',
              }}
            >
              Toàn thân
            </button>
          </div>

          {/* Turntable Auto-Rotate Toggle */}
          <button
            type="button"
            onClick={() => setAutoRotate(!autoRotate)}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid #334155',
              backgroundColor: autoRotate ? 'rgba(56, 189, 248, 0.15)' : '#1E293B',
              color: autoRotate ? '#38BDF8' : '#94A3B8',
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <RotateCcw size={13} />
            <span>Xoay 360° {autoRotate ? 'Bật' : 'Tắt'}</span>
          </button>

          {/* Create with Ready Player Me */}
          <button
            type="button"
            onClick={() => setIsCreatorOpen(true)}
            style={{
              padding: '7px 15px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: '#4F46E5',
              color: '#FFFFFF',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 8px rgba(79, 70, 229, 0.35)',
            }}
          >
            <Sparkles size={14} />
            <span>Tạo mới bằng Ready Player Me</span>
          </button>

          {/* Set as My Avatar */}
          <button
            type="button"
            onClick={handleSetAsMyAvatar}
            style={{
              padding: '7px 15px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: '#10B981',
              color: '#FFFFFF',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)',
            }}
          >
            <Check size={14} />
            <span>Đặt làm Avatar của tôi</span>
          </button>
        </div>
      </div>

      {/* Main 3D Canvas Stage */}
      <div style={{ flex: 1, position: 'relative' }}>
        <ReadyPlayerMeViewer
          avatarUrl={currentModelUrl}
          cameraTarget={cameraPreset}
          autoRotate={autoRotate}
          theme={themeMode}
        />

        {/* Floating Quick Action Overlay */}
        <div style={{
          position: 'absolute',
          bottom: 20,
          left: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          backgroundColor: 'rgba(17, 26, 33, 0.85)',
          backdropFilter: 'blur(8px)',
          padding: '12px 16px',
          borderRadius: 12,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          maxWidth: 380,
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#38BDF8', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Mô hình đang nạp:</span>
            <span style={{ color: '#E2E8F0', fontWeight: 500, fontSize: 11, wordBreak: 'break-all' }}>
              {currentModelUrl.startsWith('data:') ? 'Tệp GLB Tải lên' : currentModelUrl}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setCurrentModelUrl('/models/ShiftSync_Barista.glb')}
              style={{
                padding: '6px 11px',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.15)',
                backgroundColor: currentModelUrl === '/models/ShiftSync_Barista.glb' ? '#10B981' : 'rgba(255,255,255,0.06)',
                color: '#FFFFFF',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
               Barista Hiện Đại
            </button>
            <button
              type="button"
              onClick={() => setCurrentModelUrl('/models/ShiftSync_Manager.glb')}
              style={{
                padding: '6px 11px',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.15)',
                backgroundColor: currentModelUrl === '/models/ShiftSync_Manager.glb' ? '#10B981' : 'rgba(255,255,255,0.06)',
                color: '#FFFFFF',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
               Quản Lý (Polo)
            </button>
            <button
              type="button"
              onClick={() => setCurrentModelUrl('/models/ShiftSync_Cashier.glb')}
              style={{
                padding: '6px 11px',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.15)',
                backgroundColor: currentModelUrl === '/models/ShiftSync_Cashier.glb' ? '#10B981' : 'rgba(255,255,255,0.06)',
                color: '#FFFFFF',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
               Thu Ngân / Dịch Vụ
            </button>
            <button
              type="button"
              onClick={() => setCurrentModelUrl('/models/ShiftSync_Chef.glb')}
              style={{
                padding: '6px 11px',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.15)',
                backgroundColor: currentModelUrl === '/models/ShiftSync_Chef.glb' ? '#10B981' : 'rgba(255,255,255,0.06)',
                color: '#FFFFFF',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
               Bếp Bánh Ngọt
            </button>
            <button
              type="button"
              onClick={() => setIsCreatorOpen(true)}
              style={{
                padding: '6px 11px',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.15)',
                backgroundColor: 'rgba(79, 70, 229, 0.25)',
                color: '#A5B4FC',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Tùy Biến Thêm 
            </button>
          </div>

          <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
             Dùng chuột trái xoay 360°, cuộn chuột để phóng to/thu nhỏ, click phím preset để đổi góc nhìn.
          </div>
        </div>

        {/* Theme mode toggle */}
        <div style={{
          position: 'absolute',
          top: 16,
          right: 20,
          display: 'flex',
          gap: 6,
        }}>
          <button
            type="button"
            onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backgroundColor: 'rgba(17, 26, 33, 0.8)',
              color: '#FFFFFF',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              backdropFilter: 'blur(6px)',
            }}
          >
            {themeMode === 'dark' ? ' Studio Sáng' : ' Studio Tối'}
          </button>
        </div>
      </div>

      {/* Ready Player Me Creator Modal */}
      <ReadyPlayerMeCreatorModal
        isOpen={isCreatorOpen}
        onClose={() => setIsCreatorOpen(false)}
        onAvatarReady={handleAvatarReady}
        currentAvatarUrl={currentModelUrl}
      />
    </div>
  );
}
