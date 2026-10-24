import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Link as LinkIcon, Upload, Check, ExternalLink } from 'lucide-react';

/**
 * ReadyPlayerMeCreatorModal
 * ─────────────────────────────────────────────────────────────────────────────
 * Modal tích hợp bộ tạo Avatar 3D Ready Player Me (Wolf3D) chuẩn theo bài viết:
 * "How to Use Three.js And React to Render a 3D Model of Your Self"
 * 
 * Hỗ trợ 3 phương thức:
 * 1. Mở Frame Creator trực tiếp: chụp ảnh selfie hoặc tự chọn tóc, da, trang phục.
 * 2. Dán link Ready Player Me GLB trực tiếp (https://models.readyplayer.me/...).
 * 3. Tải lên file .glb cá nhân từ máy tính.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function ReadyPlayerMeCreatorModal({
  isOpen,
  onClose,
  onAvatarReady,
  currentAvatarUrl = '',
}) {
  const [activeTab, setActiveTab] = useState('creator'); // 'creator' | 'url' | 'file'
  const [inputUrl, setInputUrl] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const iframeRef = useRef(null);

  // Ready Player Me Subdomain (shift-sync or generic readyplayer.me)
  const rpmSubdomain = 'demo'; // or custom readyplayer.me project
  const frameUrl = `https://${rpmSubdomain}.readyplayer.me/avatar?frameApi&bodyType=fullbody&clearCache`;

  // Listen for Ready Player Me PostMessage Events
  useEffect(() => {
    if (!isOpen) return;

    function handleRPMMessage(event) {
      const json = typeof event.data === 'string' ? safeParseJson(event.data) : event.data;
      if (!json || json.source !== 'readyplayerme') return;

      // Event: Avatar exported from Ready Player Me editor
      if (json.eventName === 'v1.avatar.exported') {
        const glbUrl = json.data?.url;
        if (glbUrl) {
          setIsExporting(true);
          if (onAvatarReady) {
            onAvatarReady(glbUrl);
          }
          setIsExporting(false);
          onClose();
        }
      }

      // Event: User requested to close editor
      if (json.eventName === 'v1.frame.close') {
        onClose();
      }
    }

    window.addEventListener('message', handleRPMMessage);
    return () => {
      window.removeEventListener('message', handleRPMMessage);
    };
  }, [isOpen, onAvatarReady, onClose]);

  if (!isOpen) return null;

  const handleApplyUrl = () => {
    const trimmed = inputUrl.trim();
    if (!trimmed) {
      setErrorMsg('Vui lòng nhập đường dẫn URL .glb');
      return;
    }
    if (!trimmed.endsWith('.glb') && !trimmed.includes('readyplayer.me')) {
      setErrorMsg('Đường dẫn phải là file 3D định dạng .glb hoặc liên kết Ready Player Me');
      return;
    }
    setErrorMsg('');
    if (onAvatarReady) {
      onAvatarReady(trimmed);
    }
    onClose();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.glb')) {
      setErrorMsg('Chỉ hỗ trợ file 3D định dạng .glb (GLTF Binary)');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    if (onAvatarReady) {
      onAvatarReady(objectUrl);
    }
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          width: '95%',
          maxWidth: 960,
          height: '90vh',
          maxHeight: 840,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#F8FAFC',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              backgroundColor: '#EEF2FF',
              color: '#4F46E5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Sparkles size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
                Bộ tạo Avatar 3D Chuẩn (Ready Player Me & Three.js)
              </h3>
              <p style={{ margin: 0, fontSize: 11.5, color: '#64748B' }}>
                Tạo thực thể 3D chân thực của bản thân từ ảnh chụp hoặc tùy biến đầy đủ trang phục
              </p>
            </div>
          </div>

          {/* Navigation Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              backgroundColor: '#E2E8F0',
              borderRadius: 8,
              padding: 3,
              display: 'flex',
              gap: 4,
            }}>
              <button
                type="button"
                onClick={() => setActiveTab('creator')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'creator' ? '#FFFFFF' : 'transparent',
                  color: activeTab === 'creator' ? '#0F172A' : '#64748B',
                  boxShadow: activeTab === 'creator' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                Trình tạo Online
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('url')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'url' ? '#FFFFFF' : 'transparent',
                  color: activeTab === 'url' ? '#0F172A' : '#64748B',
                  boxShadow: activeTab === 'url' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                Nhập link GLB
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('file')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'file' ? '#FFFFFF' : 'transparent',
                  color: activeTab === 'file' ? '#0F172A' : '#64748B',
                  boxShadow: activeTab === 'file' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                Tải file .glb
              </button>
            </div>

            <button
              onClick={onClose}
              style={{
                border: 'none',
                background: '#E2E8F0',
                borderRadius: '50%',
                width: 30,
                height: 30,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#475569',
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {/* Tab 1: Live Ready Player Me Creator Iframe */}
          {activeTab === 'creator' && (
            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
              <iframe
                ref={iframeRef}
                src={frameUrl}
                title="Ready Player Me Avatar Studio"
                allow="camera *; microphone *; clipboard-write"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  backgroundColor: '#0F172A',
                }}
              />
              <div style={{
                position: 'absolute',
                bottom: 12,
                left: 16,
                backgroundColor: 'rgba(15, 23, 42, 0.85)',
                color: '#E2E8F0',
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 11,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                backdropFilter: 'blur(4px)',
                pointerEvents: 'none',
              }}>
                <span> Thiết kế xong nhân vật, nhấn nút <strong>"Tiếp tục / Next"</strong> để tự động xuất và tải vào ShiftSync</span>
              </div>
            </div>
          )}

          {/* Tab 2: URL Input */}
          {activeTab === 'url' && (
            <div style={{
              padding: 32,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              maxWidth: 600,
              margin: '0 auto',
              textAlign: 'center',
              gap: 16,
            }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                backgroundColor: '#EEF2FF',
                color: '#4F46E5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <LinkIcon size={26} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0F172A' }}>
                  Dán đường dẫn Ready Player Me hoặc file GLB
                </h4>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748B' }}>
                  Bạn có thể tạo avatar trên trang{' '}
                  <a href="https://readyplayer.me" target="_blank" rel="noreferrer" style={{ color: '#4F46E5', textDecoration: 'underline' }}>
                    readyplayer.me
                  </a>
                  {' '}và sao chép link xuất bản dạng <code>https://models.readyplayer.me/...glb</code>
                </p>
              </div>

              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' }}>
                <input
                  type="text"
                  placeholder="https://models.readyplayer.me/62ea7bc28a6d28ec134bbcce.glb"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1.5px solid #CBD5E1',
                    fontSize: 13,
                    fontFamily: 'monospace',
                    outline: 'none',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                />
                {errorMsg && <span style={{ color: '#EF4444', fontSize: 12 }}>{errorMsg}</span>}
              </div>

              <div style={{ display: 'flex', gap: 10, width: '100%', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={handleApplyUrl}
                  style={{
                    backgroundColor: '#10B981',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 10,
                    padding: '10px 24px',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Check size={16} />
                  <span>Áp dụng Avatar này</span>
                </button>
              </div>
            </div>
          )}

          {/* Tab 3: Local File Upload */}
          {activeTab === 'file' && (
            <div style={{
              padding: 32,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              maxWidth: 550,
              margin: '0 auto',
              textAlign: 'center',
              gap: 18,
            }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                backgroundColor: '#F0FDF4',
                color: '#16A34A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Upload size={26} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0F172A' }}>
                  Tải lên tệp 3D (.glb) từ máy tính của bạn
                </h4>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748B' }}>
                  Hỗ trợ file mô hình 3D nhị phân chuẩn glTF 2.0 (tối ưu hóa dưới 10MB)
                </p>
              </div>

              <label style={{
                border: '2px dashed #CBD5E1',
                borderRadius: 12,
                padding: '30px 20px',
                width: '100%',
                boxSizing: 'border-box',
                cursor: 'pointer',
                backgroundColor: '#F8FAFC',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
              }}>
                <input
                  type="file"
                  accept=".glb"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>
                  Bấm để chọn file hoặc kéo thả tệp .glb vào đây
                </span>
                <span style={{ fontSize: 11, color: '#94A3B8' }}>
                  Định dạng yêu cầu: .glb (Binary glTF)
                </span>
              </label>

              {errorMsg && <span style={{ color: '#EF4444', fontSize: 12 }}>{errorMsg}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function safeParseJson(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
}
