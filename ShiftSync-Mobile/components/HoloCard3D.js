import { Platform } from 'react-native';

let HoloCard3D;
if (Platform.OS === 'web') {
  HoloCard3D = require('./HoloCard3D.web').default;
} else {
  HoloCard3D = require('./HoloCard3D.native').default;
}

export default HoloCard3D;
