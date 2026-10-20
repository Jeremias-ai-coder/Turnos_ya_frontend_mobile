import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { OwnerProvider } from './src/context/OwnerContext';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <OwnerProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </OwnerProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
