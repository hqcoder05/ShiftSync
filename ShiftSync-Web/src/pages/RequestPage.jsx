import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getAllStores } from '../services/storeService';
import { getStoreLeaveRequests, getMyLeaveRequests } from '../services/leaveService';
import { getStoreAdjustmentRequests, getMyAdjustmentRequests } from '../services/adjustmentService';
import { getStoreSwapRequests, getMySwapRequests } from '../services/swapService';
import { getIncomingWorkforceRequests, getMyWorkforceProposals } from '../services/workforceService';
import { getMarketplaceShifts } from '../services/marketplaceService';
import {
  Clock,
  FileText,
  Calendar,
  ArrowLeftRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import './RequestPage.css';

export default function RequestPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');

  // Automatic Redirection for operational tabs
  useEffect(() => {
    if (rawTab === 'leave') {
      navigate('/time-workforce?tab=leave', { replace: true });
    } else if (rawTab === 'adjustments' || rawTab === 'adjustment' || rawTab === 'attendance') {
      navigate('/time-workforce?tab=adjustments', { replace: true });
    } else if (rawTab === 'swaps' || rawTab === 'swap') {
      navigate('/marketplace?tab=SWAP', { replace: true });
    } else if (rawTab === 'workforce' || rawTab === 'proposals') {
      navigate('/marketplace?tab=CROSS_STORE', { replace: true });
    }
  }, [rawTab, navigate]);

  // Context & Stats
  const userRole = (localStorage.getItem('userRole') || 'STAFF').toUpperCase();
  const isManager = userRole === 'MANAGER' || userRole === 'ADMIN';
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState(() => localStorage.getItem('selectedStoreId') || '');
  const [loading, setLoading] = useState(true);

  // Real-time domain metrics
  const [stats, setStats] = useState({
    pendingLeave: 0,
    pendingAdj: 0,
    openShifts: 0,
    pendingSwap: 0,
    pendingWorkforce: 0,
  });

  useEffect(() => {
    getAllStores().then((res) => {
      const list = res.data?.content || res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setStores(list);
      if (list.length > 0 && !storeId) {
        const firstId = String(list[0].id);
        setStoreId(firstId);
        localStorage.setItem('selectedStoreId', firstId);
      }
    });
  }, []);

  useEffect(() => {
    if (!storeId) return;
    setLoading(true);

    const loadStats = async () => {
      try {
        if (isManager) {
          const [leaveRes, adjRes, swapRes, wfRes, mktRes] = await Promise.allSettled([
            getStoreLeaveRequests(storeId, 'PENDING'),
            getStoreAdjustmentRequests(storeId),
            getStoreSwapRequests(storeId),
            getIncomingWorkforceRequests(storeId),
            getMarketplaceShifts(storeId),
          ]);

          const pendingLeave = leaveRes.status === 'fulfilled' && Array.isArray(leaveRes.value.data) ? leaveRes.value.data.length : 0;
          const pendingAdj = adjRes.status === 'fulfilled' && Array.isArray(adjRes.value.data)
            ? adjRes.value.data.filter((r) => r.status === 'PENDING').length
            : 0;
          const pendingSwap = swapRes.status === 'fulfilled' && Array.isArray(swapRes.value.data)
            ? swapRes.value.data.filter((s) => s.status === 'PENDING' || s.status === 'PENDING_MANAGER').length
            : 0;
          const pendingWf = wfRes.status === 'fulfilled' && Array.isArray(wfRes.value.data)
            ? wfRes.value.data.filter((r) => r.status === 'PENDING').length
            : 0;
          const openShifts = mktRes.status === 'fulfilled' && Array.isArray(mktRes.value.data)
            ? mktRes.value.data.length
            : (mktRes.value?.data?.content?.length || 0);

          setStats({ pendingLeave, pendingAdj, pendingSwap, pendingWorkforce: pendingWf, openShifts });
        } else {
          const [leaveRes, adjRes, swapRes, wfRes, mktRes] = await Promise.allSettled([
            getMyLeaveRequests(storeId),
            getMyAdjustmentRequests(storeId),
            getMySwapRequests(),
            getMyWorkforceProposals(),
            getMarketplaceShifts(storeId),
          ]);

          const pendingLeave = leaveRes.status === 'fulfilled' && Array.isArray(leaveRes.value.data)
            ? leaveRes.value.data.filter((r) => r.status === 'PENDING').length
            : 0;
          const pendingAdj = adjRes.status === 'fulfilled' && Array.isArray(adjRes.value.data)
            ? adjRes.value.data.filter((r) => r.status === 'PENDING').length
            : 0;
          const pendingSwap = swapRes.status === 'fulfilled' && Array.isArray(swapRes.value.data)
            ? swapRes.value.data.filter((s) => s.status === 'PENDING' || s.status === 'PENDING_MANAGER').length
            : 0;
          const pendingWf = wfRes.status === 'fulfilled' && Array.isArray(wfRes.value.data)
            ? wfRes.value.data.filter((p) => p.status === 'PENDING').length
            : 0;
          const openShifts = mktRes.status === 'fulfilled' && Array.isArray(mktRes.value.data)
            ? mktRes.value.data.length
            : (mktRes.value?.data?.content?.length || 0);

          setStats({ pendingLeave, pendingAdj, pendingSwap, pendingWorkforce: pendingWf, openShifts });
        }
      } catch (e) {
        console.error('Error loading operations stats:', e);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [storeId, isManager]);

  const currentStore = stores.find((s) => String(s.id) === String(storeId));

  return (
    <div className="req-container" style={{ display: 'block', maxWidth: '1240px', margin: '0 auto', padding: '24px 20px' }}>
      {/* Top Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: '#ffffff',
        borderRadius: '16px',
        padding: '24px 28px',
        marginBottom: '24px',
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.2)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{
              background: '#38bdf8',
              color: '#082f49',
              padding: '3px 10px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Quy hoạch luồng nghiệp vụ
            </span>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>
              Chi nhánh: <strong style={{ color: '#f8fafc' }}>{currentStore?.name || 'Mặc định'}</strong>
            </span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.3px' }}>
            Trung Tâm Điều Hướng Vận Hành &amp; Yêu Cầu (Operations Hub)
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#cbd5e1', maxWidth: '720px', lineHeight: '1.5' }}>
            Toàn bộ nghiệp vụ đã được chuẩn hóa vào 2 Domain chuyên biệt: <strong>Time &amp; Workforce</strong> (quản lý thời gian, chấm công, nghỉ phép) và <strong>Marketplace</strong> (điều phối nhân sự, bù ca thiếu, đổi ca và chi viện liên chi nhánh).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => navigate('/time-workforce')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '11px 18px',
              borderRadius: '10px',
              background: '#4f46e5',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700,
              fontSize: '13.5px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.35)',
              transition: 'all 0.2s'
            }}
          >
            <Clock size={16} />
            <span>Time &amp; Workforce</span>
            <ChevronRight size={15} />
          </button>

          <button
            type="button"
            onClick={() => navigate('/marketplace')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '11px 18px',
              borderRadius: '10px',
              background: '#10b981',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700,
              fontSize: '13.5px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
              transition: 'all 0.2s'
            }}
          >
            <ArrowLeftRight size={16} />
            <span>Marketplace</span>
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Main Two Domain Pillars */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '22px', marginBottom: '28px' }}>
        {/* DOMAIN 1: TIME & WORKFORCE */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #4f46e5, #6366f1)' }} />
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: '#e0e7ff',
                color: '#4338ca',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Clock size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#0f172a' }}>Time &amp; Workforce</h2>
                <span style={{ fontSize: '12.5px', color: '#64748b' }}>Quản lý thời gian &amp; Trạng thái nhân sự</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              {stats.pendingLeave > 0 && (
                <span style={{ background: '#fee2e2', color: '#991b1b', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '12px' }}>
                  {stats.pendingLeave} nghỉ phép
                </span>
              )}
              {stats.pendingAdj > 0 && (
                <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '12px' }}>
                  {stats.pendingAdj} giải trình
                </span>
              )}
            </div>
          </div>

          <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: '1.5', margin: '0 0 18px 0' }}>
            Nơi tập trung theo dõi hoạt động làm việc thực tế của nhân viên. Bao gồm chấm công trực tiếp, giải trình sai lệch giờ công, và xét duyệt nghỉ phép có preview đánh giá tác động nhân sự.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'auto' }}>
            <button
              type="button"
              onClick={() => navigate('/time-workforce?tab=attendance')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={16} color="#10b981" />
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}>Chấm công trực tiếp (Attendance)</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Bảng điểm danh ca theo thời gian thực</div>
                </div>
              </div>
              <ChevronRight size={16} color="#94a3b8" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/time-workforce?tab=adjustments')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: '10px',
                border: stats.pendingAdj > 0 ? '1px solid #fde68a' : '1px solid #e2e8f0',
                background: stats.pendingAdj > 0 ? '#fffbeb' : '#f8fafc',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={16} color="#d97706" />
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}>Giải trình điều chỉnh chấm công</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Xử lý quên quẹt thẻ, đi trễ về sớm</div>
                </div>
              </div>
              {stats.pendingAdj > 0 ? (
                <span style={{ background: '#f59e0b', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px' }}>
                  {stats.pendingAdj} chờ duyệt
                </span>
              ) : (
                <ChevronRight size={16} color="#94a3b8" />
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate('/time-workforce?tab=leave')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: '10px',
                border: stats.pendingLeave > 0 ? '1px solid #fecaca' : '1px solid #e2e8f0',
                background: stats.pendingLeave > 0 ? '#fef2f2' : '#f8fafc',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Calendar size={16} color="#ef4444" />
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}>Đơn xin nghỉ phép (Leave Requests)</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Đánh giá tác động nhân sự &amp; tự động tạo ca bù</div>
                </div>
              </div>
              {stats.pendingLeave > 0 ? (
                <span style={{ background: '#ef4444', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px' }}>
                  {stats.pendingLeave} chờ duyệt
                </span>
              ) : (
                <ChevronRight size={16} color="#94a3b8" />
              )}
            </button>
          </div>
        </div>

        {/* DOMAIN 2: MARKETPLACE */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #10b981, #059669)' }} />
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: '#d1fae5',
                color: '#065f46',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ArrowLeftRight size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#0f172a' }}>Workforce Marketplace</h2>
                <span style={{ fontSize: '12.5px', color: '#64748b' }}>Điều phối &amp; Bổ sung nhân sự thực tế</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              {stats.openShifts > 0 && (
                <span style={{ background: '#dcfce7', color: '#166534', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '12px' }}>
                  {stats.openShifts} ca mở
                </span>
              )}
              {stats.pendingSwap > 0 && (
                <span style={{ background: '#e0e7ff', color: '#3730a3', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '12px' }}>
                  {stats.pendingSwap} đổi ca
                </span>
              )}
            </div>
          </div>

          <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: '1.5', margin: '0 0 18px 0' }}>
            Trung tâm giải quyết các nhu cầu staffing: Ca trống sinh ra từ đơn nghỉ phép đã duyệt, đổi ca giữa nhân viên (yêu cầu đối tác đồng ý trước khi quản lý duyệt), và mượn nhân sự liên chi nhánh.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'auto' }}>
            <button
              type="button"
              onClick={() => navigate('/marketplace?tab=ALL')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: '10px',
                border: stats.openShifts > 0 ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                background: stats.openShifts > 0 ? '#f0fdf4' : '#f8fafc',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sparkles size={16} color="#16a34a" />
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}>Sàn ca mở &amp; Bù đắp thiếu hụt</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Nhận ca làm thêm giờ, phân công nhanh</div>
                </div>
              </div>
              {stats.openShifts > 0 ? (
                <span style={{ background: '#16a34a', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px' }}>
                  {stats.openShifts} ca trống
                </span>
              ) : (
                <ChevronRight size={16} color="#94a3b8" />
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate('/marketplace?tab=SWAP')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: '10px',
                border: stats.pendingSwap > 0 ? '1px solid #c7d2fe' : '1px solid #e2e8f0',
                background: stats.pendingSwap > 0 ? '#eef2ff' : '#f8fafc',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ArrowLeftRight size={16} color="#6366f1" />
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}>Hoán đổi ca làm (Shift Swap)</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Target đồng ý trước &rarr; Manager phê duyệt</div>
                </div>
              </div>
              {stats.pendingSwap > 0 ? (
                <span style={{ background: '#4f46e5', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px' }}>
                  {stats.pendingSwap} chờ duyệt
                </span>
              ) : (
                <ChevronRight size={16} color="#94a3b8" />
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate('/marketplace?tab=CROSS_STORE')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: '10px',
                border: stats.pendingWorkforce > 0 ? '1px solid #bae6fd' : '1px solid #e2e8f0',
                background: stats.pendingWorkforce > 0 ? '#f0f9ff' : '#f8fafc',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Building2 size={16} color="#0284c7" />
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}>Chi viện liên chi nhánh (Cross-Store)</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Mượn / cử nhân sự hỗ trợ cửa hàng khác</div>
                </div>
              </div>
              {stats.pendingWorkforce > 0 ? (
                <span style={{ background: '#0284c7', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px' }}>
                  {stats.pendingWorkforce} cần cử người
                </span>
              ) : (
                <ChevronRight size={16} color="#94a3b8" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Tips footer */}
      <div style={{
        background: '#f1f5f9',
        borderRadius: '12px',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        border: '1px solid #e2e8f0'
      }}>
        <AlertCircle size={20} color="#64748b" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.4' }}>
          <strong>Lưu ý nghiệp vụ:</strong> Khi quản lý phê duyệt đơn nghỉ phép tại <em>Time &amp; Workforce</em>, hệ thống sẽ tự động hủy phân công ca làm việc bị ảnh hưởng và đẩy vào sàn <em>Marketplace</em> để phân công bù hoặc cho nhân viên khác tiếp nhận.
        </div>
      </div>
    </div>
  );
}
