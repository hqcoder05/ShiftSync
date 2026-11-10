import React, { memo } from 'react';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { colors } from '../theme/koreanPalette';

// Quiet, consistent outlines keep navigation legible at a small size.
function NavigationIcon({ screen, active = false, size = 25 }) {
  const color = active ? colors.primaryStrong : colors.muted;
  return <Svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable={false}>
    <G stroke={color} strokeWidth={active ? 2.1 : 1.8} strokeLinecap="round" strokeLinejoin="round" fill="none">
      {screen === 'Dashboard' && <>
        <Path d="m3 10 7.6-6.1a2.2 2.2 0 0 1 2.8 0L21 10" />
        <Path d="M5.2 9v10a1.8 1.8 0 0 0 1.8 1.8h10a1.8 1.8 0 0 0 1.8-1.8V9" />
        <Path d="M9.3 20.8v-6.3h5.4v6.3" />
      </>}
      {screen === 'Schedule' && <>
        <Rect x={3.5} y={5.5} width={17} height={15.2} rx={2.6} />
        <Path d="M7.5 3.3v4.3M16.5 3.3v4.3M3.5 10.2h17" />
        <Circle cx={8} cy={14.4} r={0.65} fill={color} stroke="none" />
        <Circle cx={12} cy={14.4} r={0.65} fill={color} stroke="none" />
        <Circle cx={16} cy={14.4} r={0.65} fill={color} stroke="none" />
        <Circle cx={8} cy={17.6} r={0.65} fill={color} stroke="none" />
        <Circle cx={12} cy={17.6} r={0.65} fill={color} stroke="none" />
      </>}
      {screen === 'Attendance' && <>
        <Circle cx={12} cy={12} r={8.6} />
        <Path d="M12 7.2v5l3.2 2" />
      </>}
      {screen === 'Messaging' && <Path d="M7.2 4.2h9.6a4 4 0 0 1 4 4v6.1a4 4 0 0 1-4 4h-6.6l-5.8 3 .6-4A4 4 0 0 1 3.2 14V8.2a4 4 0 0 1 4-4ZM8 9.4h8M8 13.3h5.2" />}
      {screen === 'More' && <Path d="M4.2 6.2h15.6M4.2 12h15.6M4.2 17.8h15.6" />}
    </G>
  </Svg>;
}

export default memo(NavigationIcon);
