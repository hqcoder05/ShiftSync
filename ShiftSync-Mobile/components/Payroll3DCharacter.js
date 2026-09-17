import { Platform } from 'react-native';
import Payroll3DCharacterWeb from './Payroll3DCharacter.web';
import Payroll3DCharacterNative from './Payroll3DCharacter.native';

const Payroll3DCharacter = Platform.OS === 'web' ? Payroll3DCharacterWeb : Payroll3DCharacterNative;
export default Payroll3DCharacter;
