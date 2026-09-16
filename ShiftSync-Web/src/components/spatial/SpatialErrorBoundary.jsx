import React from 'react';

/**
 * SpatialErrorBoundary
 * Traps any WebGL/Three.js context or shader rendering failures,
 * preventing any crash of the host dashboard or schedule management.
 */
export class SpatialErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('[Spatial3D] WebGL or Three.js error caught by boundary:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: '100%',
          height: '100%',
          minHeight: 380,
          backgroundColor: '#F8FAFC',
          borderRadius: 14,
          border: '1px dashed #CBD5E1',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          textAlign: 'center',
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: '#FEE2E2',
            color: '#DC2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            marginBottom: 12,
          }}>
            ⚠️
          </div>
          <h4 style={{ margin: '0 0 6px 0', fontSize: 16, color: '#1E293B', fontWeight: 600 }}>
            Không thể tải giao diện 3D Không gian
          </h4>
          <p style={{ margin: '0 0 16px 0', fontSize: 13, color: '#64748B', maxWidth: 420, lineHeight: 1.5 }}>
            Trình duyệt hoặc phần cứng đồ họa gặp sự cố khi khởi tạo WebGL. Bạn có thể thử tải lại hoặc chuyển sang chế độ Sơ đồ 2D.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={this.handleRetry}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#334155',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              🔄 Thử lại
            </button>
            {this.props.onSwitchTo2D && (
              <button
                type="button"
                onClick={this.props.onSwitchTo2D}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: '#51A33D',
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                📐 Chuyển sang Sơ đồ 2D
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SpatialErrorBoundary;
