import React, { useState, useMemo } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ALL_APIS, API_GROUPS, executeApi } from '../services/allApisRegistry';

export default function ApiTestHubScreen({ navigation }) {
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedApi, setSelectedApi] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const [pathParamValues, setPathParamValues] = useState({});
  const [queryParamValues, setQueryParamValues] = useState({});
  const [payloadText, setPayloadText] = useState('{}');
  const [loading, setLoading] = useState(false);
  const [responseResult, setResponseResult] = useState(null);

  const filteredApis = useMemo(() => {
    return ALL_APIS.filter((api) => {
      const matchGroup = selectedGroup === 'ALL' || api.group === selectedGroup;
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        api.path.toLowerCase().includes(q) ||
        api.method.toLowerCase().includes(q) ||
        api.group.toLowerCase().includes(q) ||
        api.description.toLowerCase().includes(q);
      return matchGroup && matchSearch;
    });
  }, [selectedGroup, search]);

  const openApiModal = (apiItem) => {
    setSelectedApi(apiItem);
    const pVals = {};
    apiItem.pathParams.forEach((p) => {
      pVals[p] = '';
    });
    setPathParamValues(pVals);

    const qVals = {};
    apiItem.queryParams.forEach((q) => {
      qVals[q] = '';
    });
    setQueryParamValues(qVals);

    setPayloadText(JSON.stringify(apiItem.defaultPayload, null, 2));
    setResponseResult(null);
    setModalVisible(true);
  };

  const handleExecute = async () => {
    if (!selectedApi) return;
    setLoading(true);
    setResponseResult(null);
    const start = Date.now();

    let parsed = null;
    if (selectedApi.method !== 'GET' && selectedApi.method !== 'DELETE') {
      try {
        parsed = JSON.parse(payloadText || '{}');
      } catch (err) {
        setLoading(false);
        setResponseResult({
          status: 'ERR_JSON',
          time: 0,
          data: 'Lỗi cú pháp JSON: ' + err.message,
        });
        return;
      }
    }

    try {
      const res = await executeApi(selectedApi, pathParamValues, queryParamValues, parsed);
      const elapsed = Date.now() - start;
      setResponseResult({
        status: `${res.status} ${res.statusText || 'OK'}`,
        isSuccess: true,
        time: elapsed,
        data: res.data,
      });
    } catch (err) {
      const elapsed = Date.now() - start;
      setResponseResult({
        status: err.response ? `${err.response.status}` : 'ERROR',
        isSuccess: false,
        time: elapsed,
        data: err.response?.data || err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const getMethodColor = (m) => {
    switch (m) {
      case 'GET': return '#16a34a';
      case 'POST': return '#2563eb';
      case 'PUT': return '#d97706';
      case 'PATCH': return '#9333ea';
      case 'DELETE': return '#dc2626';
      default: return '#475569';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>‹ Quay lại</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.title}>API Testing Hub</Text>
          <Text style={styles.subtitle}>Kiểm tra 109 API ShiftSync trên Mobile</Text>
        </View>
      </View>

      {/* Search & Filter */}
      <View style={styles.filterSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm path, method, từ khóa..."
          value={search}
          onChangeText={setSearch}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.groupScroll}>
          <TouchableOpacity
            style={[styles.groupChip, selectedGroup === 'ALL' && styles.groupChipActive]}
            onPress={() => setSelectedGroup('ALL')}
          >
            <Text style={[styles.groupChipText, selectedGroup === 'ALL' && styles.groupChipTextActive]}>
              Tất cả ({ALL_APIS.length})
            </Text>
          </TouchableOpacity>
          {API_GROUPS.map((g) => (
            <TouchableOpacity
              key={g}
              style={[styles.groupChip, selectedGroup === g && styles.groupChipActive]}
              onPress={() => setSelectedGroup(g)}
            >
              <Text style={[styles.groupChipText, selectedGroup === g && styles.groupChipTextActive]}>
                {g}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* List APIs */}
      <ScrollView style={styles.apiList} contentContainerStyle={{ paddingBottom: 24 }}>
        {filteredApis.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.apiCard}
            onPress={() => openApiModal(item)}
          >
            <View style={styles.apiCardHeader}>
              <View style={[styles.methodBadge, { backgroundColor: getMethodColor(item.method) }]}>
                <Text style={styles.methodText}>{item.method}</Text>
              </View>
              <Text style={styles.apiPath} numberOfLines={1}>{item.path}</Text>
            </View>
            <Text style={styles.apiDesc}>{item.description}</Text>
            <Text style={styles.apiGroup}>Nhóm: {item.group}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Modal Executor */}
      <Modal visible={modalVisible} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕ Đóng</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle} numberOfLines={1}>Chi tiết & Kiểm thử</Text>
          </View>

          {selectedApi && (
            <ScrollView style={styles.modalBody}>
              <View style={styles.apiCardHeader}>
                <View style={[styles.methodBadge, { backgroundColor: getMethodColor(selectedApi.method) }]}>
                  <Text style={styles.methodText}>{selectedApi.method}</Text>
                </View>
                <Text style={[styles.apiPath, { fontSize: 14 }]} numberOfLines={2}>{selectedApi.path}</Text>
              </View>
              <Text style={[styles.apiDesc, { marginVertical: 6 }]}>{selectedApi.description}</Text>

              {/* Path Params */}
              {selectedApi.pathParams.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Tham số đường dẫn (Path Params):</Text>
                  {selectedApi.pathParams.map((p) => (
                    <View key={p} style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>{p} *</Text>
                      <TextInput
                        style={styles.input}
                        value={pathParamValues[p]}
                        onChangeText={(t) => setPathParamValues({ ...pathParamValues, [p]: t })}
                        placeholder={`Nhập ${p}`}
                      />
                    </View>
                  ))}
                </View>
              )}

              {/* Query Params */}
              {selectedApi.queryParams.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Tham số truy vấn (Query Params):</Text>
                  {selectedApi.queryParams.map((q) => (
                    <View key={q} style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>{q}</Text>
                      <TextInput
                        style={styles.input}
                        value={queryParamValues[q]}
                        onChangeText={(t) => setQueryParamValues({ ...queryParamValues, [q]: t })}
                        placeholder={`Giá trị ${q}`}
                      />
                    </View>
                  ))}
                </View>
              )}

              {/* Payload */}
              {selectedApi.method !== 'GET' && selectedApi.method !== 'DELETE' && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Request Body (JSON Payload):</Text>
                  <TextInput
                    style={styles.payloadInput}
                    multiline
                    numberOfLines={6}
                    value={payloadText}
                    onChangeText={setPayloadText}
                  />
                </View>
              )}

              <TouchableOpacity
                style={[styles.executeBtn, loading && { backgroundColor: '#94a3b8' }]}
                onPress={handleExecute}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.executeBtnText}>GỬI REQUEST [{selectedApi.method}]</Text>
                )}
              </TouchableOpacity>

              {/* Response */}
              {responseResult && (
                <View style={styles.responseBox}>
                  <View style={styles.responseStatusRow}>
                    <Text style={[styles.statusTag, responseResult.isSuccess ? styles.statusSuccess : styles.statusFail]}>
                      Status: {responseResult.status}
                    </Text>
                    <Text style={styles.responseTime}>{responseResult.time} ms</Text>
                  </View>
                  <ScrollView style={styles.resultScroll} nestedScrollEnabled>
                    <Text style={styles.resultText}>
                      {typeof responseResult.data === 'object'
                        ? JSON.stringify(responseResult.data, null, 2)
                        : String(responseResult.data)}
                    </Text>
                  </ScrollView>
                </View>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  backBtnText: {
    fontSize: 14,
    color: '#0284c7',
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748b',
  },
  filterSection: {
    padding: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    marginBottom: 8,
  },
  groupScroll: {
    flexDirection: 'row',
  },
  groupChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  groupChipActive: {
    backgroundColor: '#0284c7',
  },
  groupChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  groupChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  apiList: {
    flex: 1,
    padding: 12,
  },
  apiCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  apiCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  methodBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  methodText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  apiPath: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    flex: 1,
    fontFamily: 'monospace',
  },
  apiDesc: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 4,
  },
  apiGroup: {
    fontSize: 11,
    color: '#94a3b8',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  closeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    marginRight: 12,
  },
  closeBtnText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  modalBody: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  inputGroup: {
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 2,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  payloadInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    padding: 10,
    fontFamily: 'monospace',
    fontSize: 12,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  executeBtn: {
    backgroundColor: '#0284c7',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 16,
  },
  executeBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  responseBox: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 40,
  },
  responseStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusTag: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusSuccess: {
    backgroundColor: '#15803d',
    color: '#ffffff',
  },
  statusFail: {
    backgroundColor: '#b91c1c',
    color: '#ffffff',
  },
  responseTime: {
    fontSize: 11,
    color: '#94a3b8',
  },
  resultScroll: {
    maxHeight: 250,
  },
  resultText: {
    color: '#f8fafc',
    fontFamily: 'monospace',
    fontSize: 11,
  },
});
