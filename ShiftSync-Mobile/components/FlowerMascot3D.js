import { Platform } from 'react-native';
import FlowerMascot3DWeb from './FlowerMascot3D.web';
import FlowerMascot3DNative from './FlowerMascot3D.native';

const FlowerMascot3D = Platform.OS === 'web' ? FlowerMascot3DWeb : FlowerMascot3DNative;
export default FlowerMascot3D;
