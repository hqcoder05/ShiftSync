import { useState, useEffect, useRef, useCallback } from 'react';
import { X, RefreshCw, QrCode, Clock, Store, ShieldCheck, AlertCircle } from 'lucide-react';
import QRCode from 'qrcode';
import { getAttendanceQrCode } from '../../services/attendanceService';

export default function ShiftQrModal({ isOpen, onClose, storeId, shift, storeName }) {
  const [qrToken, setQrToken] = useState('');
  const [qrImageUrl, setQrImageUrl] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const timerRef = useRef(null);
  const shiftId = shift?.id;

  const fetchQr = useCallback(async () => {
    if (!storeId || !shiftId) return;
    setLoading(true);
    setError('');
    try {
      const res = await getAttendanceQrCode(storeId, shiftId);
      const data = res.data;
      if (data?.qrToken) {
        const imageUrl = await QRCode.toDataURL(data.qrToken, {
          width: 260,
          margin: 1,
          errorCorrectionLevel: 'M',
        });
        setQrToken(data.qrToken);
        setQrImageUrl(imageUrl);
        const seconds = Math.max(10, Math.floor((data.expiresInMs || 60000) / 1000));
        setCountdown(seconds);
      } else {
        setError('Không nhận được mã QR hợp lệ từ máy chủ.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tạo mã QR cho ca này.');
    } finally {
      setLoading(false);
    }
  }, [storeId, shiftId]);

  useEffect(() => {
    if (isOpen) {
      const requestId = setTimeout(() => { void fetchQr(); }, 0);
      return () => clearTimeout(requestId);
    } else if (timerRef.current) clearInterval(timerRef.current);
    return undefined;
  }, [isOpen, fetchQr]);

  useEffect(() => {
    if (countdown > 0) {
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            fetchQr();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [countdown, fetchQr]);

  if (!isOpen || !shift) return null;

  const shiftTitle = shift.name || shift.note || `Ca ${String(shift.startTime || '').slice(0, 5)} - ${String(shift.endTime || '').slice(0, 5)}`;
  const timeText = `${String(shift.startTime || '').slice(0, 5)} - ${String(shift.endTime || '').slice(0, 5)}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '440px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
            color: '#ffffff',
            padding: '20px 24px',
            position: 'relative',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <QrCode size={22} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Mã QR Chấm Công Ca Làm</h3>
              <p style={{ margin: '2px 0 0', fontSize: '13px', opacity: 0.9 }}>
                Trình chiếu tại cửa hàng để nhân viên quét vào ca
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', textAlign: 'center' }}>
          {/* Shift Details Summary */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '20px',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              fontSize: '13px',
              color: '#334155',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>
              <span>{shiftTitle}</span>
              <span style={{ fontSize: '12px', fontWeight: 500, color: '#0284c7', background: '#e0f2fe', padding: '2px 8px', borderRadius: '12px' }}>
                {shift.shiftDate || 'Hôm nay'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} color="#0284c7" /> {timeText}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Store size={14} color="#0284c7" /> {storeName || 'Chi nhánh'}
              </span>
            </div>
          </div>

          {/* QR Container */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '270px',
            }}
          >
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: '#64748b' }}>
                <RefreshCw size={32} className="animate-spin" color="#0284c7" />
                <span style={{ fontSize: '14px' }}>Đang tạo mã QR bảo mật từ máy chủ...</span>
              </div>
            ) : error ? (
              <div
                style={{
                  padding: '24px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '12px',
                  color: '#991b1b',
                  fontSize: '13px',
                }}
              >
                <AlertCircle size={28} color="#dc2626" style={{ margin: '0 auto 8px' }} />
                <p style={{ margin: '0 0 12px 0', fontWeight: 600 }}>{error}</p>
                <button
                  type="button"
                  onClick={fetchQr}
                  style={{
                    padding: '8px 16px',
                    background: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Thử lại
                </button>
              </div>
            ) : qrToken ? (
              <div>
                <div
                  style={{
                    padding: '12px',
                    background: '#ffffff',
                    border: '2px dashed #0284c7',
                    borderRadius: '16px',
                    display: 'inline-block',
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.08)',
                  }}
                >
                  <img
                    src={qrImageUrl}
                    alt="Shift QR Code"
                    style={{
                      width: '240px',
                      height: '240px',
                      display: 'block',
                      borderRadius: '8px',
                    }}
                  />
                </div>

                {/* Countdown & Refresh */}
                <div
                  style={{
                    marginTop: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    fontSize: '13px',
                  }}
                >
                  <span style={{ color: countdown <= 10 ? '#dc2626' : '#64748b', fontWeight: countdown <= 10 ? 700 : 500 }}>
                    Tự động làm mới sau: <strong>{countdown}s</strong>
                  </span>
                  <button
                    type="button"
                    onClick={fetchQr}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'none',
                      border: 'none',
                      color: '#0284c7',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '4px 8px',
                    }}
                  >
                    <RefreshCw size={13} /> Làm mới ngay
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {/* Security badge / Footer note */}
          <div
            style={{
              marginTop: '18px',
              paddingTop: '16px',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '12px',
              color: '#059669',
              fontWeight: 500,
            }}
          >
            <ShieldCheck size={16} />
            <span>Mã bảo mật chống gian lận &amp; xác thực thời gian thực</span>
          </div>
        </div>
      </div>
    </div>
  );
}
