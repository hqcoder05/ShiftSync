import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

export default function LazyScreen({ loader, ...props }) {
  const [Screen, setScreen] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    loader().then((module) => {
      if (active) setScreen(() => module.default);
    }).catch(setError);
    return () => { active = false; };
  }, [loader]);

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ color: '#C62828', textAlign: 'center' }}>Không thể tải màn hình: {error.message}</Text>
      </View>
    );
  }
  if (!Screen) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color="#51A33D" /></View>;
  return <Screen {...props} />;
}
