import { FormInput } from '@/src/components/FormInput';
import { PrimaryButton } from '@/src/components/PrimaryButton';
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
      Alert.alert(
        'Invalid Email',
        'Please enter a valid email address.'
      );
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        'Invalid Password',
        'Password must be at least 6 characters.'
      );
      return;
    }

    setLoading(true);

    try {
      await signIn(email, password);

      router.replace('/(sales)/attendance');
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
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Logo / Branding */}
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>S</Text>
            </View>

            <Text style={styles.brandTitle}>Sales Wheel</Text>

            <Text style={styles.brandSubtitle}>
              Attendance & Rewards
            </Text>
          </View>

          {/* Login Card */}
          <View style={styles.card}>
            <Text style={styles.title}>Welcome Back</Text>

            <Text style={styles.subtitle}>
              Sign in to continue to your sales dashboard.
            </Text>

            {/* Supabase warning */}
            {!config.isSupabaseConfigured ? (
              <View style={styles.warningBox}>
                <Text style={styles.warningTitle}>
                  Setup Required
                </Text>

                <Text style={styles.warningText}>
                  Set EXPO_PUBLIC_SUPABASE_URL and
                  EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file,
                  then restart Expo.
                </Text>
              </View>
            ) : null}

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL</Text>

              <FormInput
                placeholder="Enter your email"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PASSWORD</Text>

              <FormInput
                placeholder="Enter your password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            {/* Login */}
            <PrimaryButton
              title={loading ? 'Signing In...' : 'Sign In'}
              loading={loading}
              onPress={handleLogin}
              style={styles.loginButton}
            />

            {/* Signup */}
            <Link href="/auth/signup" style={styles.signupLink}>
              <Text style={styles.signupText}>
                Don't have an account?{' '}
                <Text style={styles.signupBold}>Sign up</Text>
              </Text>
            </Link>
          </View>

          {/* Dev link */}
          <Link
            href="/(sales)/attendance"
            style={styles.devLink}
          >
            <Text style={styles.devLinkText}>
              GPS Prototype · Developer Mode
            </Text>
          </Link>

          {/* Footer */}
          <Text style={styles.footer}>
            Secure sales attendance & reward management
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },

  container: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 24,
  },

  /* Branding */

  brand: {
    alignItems: 'center',
    marginBottom: 28,
  },

  logo: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  logoText: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '900',
  },

  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -0.5,
  },

  brandSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },

  /* Login card */

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#e2e8f0',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },

  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 19,
    marginBottom: 22,
  },

  /* Inputs */

  inputGroup: {
    marginBottom: 16,
  },

  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.8,
    marginBottom: 6,
  },

  /* Warning */

  warningBox: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 13,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#fde68a',
  },

  warningTitle: {
    fontWeight: '800',
    color: '#92400e',
    marginBottom: 4,
    fontSize: 13,
  },

  warningText: {
    color: '#92400e',
    fontSize: 12,
    lineHeight: 18,
  },

  /* Button */

  loginButton: {
    marginTop: 4,
  },

  /* Signup */

  signupLink: {
    alignSelf: 'center',
    marginTop: 20,
  },

  signupText: {
    color: '#64748b',
    fontSize: 13,
  },

  signupBold: {
    color: '#111827',
    fontWeight: '800',
  },

  /* Developer */

  devLink: {
    alignSelf: 'center',
    marginTop: 22,
  },

  devLinkText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },

  /* Footer */

  footer: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 28,
  },
});