import { ensureTouchTarget } from '../utils/touchTarget';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatIntervalVN, shiftIntervalVN } from '../utils/scheduleConflicts';
import { colors } from '../theme/appTheme';

export default function ScheduleConflictAlert({ conflict, onClose, embedded = false }) {
  if (!conflict) return null;
  const content = <View style={[styles.backdrop, embedded && styles.embedded]}>
      <View style={styles.card} accessibilityViewIsModal>
        <View style={styles.heading}><Ionicons name="alert-circle" size={30} color={colors.danger} accessible={false} /><Text style={styles.title} accessibilityRole="header">Trùng lịch làm</Text></View>
        <ScrollView style={styles.details}>
          <Text style={styles.message} accessibilityRole="alert">Yêu cầu chưa được gửi. Ca bạn muốn nhận trùng với lịch làm đã được phân công.</Text>
          <Text style={styles.label}>Ca muốn nhận</Text>
          <Text style={styles.time}>{formatIntervalVN(shiftIntervalVN(conflict?.candidate))}</Text>
          <Text style={styles.label}>Ca đang có trong lịch của bạn</Text>
          {conflict?.conflicts?.map((item, index) => <View style={styles.row} key={`${item.shift.id}-${index}`}>
            <Text style={styles.branch}>{item.shift.storeName || (String(item.shift.storeId) !== String(conflict.candidate?.storeId) ? 'Chi nhánh khác của bạn' : 'Chi nhánh đang chọn')}</Text>
            <Text style={styles.time}>{formatIntervalVN(item.interval)}</Text>
            <Text style={styles.overlap}>Trùng: {formatIntervalVN({ start: item.overlapStart, end: item.overlapEnd })}</Text>
          </View>)}
          <Text style={styles.note}>Giờ Việt Nam · Hãy chọn ca khác. Máy chủ sẽ kiểm tra lại điều kiện nhận hoặc đổi ca khi gửi.</Text>
        </ScrollView>
        <Pressable style={ensureTouchTarget(styles.button)} onPress={onClose} accessibilityRole="button" accessibilityLabel="Đã hiểu, kiểm tra lại ca làm"><Text style={styles.buttonText}>Kiểm tra lại ca</Text></Pressable>
      </View>
    </View>;
  return embedded ? content : <Modal visible transparent animationType="fade" onRequestClose={onClose}>{content}</Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#28313B80', justifyContent: 'center', padding: 20 },
  embedded: { ...StyleSheet.absoluteFillObject, zIndex: 10000, elevation: 30 },
  card: { width: '100%', maxWidth: 430, maxHeight: '88%', alignSelf: 'center', borderRadius: 16, borderWidth: 1, borderColor: '#E8CBD0', backgroundColor: colors.surface, padding: 20 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 10 },
  title: { fontSize: 21, fontWeight: '700', color: colors.dangerText, flex: 1 },
  details: { flexGrow: 0 }, message: { fontSize: 14, lineHeight: 21, color: colors.secondary },
  label: { fontSize: 13, fontWeight: '600', color: colors.ink, marginTop: 16, marginBottom: 5 },
  row: { padding: 10, backgroundColor: colors.rose, borderRadius: 8, marginBottom: 8 },
  branch: { fontSize: 12, lineHeight: 19, color: colors.secondary, marginBottom: 3 },
  time: { fontSize: 14, lineHeight: 21, color: colors.dangerText, fontWeight: '600' },
  overlap: { fontSize: 12, lineHeight: 19, color: colors.dangerText, marginTop: 3 },
  note: { fontSize: 12, lineHeight: 19, color: colors.muted, marginTop: 12 },
  button: { minHeight: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.danger, marginTop: 18, paddingHorizontal: 14 },
  buttonText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
});
