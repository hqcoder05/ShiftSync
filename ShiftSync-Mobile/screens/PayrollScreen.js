import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { getMyPayslips } from '../services/payrollService';
import { getMyShifts } from '../services/shiftService';
import { getMyAttendanceHistory } from '../services/attendanceService';

// Assets
import calendarIcon from '../assets/Calendar.png';
import payrollIcon from '../assets/luong.png';

const formatVND = (num) => {
  if (num === null || num === undefined) return '0 VNĐ';
  return Number(num).toLocaleString('vi-VN') + ' VNĐ';
};

const DEFAULT_MONTHLY_PAYSLIPS = [
  {
    id: 'ps-8',
    month: 8,
    year: 2026,
    title: 'Phiếu lương tháng 8',
    periodRange: '01/08/26 – 31/08/26',
    role: 'Barista',
    hourlyRate: 26000,
    totalShifts: 16,
    completedShifts: 16,
    scheduledHours: 132,
    workedHours: 132,
    workedDays: 20,
    baseAmount: 3300000,
    deduction: 150000,
    allowance: 120000,
    totalAmount: 3450000,
  },
  {
    id: 'ps-7',
    month: 7,
    year: 2026,
    title: 'Phiếu lương tháng 7',
    periodRange: '01/07/26 – 31/07/26',
    role: 'Barista',
    hourlyRate: 26000,
    totalShifts: 16,
    completedShifts: 16,
    scheduledHours: 128,
    workedHours: 128,
    workedDays: 19,
    baseAmount: 2450000,
    deduction: 0,
    allowance: 100000,
    totalAmount: 2550000,
  },
  {
    id: 'ps-6',
    month: 6,
    year: 2026,
    title: 'Phiếu lương tháng 6',
    periodRange: '01/06/26 – 30/06/26',
    role: 'Barista',
    hourlyRate: 26000,
    totalShifts: 18,
    completedShifts: 18,
    scheduledHours: 140,
    workedHours: 140,
    workedDays: 21,
    baseAmount: 3300000,
    deduction: 0,
    allowance: 150000,
    totalAmount: 3450000,
  },
  {
    id: 'ps-5',
    month: 5,
    year: 2026,
    title: 'Phiếu lương tháng 5',
    periodRange: '01/05/26 – 31/05/26',
    role: 'Barista',
    hourlyRate: 26000,
    totalShifts: 15,
    completedShifts: 15,
    scheduledHours: 110,
    workedHours: 110,
    workedDays: 17,
    baseAmount: 2600000,
    deduction: 0,
    allowance: 150000,
    totalAmount: 2750000,
  },
  {
    id: 'ps-4',
    month: 4,
    year: 2026,
    title: 'Phiếu lương tháng 4',
    periodRange: '01/04/26 – 30/04/26',
    role: 'Barista',
    hourlyRate: 26000,
    totalShifts: 10,
    completedShifts: 10,
    scheduledHours: 65,
    workedHours: 65,
    workedDays: 10,
    baseAmount: 1500000,
    deduction: 0,
    allowance: 150000,
    totalAmount: 1650000,
  },
];

