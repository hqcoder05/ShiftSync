import { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, PanResponder } from 'react-native';

const WEEKDAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const MONTH_LABELS = ['Th1','Th2','Th3','Th4','Th5','Th6','Th7','Th8','Th9','Th10','Th11','Th12'];

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Chủ nhật
  const diff = day === 0 ? -6 : 1 - day; // đưa về Thứ 2 đầu tuần
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function WeekCalendar({ selectedDate, onSelectDate }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const today = new Date();
  const weekStart = startOfWeek(new Date(today.getTime() + weekOffset * 7 * 86400000));

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const goPrevWeek = () => setWeekOffset(w => w - 1);
  const goNextWeek = () => setWeekOffset(w => w + 1);

  // Vuốt trái/phải để đổi tuần, không cần cài thêm thư viện gesture
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderRelease: (_, g) => {
        if (g.dx < -40) goNextWeek();
        else if (g.dx > 40) goPrevWeek();
      },
    })
  ).current;

  const rangeLabel = () => {
    const first = days[0];
    const last = days[6];
    const sameMonth = first.getMonth() === last.getMonth();
    if (sameMonth) {
      return `${first.getDate()} - ${last.getDate()} ${MONTH_LABELS[first.getMonth()]}, ${first.getFullYear()}`;
    }
    return `${first.getDate()} ${MONTH_LABELS[first.getMonth()]} - ${last.getDate()} ${MONTH_LABELS[last.getMonth()]}, ${last.getFullYear()}`;
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goPrevWeek} style={styles.navBtn}>
          <Text style={styles.navText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.rangeLabel}>{rangeLabel()}</Text>
        <TouchableOpacity onPress={goNextWeek} style={styles.navBtn}>
          <Text style={styles.navText}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.daysRow} {...panResponder.panHandlers}>
        {days.map((d, i) => {
          const selected = isSameDay(d, selectedDate);
          const isToday = isSameDay(d, today);
          return (
            <TouchableOpacity
              key={i}
              style={[styles.dayCell, selected && styles.dayCellSelected]}
              onPress={() => onSelectDate(d)}
            >
              <Text style={[styles.weekdayText, selected && styles.dayTextSelected]}>{WEEKDAY_LABELS[d.getDay()]}</Text>
              <Text style={[styles.dateText, selected && styles.dayTextSelected]}>{d.getDate()}</Text>
              {isToday && !selected && <View style={styles.todayDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  navBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#f2f2f2' },
  navText: { fontSize: 20, color: '#333', fontWeight: '700', marginTop: -2 },
  rangeLabel: { fontSize: 14, fontWeight: '600', color: '#333' },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCell: { width: 38, height: 56, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 4 },
  dayCellSelected: { backgroundColor: '#51A33D' },
  weekdayText: { fontSize: 11, color: '#999', fontWeight: '600' },
  dateText: { fontSize: 15, color: '#333', fontWeight: '700' },
  dayTextSelected: { color: '#fff' },
  todayDot: { position: 'absolute', bottom: 6, width: 4, height: 4, borderRadius: 2, backgroundColor: '#51A33D' },
});