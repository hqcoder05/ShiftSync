import { colors as uiColors } from '../theme/koreanPalette';
import { createAppStyles } from '../theme/appTheme';
import { ensureTouchTarget } from '../utils/touchTarget';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import BackIcon from '../components/BackIcon';
import IncomeIllustration from '../components/IncomeIllustration';
import ThreeIllustration from '../components/ThreeIllustration';
import BottomNavbar, { useBottomNavbarPadding } from '../components/BottomNavbar';
import { downloadAndSharePayslipPdf, getMyPayslips } from '../services/payrollService';
import { getMyAttendance } from '../services/attendanceService';
import { formatVND, formatDateDMY, getPayrollStatusInfo } from '../utils/currency';

const hours = (value) => value == null || !Number.isFinite(Number(value)) ? '—' : `${Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} giờ`;
const punchTime = (value) => value && !Number.isNaN(new Date(value).getTime()) ? new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '—';
const periodLabel = (item) => item.periodStartDate && item.periodEndDate ? `${formatDateDMY(item.periodStartDate)} – ${formatDateDMY(item.periodEndDate)}` : 'Chưa có kỳ lương';
const title = (item) => item.periodStartDate ? `Phiếu lương tháng ${Number(item.periodStartDate.slice(5, 7))}/${item.periodStartDate.slice(0, 4)}` : 'Phiếu lương';
export function attendanceForPayslip(records, payslip) {
  if (!payslip?.storeId || !payslip.periodStartDate || !payslip.periodEndDate) return [];
  return (records || []).filter((record) => String(record.storeId) === String(payslip.storeId)
    && (!payslip.staffId || String(record.staffId) === String(payslip.staffId))
    && record.shiftDate >= payslip.periodStartDate && record.shiftDate <= payslip.periodEndDate
    && record.checkInTime).sort((a, b) => a.shiftDate.localeCompare(b.shiftDate));
}

