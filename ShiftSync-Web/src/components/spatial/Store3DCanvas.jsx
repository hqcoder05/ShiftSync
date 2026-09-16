/**
 * Store3DCanvas.jsx
 * Entrypoint for Store 3D Spatial Visualization.
 * Re-exports the high-quality, Play Together-inspired SpatialWorkspace feature.
 */

import SpatialWorkspace from '../../features/spatial-workspace/SpatialWorkspace';

export default function Store3DCanvas(props) {
  return <SpatialWorkspace {...props} />;
}
