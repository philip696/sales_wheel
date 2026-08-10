import { View, Text, StyleSheet, type ViewProps } from 'react-native';

interface ScreenContainerProps extends ViewProps {
  title?: string;
  subtitle?: string;
}

export function ScreenContainer({
  title,
  subtitle,
  children,
  style,
  ...props
}: ScreenContainerProps) {
  return (
    <View style={[styles.container, style]} {...props}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    color: '#111',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
});
