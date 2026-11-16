import SchedulePage from './SchedulePage';

/**
 * Dedicated route shell for the operational Digital Twin.
 * Data and schedule mutations deliberately remain in SchedulePage so the 2D
 * and 3D views cannot drift to different API contracts.
 */
export default function Store3DPage() {
  return <SchedulePage spatialOnly />;
}
