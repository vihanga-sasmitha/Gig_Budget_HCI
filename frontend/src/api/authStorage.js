import * as SecureStore from 'expo-secure-store';

const ACCESS = 'gigbudget_access_token';
const REFRESH = 'gigbudget_refresh_token';

export async function getAccessToken() {
  return SecureStore.getItemAsync(ACCESS);
}

export async function getRefreshToken() {
  return SecureStore.getItemAsync(REFRESH);
}

export async function setTokens({ accessToken, refreshToken }) {
  if (accessToken) await SecureStore.setItemAsync(ACCESS, accessToken);
  if (refreshToken) await SecureStore.setItemAsync(REFRESH, refreshToken);
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS);
  await SecureStore.deleteItemAsync(REFRESH);
}

export async function hasCloudSession() {
  return Boolean(await getAccessToken());
}
