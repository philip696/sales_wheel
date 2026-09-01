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

export default function SignUpScreen() {
  const { signUp } = useAuth();

  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!config.isSupabaseConfigured) {
      Alert.alert(
        'Setup Required',
        'Supabase is not configured. Please check your .env file.'
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
      Alert.alert('Passwords Do Not Match', 'Please make sure both passwords match.');
      return;
    }

    setLoading(true);

    try {
      await signUp({
        username: username.trim(),
        email: email.trim(),
        password,
        name: name.trim() || undefined,
      });

      Alert.alert(
        'Account Created',
        'Your account has been created successfully!',
        [
          {
            text: 'Continue',
            onPress: () => router.replace('/(sales)'),
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        'Sign Up Failed',
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.'
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
          {/* Brand Header */}
          <View style={styles.brandContainer}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>SM</Text>
            </View>
            <Text style={styles.brandName}>Sales Man</Text>
            <Text style={styles.brandTagline}>Field Operations & Management</Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <Text style={styles.headerTitle}>Create Account</Text>
            <Text style={styles.headerSubtitle}>
              Fill in your details to set up your account.
            </Text>

            {!config.isSupabaseConfigured && (
              <View style={styles.warningBox}>
                <Text style={styles.warningTitle}>Configuration Required</Text>
                <Text style={styles.warningText}>
                  Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your .env file.
                </Text>
              </View>
            )}

            <View style={styles.formGroup}>
              {/* Account Details Section */}
              <Text style={styles.sectionHeader}>Account Info</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Username</Text>
                <FormInput
                  placeholder="johndoe"
                  autoCapitalize="none"
                  value={username}
                  onChangeText={setUsername}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <FormInput
                  placeholder="John Doe"
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
                <FormInput
                  placeholder="name@company.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              {/* Security Section */}
              <View style={styles.sectionDivider} />
              <View style={styles.labelRow}>
                <Text style={styles.sectionHeader}>Security</Text>
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={8}
                >
                  <Text style={styles.toggleText}>
                    {showPassword ? 'Hide Passwords' : 'Show Passwords'}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <FormInput
                  placeholder="At least 6 characters"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm Password</Text>
                <FormInput
                  placeholder="Re-enter your password"
                  secureTextEntry={!showPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
              </View>
            </View>

            {/* Action */}
            <PrimaryButton
              title={loading ? 'Creating Account...' : 'Register'}
              loading={loading}
              onPress={handleSignUp}
              style={styles.actionButton}
            />

            {/* Sign In Route */}
            <Link href="/auth/login" style={styles.loginLink}>
              <Text style={styles.loginText}>
                Already have an account? <Text style={styles.loginHighlight}>Sign in</Text>
              </Text>
            </Link>
          </View>
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
    paddingVertical: 36,
  },

  container: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    paddingHorizontal: 20,
  },

  /* Header */
  brandContainer: {
    alignItems: 'center',
    marginBottom: 24,
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

  /* Card */
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
  formGroup: {
    gap: 12,
  },

  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: 0.3,
    marginBottom: 2,
  },

  sectionDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 6,
  },

  inputGroup: {
    marginBottom: 2,
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

  /* Actions & Navigation */
  actionButton: {
    marginTop: 16,
  },

  loginLink: {
    alignSelf: 'center',
    marginTop: 18,
  },

  loginText: {
    color: '#64748b',
    fontSize: 13,
  },

  loginHighlight: {
    color: '#2563eb',
    fontWeight: '600',
  },
});