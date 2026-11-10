import { colors as uiColors } from '../theme/koreanPalette';
import { ensureTouchTarget } from '../utils/touchTarget';
import { useEffect, useState } from 'react';
import { Image, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { haversineMeters, openStoreMap } from '../utils/location';
import { showAlert } from '../utils/alert';

export default function StoreMapPreview({ store, distance, radius = 200 }) {
  const [uri, setUri] = useState(null);
  const valid = haversineMeters(store, store) != null;
  const latitude = valid ? Math.max(-85, Math.min(85, Number(store.latitude))) : 0;
  const longitude = valid ? Number(store.longitude) : 0;
  const zoom = 16, n = 2 ** zoom;
  const x = (longitude + 180) / 360 * n;
  const angle = latitude * Math.PI / 180;
  const y = (1 - Math.log(Math.tan(angle) + 1 / Math.cos(angle)) / Math.PI) / 2 * n;
  const tileId = `${zoom}/${Math.floor(x)}/${Math.floor(y)}`;
  const url = `${process.env.EXPO_PUBLIC_MAP_TILE_URL || 'https://tile.openstreetmap.org'}/${tileId}.png`;
  useEffect(() => {
    let active = true;
    setUri(null);
    if (!valid) return;
    const load = async () => {
      if (Platform.OS === 'web') { if (active) setUri(url); return; }
      const { File, Directory, Paths } = await import('expo-file-system');
      const directory = new Directory(Paths.cache, 'store-maps');
      directory.create({ idempotent: true, intermediates: true });
      const file = new File(directory, tileId.replaceAll('/', '-') + '.png');
      const key = `@map-tile:${url}`;
      const cachedAt = Number(await AsyncStorage.getItem(key) || 0);
      if (!file.exists || Date.now() - cachedAt > 7 * 86400000) {
        await File.downloadFileAsync(url, file, { idempotent: true, headers: { 'User-Agent': 'ShiftSync-Mobile/1.0' } });
        await AsyncStorage.setItem(key, String(Date.now()));
      }
      if (active) setUri(file.uri);
    };
    load().catch(() => {});
    return () => { active = false; };
  }, [url, valid, tileId]);
  if (!store) return null;
  const outside = distance != null && radius != null && distance > radius;
  return <View style={styles.card}>
    <View style={styles.row}>
      {valid && <View accessibilityLabel="Vị trí cửa hàng trên bản đồ" style={styles.map}>
        {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} onError={() => setUri(null)} /> : <Ionicons name="map-outline" size={34} color={uiColors.muted} />}
        {uri && <View style={{ position: 'absolute', left: `${(x % 1) * 100}%`, top: `${(y % 1) * 100}%`, transform: [{ translateX: -10 }, { translateY: -21 }] }}><Ionicons name="location" size={25} color={uiColors.primaryStrong} /></View>}
      </View>}
      <View style={styles.copy}>
        <Text style={styles.name}>{store.name || store.storeName || 'Cửa hàng'}</Text>
        {!!store.address && <Text style={styles.address}>{store.address}</Text>}
        <Text style={[styles.distance, outside && { color: uiColors.dangerText }]}>{distance == null || radius == null ? 'Cần GPS để kiểm tra vị trí' : `${Math.round(distance)} m · ${outside ? 'Ngoài' : 'Trong'} vùng cho phép`}</Text>
        <Text style={styles.address}>{radius ? `Bán kính cho phép: ${radius} m` : 'Chưa tải được phạm vi chấm công'}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Mở chỉ đường đến cửa hàng" style={ensureTouchTarget(styles.directions)} onPress={() => openStoreMap(store).catch((error) => showAlert('Chưa mở được bản đồ', error.message))}><Ionicons accessible={false} name="navigate-outline" size={16} color={uiColors.info} /><Text style={styles.link}>Chỉ đường</Text></Pressable>
      </View>
    </View>
    {valid && <Pressable accessibilityRole="button" style={ensureTouchTarget()} onPress={() => Linking.openURL('https://www.openstreetmap.org/copyright')}><Text style={styles.attribution}>© OpenStreetMap contributors</Text></Pressable>}
  </View>;
}
const styles = StyleSheet.create({
  card: { marginTop: 15, padding: 12, borderRadius: 12, backgroundColor: uiColors.surface },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  map: { width: 106, height: 106, borderRadius: 8, overflow: 'hidden', backgroundColor: uiColors.line, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 }, name: { fontSize: 13, color: uiColors.ink, fontWeight: '600' },
  address: { fontSize: 11, color: uiColors.muted, marginTop: 4 }, distance: { fontSize: 12, color: '#32654E', marginTop: 7 },
  directions: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 36 }, link: { fontSize: 12, color: uiColors.info, fontWeight: '600' },
  attribution: { textAlign: 'right', color: uiColors.muted, fontSize: 9, marginTop: 6 },
});
