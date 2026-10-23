import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PlanScreen } from './src/views/screens/PlanScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <PlanScreen />
    </SafeAreaProvider>
  );
}
