import { FormInput } from '@/src/components/FormInput';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { useAuth } from '@/src/features/auth/useAuth';
import { config } from '@/src/lib/config';
import { isValidEmail } from '@/src/utils/validation';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!config.isSupabaseConfigured) {
      Alert.alert(
        'Supabase Not Configured',
        'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file, then restart the app.'
      );
      return;
    }

    if (username.trim().length < 3) {
      Alert.alert('Invalid Username', 'Username must be at least 3 characters.');
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

    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await signUp({
        username,
        email,
        password,
        name: name || undefined,
      });
      Alert.alert('Account Created', 'You can now sign in with your new account.', [
        { text: 'OK', onPress: () => router.replace('/auth/login') },
      ]);
    } catch (error) {
      Alert.alert(
        'Sign Up Failed',
        error instanceof Error ? error.message : 'Unknown error'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenContainer
          title="Create Account"
          subtitle="Sign up to verify attendance and spin for rewards"
          style={styles.screenContainer}
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
            placeholder="Username"
            autoCapitalize="none"
            value={username}
            onChangeText={setUsername}
          />
          <FormInput
            placeholder="Full Name (optional)"
            value={name}
            onChangeText={setName}
          />
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
          <FormInput
            placeholder="Confirm Password"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <PrimaryButton title="Sign Up" loading={loading} onPress={handleSignUp} />

          <Link href="/auth/login" style={styles.devLink}>
            <Text style={styles.devLinkText}>Already have an account? Sign in</Text>
          </Link>
        </ScreenContainer>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  // ScreenContainer sets flex: 1 by default, which assumes a bounded parent.
  // Inside a ScrollView the parent height is unbounded, so flex: 1 can
  // collapse this to zero height and hide everything inside it (including
  // the button). Override back to flex: 0 so it sizes to its own content.
  screenContainer: {
    flex: 0,
  },
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