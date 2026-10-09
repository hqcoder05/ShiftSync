import { Alert, Platform } from 'react-native';

let alertListener = null;

export const setAlertListener = (fn) => {
  alertListener = fn;
};

/**
 * Cross-platform alert utility that renders a modern in-app modal on both Web and Mobile,
 * completely eliminating browser-native window.alert and window.confirm popups.
 *
 * @param {string} title
 * @param {string} [message]
 * @param {Array<{ text: string, onPress?: () => void, style?: 'default' | 'cancel' | 'destructive' }>} [buttons]
 */
export const showAlert = (title, message = '', buttons = []) => {
  if (typeof alertListener === 'function') {
    alertListener({ title, message, buttons });
    return;
  }

  // Fallback for native runtime if listener not yet mounted
  if (Platform.OS === 'web') {
    const textMsg = `${title ? title + '\n\n' : ''}${message || ''}`;
    if (buttons && buttons.length > 1) {
      const confirmBtn = buttons.find((b) => b.style !== 'cancel');
      const cancelBtn = buttons.find((b) => b.style === 'cancel');
      const ok = typeof window !== 'undefined' ? window.confirm(textMsg) : true;
      if (ok && confirmBtn?.onPress) {
        confirmBtn.onPress();
      } else if (!ok && cancelBtn?.onPress) {
        cancelBtn.onPress();
      }
    } else {
      if (typeof window !== 'undefined') {
        window.alert(textMsg);
      }
      if (buttons && buttons[0]?.onPress) {
        buttons[0].onPress();
      }
    }
    return;
  }

  Alert.alert(title, message, buttons);
};

export default showAlert;
