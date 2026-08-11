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

import { FormInput } from '@/src/components/FormInput';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { ScreenContainer } from '@/src/components/ScreenContainer';
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
      Alert.alert(
        'Invalid Username',
        'Username must be at least 3 characters.'
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

    if (password !== confirmPassword) {
      Alert.alert(
        'Passwords Do Not Match',
        'Please make sure both passwords are the same.'
      );
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
        <ScreenContainer
          title="Create Account"
          subtitle="Join the sales team and start earning rewards"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>S</Text>
            </View>

            <Text style={styles.welcomeTitle}>
              Welcome aboard
            </Text>

            <Text style={styles.welcomeText}>
              Create your account to access your sales dashboard.
            </Text>
          </View>

          {/* Supabase warning */}
          {!config.isSupabaseConfigured ? (
            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>
                Setup Required
              </Text>

              <Text style={styles.warningText}>
                Supabase is not configured. Check your .env file and
                restart Expo.
              </Text>
            </View>
          ) : null}

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.sectionTitle}>
              Personal Information
            </Text>

            <Text style={styles.inputLabel}>
              Username
            </Text>

            <FormInput
              placeholder="Choose a username"
              autoCapitalize="none"
              value={username}
              onChangeText={setUsername}
            />

            <Text style={styles.inputLabel}>
              Full Name
            </Text>

            <FormInput
              placeholder="Enter your full name"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.inputLabel}>
              Email Address
            </Text>

            <FormInput
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.sectionTitle}>
              Security
            </Text>

            <Text style={styles.inputLabel}>
              Password
            </Text>

            <FormInput
              placeholder="At least 6 characters"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <Text style={styles.inputLabel}>
              Confirm Password
            </Text>

            <FormInput
              placeholder="Enter your password again"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </View>

          {/* Sign Up */}
          <PrimaryButton
            title={loading ? 'Creating Account...' : 'Create Account'}
            loading={loading}
            onPress={handleSignUp}
            style={styles.createButton}
          />

          {/* Login */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>
              Already have an account?
            </Text>

            <Link href="/auth/login">
              <Text style={styles.loginLink}>
                Sign In
              </Text>
            </Link>
          </View>

          {/* Footer */}
          <Text style={styles.footer}>
            By creating an account, you agree to use the sales
            platform responsibly.
          </Text>
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
  },

  header: {
    alignItems: 'center',
    marginBottom: 28,
  },

  logo: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  logoText: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '900',
  },

  welcomeTitle: {
    fontSize: 27,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },

  welcomeText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#64748b',
    textAlign: 'center',
    maxWidth: 320,
  },

  warningBox: {
    backgroundColor: '#fef3c7',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fde68a',
  },

  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 4,
  },

  warningText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#92400e',
  },

  form: {
    marginBottom: 8,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    marginTop: 8,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },

  createButton: {
    marginTop: 12,
  },

  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
    gap: 5,
  },

  loginText: {
    fontSize: 14,
    color: '#64748b',
  },

  loginLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563eb',
  },

  footer: {
    fontSize: 11,
    lineHeight: 17,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 22,
    paddingHorizontal: 20,
  },
});