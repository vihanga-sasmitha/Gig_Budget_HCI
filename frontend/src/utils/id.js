import * as Crypto from 'expo-crypto';

export async function newId() {
  const bytes = await Crypto.getRandomBytesAsync(16);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}
