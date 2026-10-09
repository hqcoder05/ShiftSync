import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { setAlertListener } from '../utils/alert';

export default function CustomAlertModal() {
  const [config, setConfig] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.92));

  useEffect(() => {
    setAlertListener((newConfig) => {
      setConfig(newConfig);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    });

    return () => setAlertListener(null);
  }, []);

  if (!config) return null;

  const handleClose = (callback) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setConfig(null);
      if (typeof callback === 'function') {
        callback();
      }
    });
  };

  const { title = '', message = '', buttons = [] } = config;

  // Determine modal icon and color based on title & message keywords
  const titleLower = title.toLowerCase();
  const msgLower = message.toLowerCase();

  let iconEmoji = 'ℹ️';
  let badgeColor = '#EFF6FF';
  let badgeBorder = '#BFDBFE';
  let iconColor = '#2563EB';

  if (
    titleLower.includes('thành công') ||
    msgLower.includes('thành công') ||
    titleLower.includes('đồng ý')
  ) {
    iconEmoji = '✓';
    badgeColor = '#ECFDF5';
    badgeBorder = '#A7F3D0';
    iconColor = '#059669';
  } else if (
    titleLower.includes('lỗi') ||
    titleLower.includes('thất bại') ||
    msgLower.includes('không thể')
  ) {
    iconEmoji = '✕';
    badgeColor = '#FEF2F2';
    badgeBorder = '#FECACA';
    iconColor = '#DC2626';
  } else if (
    titleLower.includes('trùng') ||
    titleLower.includes('vượt') ||
    titleLower.includes('cảnh báo') ||
    titleLower.includes('lưu ý')
  ) {
    iconEmoji = '⚠️';
    badgeColor = '#FFFBEB';
    badgeBorder = '#FDE68A';
    iconColor = '#D97706';
  } else if (
    titleLower.includes('xác nhận') ||
    titleLower.includes('nhận ca') ||
    titleLower.includes('đổi ca')
  ) {
    iconEmoji = '🤝';
    badgeColor = '#EEF2FF';
    badgeBorder = '#C7D2FE';
    iconColor = '#4F46E5';
  }

  const renderedButtons =
    buttons.length > 0
      ? buttons
      : [{ text: 'Đã hiểu', style: 'default' }];

  return (
    <Modal
      transparent
      visible={!!config}
      animationType="none"
      onRequestClose={() => handleClose()}
    >
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Header Icon */}
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: badgeColor, borderColor: badgeBorder },
            ]}
          >
            <Text style={[styles.iconText, { color: iconColor }]}>
              {iconEmoji}
            </Text>
          </View>

          {/* Title */}
          {title ? <Text style={styles.title}>{title}</Text> : null}

          {/* Message */}
          {message ? <Text style={styles.message}>{message}</Text> : null}

          {/* Action Buttons */}
          <View
            style={[
              styles.buttonRow,
              renderedButtons.length > 2 && styles.buttonColumn,
            ]}
          >
            {renderedButtons.map((btn, idx) => {
              const isCancel = btn.style === 'cancel';
              const isDestructive = btn.style === 'destructive';

              let btnStyle = styles.defaultBtn;
              let btnTextStyle = styles.defaultBtnText;

              if (isCancel) {
                btnStyle = styles.cancelBtn;
                btnTextStyle = styles.cancelBtnText;
              } else if (isDestructive) {
                btnStyle = styles.destructiveBtn;
                btnTextStyle = styles.destructiveBtnText;
              }

              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.btnBase, btnStyle]}
                  activeOpacity={0.8}
                  onPress={() => handleClose(btn.onPress)}
                >
                  <Text style={btnTextStyle}>{btn.text}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.58)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    ...(Platform.OS === 'web'
      ? {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 99999,
        }
      : {}),
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconText: {
    fontSize: 22,
    fontWeight: '700',
  },
  title: {
    fontSize: 16.5,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  message: {
    fontSize: 13.5,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 19.5,
    marginBottom: 20,
    paddingHorizontal: 6,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    justifyContent: 'center',
  },
  buttonColumn: {
    flexDirection: 'column',
  },
  btnBase: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  defaultBtn: {
    backgroundColor: '#0F172A',
  },
  defaultBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelBtnText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
  destructiveBtn: {
    backgroundColor: '#EF4444',
  },
  destructiveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
