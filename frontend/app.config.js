/** GigBudget — use EXPO_PUBLIC_API_URL; Android emulator default 10.0.2.2 */
export default ({ config }) => ({
  ...config,
  name: 'GigBudget',
  slug: 'gigbudget',
  scheme: 'gigbudget',
  userInterfaceStyle: 'light',
  extra: {
    ...config.extra,
    apiUrl:
      process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:4000/api',
  },
  ios: {
    ...config.ios,
    supportsTablet: true,
    infoPlist: {
      NSFaceIDUsageDescription: 'Unlock GigBudget with Face ID or Touch ID.',
    },
  },
  android: {
    ...config.android,
    permissions: [
      'USE_BIOMETRIC',
      'USE_FINGERPRINT',
      'POST_NOTIFICATIONS',
      'VIBRATE',
    ],
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-sqlite',
    'expo-sharing',
    'expo-splash-screen',
    '@react-native-community/datetimepicker',
    [
      'expo-local-authentication',
      { faceIDPermission: 'Allow GigBudget to use Face ID.' },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/icon.png',
        color: '#169E98',
      },
    ],
  ],
});