export default function PayrollScreen({ navigation }) {
  const bottomPadding = useBottomNavbarPadding();
  const [payslips, setPayslips] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [selected, setSelected] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [periodPicker, setPeriodPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attendanceError, setAttendanceError] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfMessage, setPdfMessage] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [payroll, punches] = await Promise.allSettled([getMyPayslips(), getMyAttendance()]);
      if (payroll.status !== 'fulfilled') throw payroll.reason;
      const list = Array.isArray(payroll.value.data) ? payroll.value.data : [];
      setPayslips(list);
      setSelected((current) => current ? list.find((item) => item.id === current.id) || null : null);
      setAttendanceError(punches.status !== 'fulfilled');
      if (punches.status === 'fulfilled') setAttendance(Array.isArray(punches.value.data) ? punches.value.data : []);
    } catch (failure) { setError(failure.response?.data?.message || failure.message || 'Chưa tải được phiếu lương.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); const stop = navigation.addListener('focus', load); return stop; }, [navigation, load]);
  const entries = useMemo(() => attendanceForPayslip(attendance, selected), [attendance, selected]);
  const open = (item) => { setSelected(item); setExpanded(attendanceForPayslip(attendance, item)[0]?.id ?? null); setPeriodPicker(false); };
  const downloadPdf = async () => {
    if (!selected || pdfBusy) return;
    setPdfBusy(true); setPdfMessage('');
    try {
      const result = await downloadAndSharePayslipPdf(selected.id);
      setPdfMessage(result.mode === 'download' ? 'Đã tải phiếu lương PDF.' : 'Đã mở chia sẻ phiếu lương PDF.');
    } catch (failure) {
      setPdfMessage(failure.response?.data?.message || failure.message || 'Không thể tải phiếu lương PDF.');
    } finally { setPdfBusy(false); }
  };
  const status = selected && getPayrollStatusInfo(selected.periodStatus);
  const latest = useMemo(() => [...payslips].sort((a, b) => String(b.periodStartDate || '').localeCompare(String(a.periodStartDate || '')))[0], [payslips]);
  const amounts = selected ? [
    ['Lương cơ bản', selected.baseAmount, uiColors.lavender, "#70678E"],
    ['Tăng ca', selected.otAmount, uiColors.mint, uiColors.success],
    ['Ngày lễ', selected.holidayAmount, uiColors.peach, '#BC724C'],
    ...(selected.bonusAmount != null ? [['Thưởng', selected.bonusAmount, uiColors.butter, '#AC8230']] : []),
    ...(selected.allowanceAmount != null ? [['Phụ cấp', selected.allowanceAmount, uiColors.lavender, "#786789"]] : []),
  ] : [];
  return <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
    <StatusBar style="dark" />
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel={selected ? 'Quay lại phiếu lương' : 'Quay lại'} onPress={() => selected ? setSelected(null) : navigation.goBack()} style={ensureTouchTarget(s.headerButton)}><BackIcon /></Pressable>
      <Text accessibilityRole="header" style={s.headerTitle}>{selected ? 'Chi tiết lương' : 'Phiếu lương'}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Chọn kỳ lương" onPress={() => setPeriodPicker(true)} style={ensureTouchTarget(s.headerButton)}><Ionicons accessible={false} name="calendar-outline" size={23} color={uiColors.secondary} /></Pressable>
    </View>
    <ScrollView contentContainerStyle={[s.content, { paddingBottom: bottomPadding }]} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={uiColors.orange} />}>
      {!!error && <View style={s.error}><Text style={s.errorText}>{error}</Text><Pressable style={ensureTouchTarget()} accessibilityRole="button" onPress={load}><Text style={s.link}>Thử lại</Text></Pressable></View>}
      {selected ? <>
        <View style={s.summary}>
          <Text style={s.period}>{periodLabel(selected)}</Text>
          <Text style={s.caption}>Thu nhập kỳ này</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit style={s.total}>{formatVND(selected.totalAmount)}</Text>
          <View style={s.summaryRow}><View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.hours}>{hours(selected.payableHours ?? selected.totalHours)} được tính lương</Text>
            <View style={[s.status, { backgroundColor: selected.periodStatus === 'PAID' ? "#DCE9E0" : uiColors.line }]}><Text style={[s.statusText, { color: status.color }]}>{status.text}</Text></View>
          </View><IncomeIllustration size={132} /></View>
          {!!selected.storeName && <Text style={s.store}>{selected.storeName}</Text>}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Tải hoặc chia sẻ phiếu lương PDF" accessibilityState={{ disabled: pdfBusy, busy: pdfBusy }} disabled={pdfBusy} onPress={downloadPdf} style={ensureTouchTarget(({ pressed }) => [s.pdfButton, pressed && s.pdfButtonPressed, pdfBusy && s.pdfButtonDisabled])}>
          {pdfBusy ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons accessible={false} name="download-outline" size={19} color="#FFFFFF" />}
          <Text style={s.pdfButtonText}>{pdfBusy ? 'Đang chuẩn bị PDF...' : 'Tải / chia sẻ phiếu lương PDF'}</Text>
        </Pressable>
        {!!pdfMessage && <Text accessibilityRole="alert" style={s.pdfMessage}>{pdfMessage}</Text>}
        <View style={s.amounts}>{amounts.map(([label, amount, backgroundColor, color]) => <View key={label} style={[s.amountCard, { backgroundColor }]}><View style={[s.dot, { backgroundColor: color }]} /><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65} style={s.amountValue}>{formatVND(amount)}</Text><Text style={s.amountLabel}>{label}</Text></View>)}</View>
        <View style={s.sectionHeader}><Text style={s.sectionTitle}>Ca đã làm trong kỳ</Text><Text style={s.count}>{entries.length} ca</Text></View>
        {attendanceError ? <Text style={s.empty}>Chưa tải được ca làm. Kéo xuống để thử lại.</Text> : entries.length === 0 ? <View style={s.emptyState}><Ionicons name="time-outline" size={31} color="#B8BFC1" /><Text style={s.empty}>Chưa có bản chấm công cho kỳ lương này.</Text></View> : entries.map((record) => {
          const isOpen = expanded === record.id;
          const duration = record.checkOutTime ? (new Date(record.checkOutTime).getTime() - new Date(record.checkInTime).getTime()) / 3600000 : null;
          return <View key={record.id} style={s.shift}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Xem ca ngày ${formatDateDMY(record.shiftDate)}`} accessibilityState={{ expanded: isOpen }} aria-expanded={isOpen} onPress={() => setExpanded(isOpen ? null : record.id)} style={ensureTouchTarget(s.shiftHeader)}>
              <View style={{ flex: 1 }}><Text style={s.shiftDate}>{formatDateDMY(record.shiftDate)}</Text><Text style={s.shiftHours}>{duration != null && duration >= 0 ? `${hours(duration)} vào–ra` : 'Đang trong ca'}</Text></View>
              <Text style={s.shiftTime}>{record.scheduledStart?.slice(0, 5)} – {record.scheduledEnd?.slice(0, 5)}</Text><Ionicons accessible={false} name={isOpen ? 'chevron-up' : 'chevron-down'} color={uiColors.muted} size={17} />
            </Pressable>
            {isOpen && <View style={s.punchDetail}><View style={s.punchLine} /><View accessibilityLabel={record.checkOutTime ? 'Ca đã hoàn thành' : 'Ca đang diễn ra'} style={[s.check, !record.checkOutTime && { backgroundColor: uiColors.orange }]}><Ionicons name={record.checkOutTime ? 'checkmark' : 'time-outline'} size={11} color="#FFFFFF" /></View><View style={{ flex: 1, gap: 7 }}>
              <Text style={s.detailTime}>{duration != null && duration >= 0 ? `${hours(duration)} làm việc` : 'Đang trong ca'}</Text>
              <Text style={s.detailTime}>{punchTime(record.checkInTime)} – {punchTime(record.checkOutTime)}</Text>
              <Text style={s.detailLabel}>Giờ vào ca · Giờ ra ca</Text>
              <View style={s.roleRow}><View style={[s.dot, { backgroundColor: uiColors.orange }]} /><Text style={s.detailLabel}>{record.zoneName || record.workstationName || 'Ca làm'} · {record.storeName}</Text></View>
              <Text style={[s.detailLabel, { color: record.status === 'LATE' ? uiColors.warningText : uiColors.successText }]}>{record.status === 'LATE' ? 'Ghi nhận đi trễ' : record.checkOutTime ? 'Đã hoàn thành chấm công' : 'Chưa ghi nhận ra ca'}</Text>
            </View></View>}
          </View>;
        })}
        <View style={s.breakdown}><Text style={s.sectionTitle}>Chi tiết thu nhập</Text>{amounts.map(([label, amount]) => <View key={label} style={s.detailRow}><Text style={s.detailLabel}>{label}</Text><Text style={s.detailValue}>{formatVND(amount)}</Text></View>)}<View style={[s.detailRow, s.totalRow]}><Text style={s.shiftDate}>Thực nhận</Text><Text style={s.finalAmount}>{formatVND(selected.totalAmount)}</Text></View></View>
      </> : <>
        {!!latest && <View style={s.listHero}>
          <View style={s.heroHeadlineRow}>
            <View style={s.heroCopy}>
              <Text style={s.eyebrow}>THU NHẬP CỦA BẠN</Text>
              <Text style={s.heroCaption}>Kỳ lương gần nhất</Text>
            </View>
            <IncomeIllustration size={140} />
          </View>
          <Text numberOfLines={1} adjustsFontSizeToFit style={s.heroAmount}>{formatVND(latest.totalAmount)}</Text>
          <Text style={s.heroPeriod}>{periodLabel(latest)}</Text>
        </View>}
        <View style={s.historyHeading}><View><Text style={s.listCaption}>Lịch sử thu nhập</Text><Text style={s.historyHint}>Theo dõi từng kỳ lương của bạn</Text></View><View style={s.countPill}><Text style={s.countPillText}>{payslips.length} kỳ</Text></View></View>
        {!loading && !error && payslips.length === 0 && <View style={s.emptyState}><IncomeIllustration size={164} /><Text style={s.empty}>Phiếu lương sẽ xuất hiện khi được phát hành.</Text></View>}
        {payslips.map((item) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={title(item)} onPress={() => open(item)} style={ensureTouchTarget(s.payslip)}>
          <View style={s.payslipTop}>
            <View style={s.periodIcon}><ThreeIllustration kind="request" size={58} /></View>
            <View style={{ flex: 1, minWidth: 0 }}><Text style={s.payslipTitle}>{title(item)}</Text><Text style={s.periodRange}>{periodLabel(item)}</Text></View>
            <View style={s.cardArrow}><Ionicons accessible={false} name="arrow-forward" size={17} color={uiColors.muted} /></View>
          </View>
          <View style={s.payslipBottom}>
            <View style={[s.paymentBadge, { backgroundColor: item.periodStatus === 'PAID' ? uiColors.mint : uiColors.subtle }]}><View style={[s.dot, { backgroundColor: getPayrollStatusInfo(item.periodStatus).color }]} /><Text style={[s.paymentText, { color: getPayrollStatusInfo(item.periodStatus).color }]}>{getPayrollStatusInfo(item.periodStatus).text}</Text></View>
            <View style={s.cardAmountWrap}><Text style={s.cardAmountLabel}>Thực nhận</Text><Text numberOfLines={1} adjustsFontSizeToFit style={s.listAmount}>{formatVND(item.totalAmount)}</Text></View>
          </View>
        </Pressable>)}
      </>}
    </ScrollView>
    <BottomNavbar navigation={navigation} activeRoute="Payroll" />
    <Modal visible={periodPicker} transparent animationType="fade" onRequestClose={() => setPeriodPicker(false)}><View style={s.backdrop}><View style={s.picker}><View style={s.pickerHeader}><Text style={s.headerTitle}>Chọn kỳ lương</Text><Pressable style={ensureTouchTarget()} accessibilityRole="button" accessibilityLabel="Đóng chọn kỳ lương" onPress={() => setPeriodPicker(false)}><Ionicons accessible={false} name="close" size={25} color={uiColors.muted} /></Pressable></View><ScrollView>{payslips.length ? payslips.map((item) => <Pressable accessibilityRole="button" key={item.id} onPress={() => open(item)} style={ensureTouchTarget(s.pickerRow)}><Text style={s.shiftDate}>{periodLabel(item)}</Text><Text style={s.detailLabel}>{formatVND(item.totalAmount)}</Text></Pressable>) : <Text style={s.empty}>Chưa có kỳ lương.</Text>}</ScrollView></View></View></Modal>
  </SafeAreaView>;
}
const s = createAppStyles({
  safe: { flex: 1, backgroundColor: uiColors.canvas }, header: { height: 58, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: uiColors.line }, headerButton: { width: 55, height: 52, alignItems: 'center', justifyContent: 'center' }, headerTitle: { flex: 1, textAlign: 'center', color: uiColors.ink, fontSize: 18, fontWeight: '500' }, content: { width: '100%', maxWidth: 620, alignSelf: 'center' },
  summary: { margin: 16, borderRadius: 24, padding: 22, backgroundColor: uiColors.peach, borderWidth: 1, borderColor: "#EFDDD1" }, period: { fontSize: 12, color: uiColors.muted, marginBottom: 15 }, caption: { color: uiColors.muted, fontSize: 14 }, summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 4 }, total: { color: uiColors.ink, fontSize: 29, fontWeight: '600', letterSpacing: -0.7, marginTop: 8 }, hours: { color: uiColors.muted, fontSize: 13, marginTop: 8 }, status: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 4, marginTop: 12 }, statusText: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' }, store: { fontSize: 12, color: uiColors.muted, marginTop: 12 },
  pdfButton: { minHeight: 50, marginHorizontal: 16, marginBottom: 6, paddingHorizontal: 16, borderRadius: 14, backgroundColor: uiColors.primaryStrong, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 9 }, pdfButtonPressed: { opacity: 0.88 }, pdfButtonDisabled: { opacity: 0.6 }, pdfButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' }, pdfMessage: { marginHorizontal: 18, color: uiColors.muted, fontSize: 12, textAlign: 'center' },
  amounts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 18 }, amountCard: { flexGrow: 1, flexBasis: 90, minWidth: 80, padding: 12, borderRadius: 12 }, dot: { width: 7, height: 7, borderRadius: 4, flexShrink: 0 }, amountValue: { fontSize: 15, fontWeight: '600', color: "#404B57", marginTop: 12 }, amountLabel: { color: uiColors.muted, fontSize: 11, marginTop: 6 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 15, paddingBottom: 12 }, sectionTitle: { color: uiColors.muted, fontSize: 13, fontWeight: '500' }, count: { color: uiColors.muted, fontSize: 12 }, shift: { marginHorizontal: 22, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: uiColors.line }, shiftHeader: { minHeight: 80, flexDirection: 'row', alignItems: 'center', gap: 9 }, shiftDate: { color: "#404B57", fontWeight: '500', fontSize: 14 }, shiftHours: { color: uiColors.muted, fontSize: 12, marginTop: 5 }, shiftTime: { color: uiColors.secondary, fontSize: 12 },
  punchDetail: { flexDirection: 'row', gap: 14, padding: 14, paddingTop: 5, paddingBottom: 24, position: 'relative' }, punchLine: { position: 'absolute', top: 0, bottom: 18, left: 19, width: 1, backgroundColor: uiColors.lineStrong }, check: { width: 13, height: 13, marginLeft: -1, marginTop: 3, borderRadius: 8, backgroundColor: uiColors.success, alignItems: 'center', justifyContent: 'center' }, detailTime: { color: uiColors.secondary, fontSize: 16 }, detailLabel: { color: uiColors.muted, fontSize: 12, lineHeight: 18 }, roleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 }, breakdown: { padding: 22, marginTop: 18, backgroundColor: uiColors.canvas }, detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingVertical: 12 }, detailValue: { color: uiColors.secondary, fontSize: 13, flexShrink: 1, textAlign: 'right' }, totalRow: { borderTopWidth: 1, borderTopColor: uiColors.line, marginTop: 8 }, finalAmount: { fontSize: 20, color: "#70678E", fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  listHero: { margin: 16, marginBottom: 24, padding: 20, borderRadius: 24, backgroundColor: uiColors.peach, borderWidth: 1, borderColor: "#EFDDD1", },
  heroHeadlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: -12, marginRight: -8 },
  heroCopy: { flex: 1, minWidth: 0 }, eyebrow: { fontSize: 10, letterSpacing: 1.2, fontWeight: '700', color: uiColors.primaryStrong, marginBottom: 15 }, heroCaption: { fontSize: 13, color: "#746459" }, heroAmount: { fontSize: 29, fontWeight: '600', letterSpacing: -1, color: uiColors.ink, marginVertical: 8 }, heroPeriod: { fontSize: 10, lineHeight: 16, color: "#746459" },
  historyHeading: { marginHorizontal: 20, marginBottom: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, listCaption: { fontSize: 19, fontWeight: '600', color: uiColors.ink, letterSpacing: -0.4 }, historyHint: { fontSize: 12, color: uiColors.muted, marginTop: 6 }, countPill: { borderRadius: 12, backgroundColor: uiColors.line, paddingHorizontal: 10, paddingVertical: 6 }, countPillText: { fontSize: 11, color: uiColors.secondary, fontWeight: '500' },
  payslip: { marginHorizontal: 16, marginBottom: 14, padding: 16, borderRadius: 20, backgroundColor: uiColors.surface, borderWidth: 1, borderColor: uiColors.line, shadowColor: uiColors.ink, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.035, shadowRadius: 14, elevation: 2 }, payslipTop: { flexDirection: 'row', alignItems: 'center', gap: 12 }, periodIcon: { width: 58, height: 60, borderRadius: 16, backgroundColor: uiColors.lavender, alignItems: 'center', justifyContent: 'center' }, payslipTitle: { color: uiColors.ink, fontSize: 14, lineHeight: 21, fontWeight: '600' }, periodRange: { color: uiColors.muted, fontSize: 11, lineHeight: 17, marginTop: 4 }, cardArrow: { width: 28, height: 28, borderRadius: 14, backgroundColor: uiColors.canvas, alignItems: 'center', justifyContent: 'center' },
  payslipBottom: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: uiColors.subtle, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10 }, paymentBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 7 }, paymentText: { fontSize: 10, fontWeight: '500' }, cardAmountWrap: { alignItems: 'flex-end', flexShrink: 1 }, cardAmountLabel: { fontSize: 10, color: uiColors.muted, marginBottom: 4 }, listAmount: { color: uiColors.ink, fontSize: 22, fontWeight: '600', letterSpacing: -0.5 }, emptyState: { padding: 35, alignItems: 'center', gap: 15 }, empty: { color: uiColors.muted, fontSize: 13, textAlign: 'center', padding: 20, lineHeight: 20 }, error: { padding: 20, backgroundColor: uiColors.peach }, errorText: { color: uiColors.primaryStrong, fontSize: 13 }, link: { color: uiColors.primaryStrong, paddingTop: 12 },
  backdrop: { flex: 1, backgroundColor: "#28313B55", alignItems: 'center', justifyContent: 'center', padding: 24 }, picker: { backgroundColor: uiColors.surface, width: '100%', maxWidth: 420, maxHeight: '80%', borderRadius: 18, padding: 18 }, pickerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 }, pickerRow: { paddingVertical: 15, gap: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: uiColors.line },
});
