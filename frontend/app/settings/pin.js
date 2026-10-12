import { useEffect, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import Screen from '../../src/components/Screen';
import Button from '../../src/components/Button';
import PinDots from '../../src/components/PinDots';
import Keypad from '../../src/components/Keypad';
import { useApp } from '../../src/context/AppContext';
import { usePinEntry } from '../../src/hooks/usePinEntry';
import {
  setBiometricsEnabled,
  isBiometricsEnabled,
  changePin,
  verifyPin,
} from '../../src/security/pinVault';
import { colors, spacing, typography } from '../../src/theme';

export default function PinSettings() {
  const { t, biometricsEnabled, setBiometricsEnabled: setBio, activeVaultKey } = useApp();
  const [supported, setSupported] = useState(false);
  const [step, setStep] = useState('idle'); // idle | current | next | confirm
  const [currentPin, setCurrentPin] = useState('');
  const [pendingNew, setPendingNew] = useState('');
  const [message, setMessage] = useState('');
  const { pin, onKey, clear } = usePinEntry(4);

  useEffect(() => {
    if (!activeVaultKey) return;
    (async () => {
      const hw = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setSupported(hw && enrolled);
      setBio(await isBiometricsEnabled(activeVaultKey));
    })();
  }, [setBio, activeVaultKey]);

  useEffect(() => {
    if (pin.length !== 4 || step === 'idle' || !activeVaultKey) return;
    let cancelled = false;

    (async () => {
      if (step === 'current') {
        const checked = await verifyPin(activeVaultKey, pin);
        if (cancelled) return;
        clear();
        if (!checked.ok) {
          setMessage(
            checked.locked
              ? `${t('onboarding.locked')} ${
                  checked.retryAt ? new Date(checked.retryAt).toLocaleTimeString() : ''
                }`
              : 'Incorrect current PIN'
          );
          return;
        }
        setCurrentPin(pin);
        setMessage('Enter a new 4-digit PIN');
        setStep('next');
        return;
      }

      if (step === 'next') {
        setPendingNew(pin);
        clear();
        setMessage('Confirm your new PIN');
        setStep('confirm');
        return;
      }

      if (step === 'confirm') {
        if (pin !== pendingNew) {
          clear();
          setPendingNew('');
          setStep('next');
          setMessage(t('onboarding.pinMismatch'));
          return;
        }
        const result = await changePin(activeVaultKey, currentPin, pin);
        if (cancelled) return;
        clear();
        if (!result.ok) {
          setMessage('Could not change PIN. Try again.');
          setStep('current');
          setCurrentPin('');
          setPendingNew('');
          return;
        }
        setMessage('PIN updated for this profile only');
        setStep('idle');
        setCurrentPin('');
        setPendingNew('');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pin, step, pendingNew, currentPin, clear, t, activeVaultKey]);

  const toggleBio = async () => {
    if (!activeVaultKey) return;
    const next = !biometricsEnabled;
    await setBiometricsEnabled(activeVaultKey, next);
    setBio(next);
  };

  const cancelChange = () => {
    setStep('idle');
    setMessage('');
    setCurrentPin('');
    setPendingNew('');
    clear();
  };

  return (
    <Screen scroll>
      <Text style={styles.body}>{t('settings.pin')}</Text>
      <Text style={styles.note}>PIN and biometrics apply only to the active profile.</Text>
      {supported ? (
        <Button
          title={biometricsEnabled ? 'Disable biometrics' : t('onboarding.enableBiometrics')}
          onPress={toggleBio}
        />
      ) : (
        <Text style={styles.note}>Biometrics not available on this device.</Text>
      )}

      {step === 'idle' ? (
        <Button
          title="Change PIN"
          variant="secondary"
          onPress={() => {
            setStep('current');
            setMessage('Enter your current PIN');
            clear();
          }}
        />
      ) : (
        <>
          <Text style={styles.step}>
            {step === 'current'
              ? 'Current PIN'
              : step === 'next'
                ? 'New PIN'
                : 'Confirm new PIN'}
          </Text>
          <PinDots filled={pin.length} />
          <Keypad onKey={onKey} />
          <Button title={t('common.cancel')} variant="secondary" onPress={cancelChange} />
        </>
      )}
      {message ? <Text style={styles.msg}>{message}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { ...typography.body, marginBottom: spacing.lg },
  note: { color: colors.textSecondary, marginTop: spacing.md, lineHeight: 20, marginBottom: spacing.md },
  step: { ...typography.subtitle, marginTop: spacing.lg, marginBottom: spacing.sm },
  msg: { marginTop: spacing.md, color: colors.primaryDark, fontWeight: '600' },
});
