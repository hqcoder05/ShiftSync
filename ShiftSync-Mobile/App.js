import React from 'react';
import AppNavigator from './navigation/AppNavigator';
import CustomAlertModal from './components/CustomAlertModal';

export default function App() {
  return (
    <>
      <AppNavigator />
      <CustomAlertModal />
    </>
  );
}