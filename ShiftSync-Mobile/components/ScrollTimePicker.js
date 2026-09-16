import { useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';

const ITEM_HEIGHT = 34;
const VISIBLE_COUNT = 3;
const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_COUNT;

function Column({ data, selectedValue, onChange }) {
  const scrollRef = useRef(null);
  const selectedIndex = data.indexOf(selectedValue);

  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: false });
    }, 0);
  }, []);

  const handleMomentumEnd = (e) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(data.length - 1, index));
    onChange(data[clamped]);
  };

  return (
    <ScrollView
      nestedScrollEnabled
      ref={scrollRef}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_HEIGHT}
      decelerationRate="fast"
      contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * Math.floor(VISIBLE_COUNT / 2) }}
      onMomentumScrollEnd={handleMomentumEnd}
    >
      {data.map((item) => (
        <View key={item} style={styles.itemBox}>
          <Text style={[styles.itemText, item === selectedValue && styles.itemTextActive]}>{item}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

export default function ScrollTimePicker({ value, onChange, onDone }) {
  const [hh, mm] = value.split(':');
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  const setHour = (h) => onChange(`${h}:${mm}`);
  const setMinute = (m) => onChange(`${hh}:${m}`);

  return (
    <View style={styles.card}>
      <View style={styles.highlightBand} pointerEvents="none" />
      <View style={styles.columns}>
        <Column data={hours} selectedValue={hh} onChange={setHour} />
        <Text style={styles.colon}>:</Text>
        <Column data={minutes} selectedValue={mm} onChange={setMinute} />
      </View>
      <TouchableOpacity style={styles.doneBtn} onPress={onDone}>
        <Text style={styles.doneText}>Xong</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginTop: -10,
    marginBottom: 10,
    marginHorizontal: 60,
    alignSelf: 'center',
    width: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
  },
  columns: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: CONTAINER_HEIGHT,
  },
  highlightBand: {
    position: 'absolute',
    top: ITEM_HEIGHT * Math.floor(VISIBLE_COUNT / 2),
    left: 16,
    right: 16,
    height: ITEM_HEIGHT,
    backgroundColor: '#F0EFEF',
    borderRadius: 8,
  },
  colon: { fontSize: 20, fontWeight: '600', color: '#333', marginHorizontal: 4 },
  itemBox: { height: ITEM_HEIGHT, width: 60, alignItems: 'center', justifyContent: 'center' },
  itemText: { fontSize: 15, color: '#bbb' },
  itemTextActive: { fontSize: 17, color: '#333', fontWeight: '700' },
  doneBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  doneText: { color: '#51A33D', fontWeight: '600', fontSize: 15 },
});