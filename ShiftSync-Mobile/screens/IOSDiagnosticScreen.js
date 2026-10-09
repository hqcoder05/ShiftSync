import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { runMobileDiagnostics } from '../services/diagnosticRegistry';

export default function IOSDiagnosticScreen() {
  const [results, setResults] = useState([]);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    try { setResults(await runMobileDiagnostics()); } finally { setRunning(false); }
  };

  useEffect(() => { run(); }, []);

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.title}>iOS Diagnostic</Text>
      {running && <ActivityIndicator color="#51A33D" />}
      {results.map((item) => (
        <View key={item.name} style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={[styles.status, styles[item.status]]}>{item.status}</Text>
          </View>
          <Text style={styles.stage}>Stage: {item.stage}</Text>
          {item.error && <Text style={styles.error}>Error: {item.error}</Text>}
          {item.stack && <Text selectable style={styles.stack}>{item.stack}</Text>}
        </View>
      ))}
      <Pressable style={styles.button} onPress={run} disabled={running}>
        <Text style={styles.buttonText}>{running ? 'Đang kiểm tra...' : 'Chạy lại diagnostic'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, backgroundColor: '#F7FBF5', flexGrow: 1 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 16, color: '#273426' },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { fontWeight: '700', color: '#273426' },
  status: { fontWeight: '800' },
  PASS: { color: '#2E7D32' },
  FAIL: { color: '#C62828' },
  SKIPPED: { color: '#B26A00' },
  stage: { marginTop: 5, color: '#667064', fontSize: 12 },
  error: { marginTop: 6, color: '#C62828' },
  stack: { marginTop: 6, color: '#555', fontSize: 11 },
  button: { marginTop: 8, padding: 14, borderRadius: 10, backgroundColor: '#EAF6EA', alignItems: 'center' },
  buttonText: { color: '#2E7D32', fontWeight: '700' },
});

