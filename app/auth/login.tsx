import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { FormInput } from '@/src/components/FormInput';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { useAuth } from '@/src/features/auth/useAuth';
import { config } from '@/src/lib/config';
import { isValidEmail } from '@/src/utils/validation';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!config.isSupabaseConfigured) {
      Alert.alert(
        'Supabase Not Configured',
        'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file, then restart the app.'
      );
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Invalid Password', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      router.replace('/');
    } catch (error) {
      Alert.alert(
        'Login Failed',
        error instanceof Error ? error.message : 'Unknown error'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer
      title="Sales Attendance"
      subtitle="Sign in to verify attendance and spin for rewards"
    >
      {!config.isSupabaseConfigured ? (
        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>Setup Required</Text>
          <Text style={styles.warningText}>
            Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env, then restart Expo.
          </Text>
        </View>
      ) : null}

      <FormInput
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <FormInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <PrimaryButton title="Sign In" loading={loading} onPress={handleLogin} />

      <Link href="/(sales)/attendance" style={styles.devLink}>
        <Text style={styles.devLinkText}>GPS Prototype (dev)</Text>
      </Link>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  warningBox: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  warningTitle: {
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
  },
  warningText: {
    color: '#92400e',
    fontSize: 13,
  },
  devLink: {
    marginTop: 24,
    alignSelf: 'center',
  },
  devLinkText: {
    color: '#64748b',
    fontSize: 13,
  },
});
