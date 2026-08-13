import {
  ReactNode,
} from 'react';

import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface ScreenContainerProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export function ScreenContainer({
  children,
  title,
  subtitle,
}: ScreenContainerProps) {
  return (
    <KeyboardAvoidingView
      style={styles.keyboard}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      <View style={styles.container}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={
            styles.content
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={true}
        >
          {/* HEADER */}

          {title ? (
            <View style={styles.header}>
              <Text style={styles.title}>
                {title}
              </Text>

              {subtitle ? (
                <Text style={styles.subtitle}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
          ) : null}

          {/* PAGE CONTENT */}

          {children}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
  },

  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  scroll: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 40,
  },

  header: {
    marginBottom: 20,
  },

  title: {
    fontSize: 27,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 4,
  },

  subtitle: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
  },
});