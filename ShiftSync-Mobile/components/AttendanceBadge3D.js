import { Platform } from 'react-native';

let AttendanceBadge3D;
if (Platform.OS === 'web') {
  AttendanceBadge3D = require('./AttendanceBadge3D.web').default;
} else {
  AttendanceBadge3D = require('./AttendanceBadge3D.native').default;
}

export default AttendanceBadge3D;
