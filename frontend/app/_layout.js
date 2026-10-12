import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { AppProvider } from '../src/context/AppContext';
import RouteGuard from '../src/components/RouteGuard';
import ThemeBridge from '../src/theme/ThemeBridge';
import { useTheme } from '../src/theme';

function ThemedStack() {
  const { colors, isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.primaryDark,
          headerTitleStyle: { fontWeight: '700', color: colors.text },
          contentStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="expense/quick" options={{ title: 'Quick expense', presentation: 'modal' }} />
        <Stack.Screen name="expense/confirm" options={{ title: 'Saved', headerShown: false }} />
        <Stack.Screen name="expense/[id]" options={{ title: 'Expense' }} />
        <Stack.Screen name="expense/edit/[id]" options={{ title: 'Edit expense' }} />
        <Stack.Screen name="income/index" options={{ title: 'Income' }} />
        <Stack.Screen name="income/new" options={{ title: 'Add income' }} />
        <Stack.Screen name="income/[id]" options={{ title: 'Income detail' }} />
        <Stack.Screen name="savings/index" options={{ title: 'Savings' }} />
        <Stack.Screen name="savings/[id]" options={{ title: 'Savings goal' }} />
        <Stack.Screen name="bills/index" options={{ title: 'Bills' }} />
        <Stack.Screen name="bills/[id]" options={{ title: 'Bill' }} />
        <Stack.Screen name="notifications/index" options={{ title: 'Notifications' }} />
        <Stack.Screen name="settings/profile" options={{ title: 'Profile' }} />
        <Stack.Screen name="settings/cloud" options={{ title: 'Cloud account' }} />
        <Stack.Screen name="settings/pin" options={{ title: 'PIN & biometrics' }} />
        <Stack.Screen name="settings/export" options={{ title: 'Export' }} />
        <Stack.Screen name="settings/sync" options={{ title: 'Sync' }} />
        <Stack.Screen name="settings/language" options={{ title: 'Language' }} />
        <Stack.Screen name="settings/appearance" options={{ title: 'Appearance' }} />
        <Stack.Screen name="settings/currency" options={{ title: 'Currency' }} />
        <Stack.Screen name="reports/generate" options={{ title: 'Financial report' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        <ThemeBridge>
          <RouteGuard>
            <ThemedStack />
          </RouteGuard>
        </ThemeBridge>
      </AppProvider>
    </GestureHandlerRootView>
  );
}
