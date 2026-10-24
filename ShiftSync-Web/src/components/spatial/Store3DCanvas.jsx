/**
 * Store3DCanvas.jsx
 * Entrypoint for Store 3D Spatial Visualization.
 * Re-exports the high-quality, Play Together-inspired SpatialWorkspace feature.
 */

import { lazy, Suspense } from 'react';

const SpatialWorkspace = lazy(() => import('../../features/spatial-workspace/SpatialWorkspace'));

function Spatial3DLoadingSkeleton() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        minHeight: 600,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8FAFC',
        color: '#475569',
        fontFamily: 'Inter, sans-serif',
        gap: 12,
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          border: '3.5px solid #E2E8F0',
          borderTopColor: '#3B82F6',
          borderRadius: '50%',
          animation: 'ss3d-spin 0.8s linear infinite',
        }}
      />
      <span style={{ fontSize: 13.5, fontWeight: 600, color: '#334155' }}>
        Đang khởi tạo mô hình 3D Digital Twin...
      </span>
      <style>{`@keyframes ss3d-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function Store3DCanvas(props) {
  return (
    <Suspense fallback={<Spatial3DLoadingSkeleton />}>
      <SpatialWorkspace {...props} />
    </Suspense>
  );
}
