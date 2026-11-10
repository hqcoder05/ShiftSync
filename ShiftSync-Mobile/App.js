import React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './navigation/AppNavigator';
import CustomAlertModal from './components/CustomAlertModal';
import NetworkStatusBanner from './components/NetworkStatusBanner';
import NotificationRuntime from './components/NotificationRuntime';
import ResumeSyncRuntime from './components/ResumeSyncRuntime';
import { I18nProvider } from './i18n';

export default function App() {
  return (
    <I18nProvider><SafeAreaProvider>
      <NetworkStatusBanner />
      <NotificationRuntime />
      <ResumeSyncRuntime />
      <View style={{ flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center' }}><AppNavigator /></View>
      <CustomAlertModal />
    </SafeAreaProvider></I18nProvider>
  );
}
