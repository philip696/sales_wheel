import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { FormInput } from '@/src/components/FormInput';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { useAuth } from '@/src/features/auth/useAuth';
import { config } from '@/src/lib/config';
import { isValidEmail } from '@/src/utils/validation';

export default function LoginScreen() {
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      const errorMessage = error instanceof Error ? error.message : '';
      const normalizedError = errorMessage.toLowerCase();

      const isInvalidCredentials =
        normalizedError.includes('invalid login credentials') ||
        normalizedError.includes('invalid credentials') ||
        normalizedError.includes('invalid email or password') ||
        normalizedError.includes('email or password') ||
        normalizedError.includes('invalid user credentials');

      if (isInvalidCredentials) {
        Alert.alert(
          'Login Failed',
          'Incorrect email or password. Please check your credentials and try again.'
        );
      } else if (normalizedError.includes('email not confirmed')) {
        Alert.alert(
          'Email Not Confirmed',
          'Please confirm your email address before signing in.'
        );
      } else {
        Alert.alert(
          'Login Failed',
          errorMessage ||
            'Unable to sign in. Please check your email and password and try again.'
        );
      }
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
          {/* Brand Header */}
          <View style={styles.brandContainer}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>SM</Text>
            </View>
            <Text style={styles.brandName}>Sales Man</Text>
            <Text style={styles.brandTagline}>Field Operations & Management</Text>
          </View>

          {/* Main Card */}
          <View style={styles.card}>
            <Text style={styles.headerTitle}>Sign In</Text>
            <Text style={styles.headerSubtitle}>
              Enter your credentials to access your daily tasks.
            </Text>

            {!config.isSupabaseConfigured && (
              <View style={styles.warningBox}>
                <Text style={styles.warningTitle}>Configuration Required</Text>
                <Text style={styles.warningText}>
                  Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your .env file.
                </Text>
              </View>
            )}

            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <FormInput
                placeholder="name@company.com"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Password</Text>
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={8}
                >
                  <Text style={styles.toggleText}>
                    {showPassword ? 'Hide' : 'Show'}
                  </Text>
                </Pressable>
              </View>

              <FormInput
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
            </View>

            {/* Action Button */}
            <PrimaryButton
              title={loading ? 'Signing In...' : 'Sign In'}
              loading={loading}
              onPress={handleLogin}
              style={styles.actionButton}
            />

            {/* Signup Navigation */}
            <Link href="/auth/signup" style={styles.signupLink}>
              <Text style={styles.signupText}>
                Need an account? <Text style={styles.signupHighlight}>Create one</Text>
              </Text>
            </Link>
          </View>

          {/* Dev Mode Shortcut */}
          <Link href="/(sales)/attendance" style={styles.devLink}>
            <Text style={styles.devText}>Open Location Prototype</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#f8fafc', // Clean, subtle off-white background
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },

  container: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    paddingHorizontal: 20,
  },

  /* Brand Header */
  brandContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },

  badge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },

  badgeText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  brandName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },

  brandTagline: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },

  /* Card Container */
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0', // Crisp subtle border
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },

  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 18,
  },

  /* Form Elements */
  inputGroup: {
    marginBottom: 16,
  },

  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },

  toggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
    marginBottom: 6,
  },

  /* Warnings */
  warningBox: {
    backgroundColor: '#fffbe1',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#d97706',
  },

  warningTitle: {
    fontWeight: '700',
    color: '#92400e',
    fontSize: 12,
  },

  warningText: {
    color: '#b45309',
    fontSize: 12,
    marginTop: 2,
  },

  /* Actions */
  actionButton: {
    marginTop: 8,
  },

  signupLink: {
    alignSelf: 'center',
    marginTop: 18,
  },

  signupText: {
    color: '#64748b',
    fontSize: 13,
  },

  signupHighlight: {
    color: '#2563eb',
    fontWeight: '600',
  },

  devLink: {
    alignSelf: 'center',
    marginTop: 24,
  },

  devText: {
    color: '#94a3b8',
    fontSize: 12,
  },
});