export default function PayrollScreen({ navigation }) {
  const [payslips, setPayslips] = useState(DEFAULT_MONTHLY_PAYSLIPS);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load backend payslips and realtime attendance
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch API payslips
      let apiPayslips = [];
      try {
        const { data } = await getMyPayslips();
        if (data && Array.isArray(data) && data.length > 0) {
          apiPayslips = data;
        }
      } catch (e) {
        // use default fallback
      }

      // 2. Fetch completed shifts/attendance to calculate live current month
      let completedHours = 0;
      let completedDays = 0;
      try {
        const { data: shifts } = await getMyShifts();
        if (shifts && Array.isArray(shifts)) {
          const finished = shifts.filter((s) => s.status === 'COMPLETED');
          completedHours = finished.reduce((acc, s) => {
            if (s.startTime && s.endTime) {
              const [h1, m1] = s.startTime.split(':').map(Number);
              const [h2, m2] = s.endTime.split(':').map(Number);
              const dur = (h2 * 60 + m2 - (h1 * 60 + m1)) / 60;
              return acc + Math.max(0, dur);
            }
            return acc + 8;
          }, 0);
          completedDays = finished.length;
        }
      } catch (e) {
        // ignore
      }

      if (apiPayslips.length > 0) {
        const mapped = apiPayslips.map((p, idx) => {
          const d = p.periodStartDate ? new Date(p.periodStartDate) : new Date();
          const month = d.getMonth() + 1;
          const year = d.getFullYear();
          const workedH = Number(p.totalHours || 0);
          const totalAmt = Number(p.totalAmount || 0);
          const baseAmt = Number(p.baseAmount || totalAmt);
          return {
            id: p.id || `api-${idx}`,
            month,
            year,
            title: `Phiếu lương tháng ${month}`,
            periodRange: `${p.periodStartDate || '01/08/26'} – ${p.periodEndDate || '31/08/26'}`,
            role: 'Barista',
            hourlyRate: workedH ? Math.round(baseAmt / workedH) : 26000,
            totalShifts: Math.round(workedH / 8) || 16,
            completedShifts: Math.round(workedH / 8) || 16,
            scheduledHours: workedH || 132,
            workedHours: workedH || 132,
            workedDays: Math.round(workedH / 8) || 20,
            baseAmount: baseAmt,
            deduction: 150000,
            allowance: 120000,
            totalAmount: totalAmt || 3450000,
          };
        });
        setPayslips(mapped);
      } else if (completedHours > 0) {
        // Update current month (August) live
        setPayslips((prev) =>
          prev.map((ps) => {
            if (ps.month === 8) {
              const worked = Math.round(completedHours);
              const base = worked * ps.hourlyRate;
              const total = base + ps.allowance - ps.deduction;
              return {
                ...ps,
                workedHours: worked,
                completedShifts: completedDays || ps.completedShifts,
                workedDays: completedDays || ps.workedDays,
                baseAmount: base,
                totalAmount: total,
              };
            }
            return ps;
          })
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ═══════════════════════════════════════════════════════════
  // VIEW 2: BÁO CÁO THU NHẬP CHI TIẾT (luongmobile.docx image1.png)
  // ═══════════════════════════════════════════════════════════
  if (selectedPayslip) {
    const item = selectedPayslip;
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />
        {/* Top Header */}
        <View style={styles.detailHeader}>
          <Pressable
            onPress={() => setSelectedPayslip(null)}
            hitSlop={15}
            style={styles.backBtn}
          >
            <Text style={styles.backArrow}>←</Text>
          </Pressable>
          <View style={styles.detailHeaderInfo}>
            <Text style={styles.detailRange}>{item.periodRange}</Text>
            <View style={styles.roleTagWrap}>
              <View style={styles.roleTagDot} />
              <Text style={styles.roleTagText}>{item.role}</Text>
            </View>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.detailContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Green Hero Card ── */}
          <View style={styles.greenCard}>
            <View style={styles.greenCardRow}>
              {/* Left Column Stats */}
              <View style={styles.greenCardLeft}>
                <Text style={styles.greenCardTitle}>Báo cáo thu nhập{'\n'}của bạn</Text>

                <Text style={styles.greenCardSubLabel}>Mức lương ước tính</Text>
                <Text style={styles.greenCardAmount}>{formatVND(item.totalAmount)}</Text>
                <Text style={styles.greenCardRate}>
                  {Number(item.hourlyRate).toLocaleString('vi-VN')} vnđ/giờ
                </Text>

                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Ca đã làm việc</Text>
                  <Text style={styles.metricVal}>
                    <Text style={styles.metricValHighlight}>{item.completedShifts}</Text> of{' '}
                    {item.totalShifts}
                  </Text>
                </View>

                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Giờ đã làm việc</Text>
                  <Text style={styles.metricVal}>
                    <Text style={styles.metricValHighlight}>{item.workedHours}</Text> of{' '}
                    {item.scheduledHours} giờ
                  </Text>
                </View>
              </View>

              {/* Right Column Art */}
              <View style={styles.greenCardRight}>
                <Image source={payrollIcon} style={styles.heroCoinIllustration} />
              </View>
            </View>

            {/* 3 Mini White Cards Row */}
            <View style={styles.miniCardsRow}>
              {/* Card 1: Tổng tiền */}
              <View style={styles.miniCard}>
                <Text style={[styles.miniCardValue, { color: '#51A33D' }]}>
                  {formatVND(item.baseAmount)}
                </Text>
                <Text style={styles.miniCardLabel}>Tổng tiền</Text>
              </View>

              {/* Card 2: Phụ phí */}
              <View style={styles.miniCard}>
                <Text style={[styles.miniCardValue, { color: '#C60D1C' }]}>
                  -{formatVND(item.deduction)}
                </Text>
                <Text style={styles.miniCardLabel}>Phụ phí</Text>
              </View>

              {/* Card 3: Trợ phí */}
              <View style={styles.miniCard}>
                <Text style={[styles.miniCardValue, { color: '#FFCC33' }]}>
                  +{formatVND(item.allowance)}
                </Text>
                <Text style={styles.miniCardLabel}>Trợ phí</Text>
              </View>
            </View>
          </View>

          {/* ── Section 1: Thông tin mức lương ── */}
          <Text style={styles.sectionHeading}>Thông tin mức lương</Text>
          <View style={styles.sectionDivider} />
          <View style={styles.sectionRows}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Mức lương hiện tại</Text>
              <Text style={styles.infoValue}>{formatVND(item.hourlyRate)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Giờ đã làm việc</Text>
              <Text style={styles.infoValue}>{item.workedHours} Giờ</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ngày đã làm việc</Text>
              <Text style={styles.infoValue}>{item.workedDays} Ngày</Text>
            </View>
          </View>

          {/* ── Section 2: Tổng thu nhập ── */}
          <Text style={styles.sectionHeading}>Tổng thu nhập</Text>
          <View style={styles.sectionDivider} />
          <View style={styles.sectionRows}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Lương trong tháng</Text>
              <Text style={styles.infoValue}>{formatVND(item.baseAmount)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Trợ cấp</Text>
              <Text style={styles.infoValue}>+{formatVND(item.allowance)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phụ phí trang phục</Text>
              <Text style={styles.infoValue}>-{formatVND(item.deduction)}</Text>
            </View>
          </View>

          {/* ── Section 3: Lương thực nhận ── */}
          <Text style={styles.sectionHeading}>Lương thực nhận</Text>
          <View style={styles.sectionDivider} />
          <View style={styles.sectionRows}>
            <View style={[styles.infoRow, { paddingVertical: 14 }]}>
              <Text style={[styles.infoLabel, { fontSize: 16 }]}>Lương thực nhận</Text>
              <Text style={styles.finalSalaryValue}>{formatVND(item.totalAmount)}</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // VIEW 1: DANH SÁCH PHIẾU LƯƠNG (luongmobile.docx image2.png)
  // ═══════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      {/* Header */}
      <View style={styles.listHeader}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={15}
          style={styles.backBtn}
        >
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.listHeaderTitle}>Phiếu lương</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
      >
        {/* Subheader: Tổng phiếu lương 2026 & Calendar Button */}
        <View style={styles.subHeaderRow}>
          <View style={styles.totalBadge}>
            <Text style={styles.totalBadgeText}>Tổng phiếu lương 2026</Text>
          </View>

          <Pressable style={styles.calendarIconBtn} onPress={loadData}>
            <Image source={calendarIcon} style={styles.calendarIconImg} />
          </Pressable>
        </View>

        {/* Monthly Payslips List */}
        <View style={styles.payslipsCard}>
          {payslips.map((ps, idx) => {
            const isDetailed = ps.month === 8 || ps.month === 7;
            return (
              <Pressable
                key={ps.id || idx}
                style={styles.payslipRow}
                onPress={() => setSelectedPayslip(ps)}
              >
                {/* Left info */}
                <View style={styles.payslipRowLeft}>
                  <Text style={styles.payslipTitle}>{ps.title}</Text>

                  {isDetailed ? (
                    <View style={styles.payslipDetailWrap}>
                      <View style={styles.yellowDotLine}>
                        <View style={styles.yellowBullet} />
                        <Text style={styles.detailedAmount}>{formatVND(ps.totalAmount)}</Text>
                      </View>
                      <Text style={styles.payslipRangeText}>{ps.periodRange}</Text>
                      <View style={styles.payslipRoleWrap}>
                        <View style={styles.roleTagDot} />
                        <Text style={styles.roleTagText}>{ps.role}</Text>
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.payslipRangeText}>{ps.periodRange}</Text>
                  )}
                </View>

                {/* Right info (for simple months) */}
                {!isDetailed && (
                  <Text style={styles.goldSalaryAmount}>{formatVND(ps.totalAmount)}</Text>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  /* ── Header ── */
  listHeader: {
    height: 56,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  backBtn: {
    padding: 6,
  },
  backArrow: {
    fontSize: 26,
    fontWeight: '700',
    color: '#222222',
  },
  listHeaderTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111111',
  },

  /* ── List Subheader ── */
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 40,
  },
  subHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  totalBadge: {
    backgroundColor: '#3E3E3E',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  totalBadgeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  calendarIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#3E3E3E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarIconImg: {
    width: 22,
    height: 22,
    tintColor: '#FFFFFF',
    resizeMode: 'contain',
  },

  /* ── Payslips List Rows ── */
  payslipsCard: {
    backgroundColor: '#FFFFFF',
  },
  payslipRow: {
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  payslipRowLeft: {
    flex: 1,
  },
  payslipTitle: {
    fontSize: 19,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 6,
  },
  payslipDetailWrap: {
    marginTop: 4,
    paddingLeft: 4,
  },
  yellowDotLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  yellowBullet: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFCC33',
  },
  detailedAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333333',
  },
  payslipRangeText: {
    fontSize: 13,
    color: '#888888',
    marginTop: 2,
  },
  payslipRoleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  roleTagDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7CD8CE',
  },
  roleTagText: {
    fontSize: 13,
    color: '#555555',
    fontWeight: '500',
  },
  goldSalaryAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E6A800',
  },

  /* ═══════════════════════════════════════════════════════════
     VIEW 2 (DETAIL REPORT) STYLES
     ═══════════════════════════════════════════════════════════ */
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  detailHeaderInfo: {
    marginLeft: 16,
  },
  detailRange: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222222',
  },
  detailContent: {
    paddingHorizontal: 16,
    paddingBottom: 50,
  },

  /* ── Green Hero Card ── */
  greenCard: {
    backgroundColor: '#EAF8E6',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    marginBottom: 24,
  },
  greenCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'relative',
  },
  greenCardLeft: {
    flex: 1.3,
  },
  greenCardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111111',
    lineHeight: 28,
    marginBottom: 12,
  },
  greenCardSubLabel: {
    fontSize: 13,
    color: '#444444',
    marginBottom: 2,
  },
  greenCardAmount: {
    fontSize: 26,
    fontWeight: '700',
    color: '#51A33D',
    marginBottom: 2,
  },
  greenCardRate: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 14,
  },
  metricRow: {
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 13.5,
    color: '#333333',
    fontWeight: '500',
  },
  metricVal: {
    fontSize: 14,
    color: '#555555',
    fontWeight: '500',
    marginTop: 1,
  },
  metricValHighlight: {
    color: '#51A33D',
    fontWeight: '700',
  },
  greenCardRight: {
    flex: 0.9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCoinIllustration: {
    width: 130,
    height: 130,
    resizeMode: 'contain',
  },

  /* Mini Cards Row */
  miniCardsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
  },
  miniCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  miniCardValue: {
    fontSize: 12.5,
    fontWeight: '700',
    marginBottom: 2,
  },
  miniCardLabel: {
    fontSize: 10,
    color: '#777777',
    fontWeight: '500',
  },

  /* ── Info Sections ── */
  sectionHeading: {
    fontSize: 19,
    fontWeight: '600',
    color: '#222222',
    marginTop: 12,
  },
  sectionDivider: {
    height: 1.5,
    backgroundColor: '#EFEFEF',
    marginVertical: 10,
  },
  sectionRows: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 15,
    color: '#444444',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    color: '#222222',
    fontWeight: '600',
  },
  finalSalaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#51A33D',
  },
});
