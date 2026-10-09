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
import BottomNavbar from '../components/BottomNavbar';
import FlowerMascot3D from '../components/FlowerMascot3D';

import { formatVND, formatHourlyRate, formatDateDMY, getPayrollStatusInfo } from '../utils/currency';

const calendarIcon = require('../assets/Calendar.png');

export default function PayrollScreen({ navigation }) {
  const [payslips, setPayslips] = useState([]);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load backend payslips and realtime attendance
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await getMyPayslips();
      const apiPayslips = Array.isArray(data) ? data : [];
      const mapped = apiPayslips.map((p, idx) => {
          const d = p.periodStartDate ? new Date(p.periodStartDate) : new Date();
          const month = d.getMonth() + 1;
          const year = d.getFullYear();
          const workedH = p.totalHours;
          const payableH = p.payableHours ?? workedH;
          const otH = p.otHours;
          const totalAmt = p.totalAmount;
          const baseAmt = p.baseAmount;
          const otAmt = p.otAmount;
          const holAmt = p.holidayAmount;

          const rangeStr = (p.periodStartDate && p.periodEndDate)
            ? `${formatDateDMY(p.periodStartDate)} – ${formatDateDMY(p.periodEndDate)}`
            : `Tháng ${month}/${year}`;

          return {
            id: p.id || `api-${idx}`,
            month,
            year,
            title: `Phiếu lương tháng ${month}/${year}`,
            periodRange: rangeStr,
            periodStatus: p.periodStatus || 'CLOSED',
            role: p.skillName || p.role || 'Nhân viên',
            hourlyRate: p.hourlyRate,
            totalShifts: p.totalShifts,
            completedShifts: p.completedShifts,
            scheduledHours: p.scheduledHours,
            workedHours: workedH,
            payableHours: payableH,
            otHours: otH,
            workedDays: p.workedDays,
            baseAmount: baseAmt,
            otAmount: otAmt,
            holidayAmount: holAmt,
            deduction: 0,
            allowance: otAmt + holAmt,
            totalAmount: totalAmt,
            isEstimate: false,
          };
        });
      setPayslips(mapped);
    } catch (e) {
      setPayslips([]);
      setError(e?.response?.data?.message || e?.message || 'Không thể tải phiếu lương. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const unsubscribe = navigation?.addListener?.('focus', () => {
      loadData();
    });
    return () => {
      unsubscribe?.();
    };
  }, [navigation, loadData]);

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

                <Text style={styles.greenCardSubLabel}>Tổng lương theo phiếu</Text>
                <Text style={styles.greenCardAmount}>{formatVND(item.totalAmount)}</Text>
                <Text style={styles.greenCardRate}>
                  {formatHourlyRate(item.hourlyRate)}
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

              <View style={styles.greenCardRight}>
                <FlowerMascot3D width={190} height={165} interactive={true} />
              </View>
            </View>

            {/* 3 Mini White Cards Row */}
            <View style={styles.miniCardsRow}>
              {/* Card 1: Lương cơ bản */}
              <View style={styles.miniCard}>
                <Text style={[styles.miniCardValue, { color: '#51A33D' }]}>
                  {formatVND(item.baseAmount)}
                </Text>
                <Text style={styles.miniCardLabel}>Lương cơ bản</Text>
              </View>

              {/* Card 2: Tăng ca OT */}
              <View style={styles.miniCard}>
                <Text style={[styles.miniCardValue, { color: '#0284C7' }]}>
                  +{formatVND(item.otAmount)}
                </Text>
                <Text style={styles.miniCardLabel}>Tăng ca (OT)</Text>
              </View>

              {/* Card 3: Trợ cấp / Lễ */}
              <View style={styles.miniCard}>
                <Text style={[styles.miniCardValue, { color: '#FFCC33' }]}>
                  +{formatVND(item.holidayAmount)}
                </Text>
                <Text style={styles.miniCardLabel}>Ngày lễ</Text>
              </View>
            </View>
          </View>

          {/* ── Section 1: Thông tin mức lương ── */}
          <Text style={styles.sectionHeading}>Thông tin mức lương</Text>
          <View style={styles.sectionDivider} />
          <View style={styles.sectionRows}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Mức lương cơ bản</Text>
              <Text style={styles.infoValue}>{formatHourlyRate(item.hourlyRate)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tổng giờ làm việc</Text>
              <Text style={styles.infoValue}>{item.workedHours} Giờ</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Giờ được tính lương</Text>
              <Text style={styles.infoValue}>{item.payableHours} Giờ</Text>
            </View>
            {item.otHours > 0 && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Giờ tăng ca (OT)</Text>
                <Text style={styles.infoValue}>{item.otHours} Giờ</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Số ca đã hoàn thành</Text>
              <Text style={styles.infoValue}>{item.completedShifts} Ca</Text>
            </View>
          </View>

          {/* ── Section 2: Chi tiết thu nhập ── */}
          <Text style={styles.sectionHeading}>Chi tiết thu nhập</Text>
          <View style={styles.sectionDivider} />
          <View style={styles.sectionRows}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Lương cơ bản</Text>
              <Text style={styles.infoValue}>{formatVND(item.baseAmount)}</Text>
            </View>
            {item.otAmount > 0 && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tiền tăng ca (OT)</Text>
                <Text style={styles.infoValue}>+{formatVND(item.otAmount)}</Text>
              </View>
            )}
            {item.holidayAmount > 0 && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tiền ngày lễ</Text>
                <Text style={styles.infoValue}>+{formatVND(item.holidayAmount)}</Text>
              </View>
            )}
            {item.deduction > 0 && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Khấu trừ</Text>
                <Text style={styles.infoValue}>-{formatVND(item.deduction)}</Text>
              </View>
            )}
          </View>

          {/* ── Section 3: Lương thực nhận ── */}
          <Text style={styles.sectionHeading}>Lương thực nhận</Text>
          <View style={styles.sectionDivider} />
          <View style={styles.sectionRows}>
            <View style={[styles.infoRow, { paddingVertical: 14 }]}>
              <Text style={[styles.infoLabel, { fontSize: 16 }]}>Lương thực nhận</Text>
              <Text style={styles.finalSalaryValue}>{formatVND(item.totalAmount)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Trạng thái</Text>
              <Text style={[styles.infoValue, { fontWeight: '700', color: getPayrollStatusInfo(item.periodStatus, item.isEstimate).color }]}>
                {getPayrollStatusInfo(item.periodStatus, item.isEstimate).text}
              </Text>
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
          {error ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ textAlign: 'center', color: '#B42318', fontSize: 14 }}>{error}</Text>
              <Pressable onPress={loadData} style={{ marginTop: 12 }}>
                <Text style={{ color: '#428531', fontWeight: '700' }}>Thử lại</Text>
              </Pressable>
            </View>
          ) : payslips.length === 0 ? (
            <Text style={{ padding: 24, textAlign: 'center', color: '#7B8490', fontSize: 14 }}>
              Chưa có phiếu lương nào trong hệ thống.
            </Text>
          ) : (
            payslips.map((ps, idx) => {
              const statusInfo = getPayrollStatusInfo(ps.periodStatus, ps.isEstimate);
              return (
                <Pressable
                  key={ps.id || idx}
                  style={styles.payslipRow}
                  onPress={() => setSelectedPayslip(ps)}
                >
                  {/* Left info */}
                  <View style={styles.payslipRowLeft}>
                    <Text style={styles.payslipTitle}>{ps.title}</Text>

                    <View style={styles.payslipDetailWrap}>
                      <View style={styles.yellowDotLine}>
                        <View style={styles.yellowBullet} />
                        <Text style={styles.detailedAmount}>{formatVND(ps.totalAmount)}</Text>
                      </View>
                      <Text style={styles.payslipRangeText}>{ps.periodRange}</Text>
                      <View style={styles.payslipRoleWrap}>
                        <View style={styles.roleTagDot} />
                        <Text style={styles.roleTagText}>{ps.role}</Text>
                        <Text style={styles.statusDotSeparator}>•</Text>
                        <Text style={[styles.roleTagText, { color: statusInfo.color, fontWeight: '600' }]}>
                          {statusInfo.text}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Right chevron */}
                  <Text style={styles.rowChevron}>›</Text>
                </Pressable>
              );
            })
          )}
        </View>
        <View style={{ height: 90 }} />
      </ScrollView>
      <BottomNavbar navigation={navigation} activeRoute="Payroll" />
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
    paddingBottom: 95,
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
  statusDotSeparator: {
    fontSize: 13,
    color: '#BBBBBB',
  },
  rowChevron: {
    fontSize: 22,
    color: '#AAAAAA',
    fontWeight: '300',
    paddingRight: 8,
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 195,
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
