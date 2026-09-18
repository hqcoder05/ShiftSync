import { Platform } from 'react-native';

let PaperPlane3D;
if (Platform.OS === 'web') {
  PaperPlane3D = require('./PaperPlane3D.web').default;
} else {
  PaperPlane3D = require('./PaperPlane3D.native').default;
}

export default PaperPlane3D;
