import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

export interface AppAlertButton {
  text: string;
  style?: 'default' | 'destructive' | 'cancel';
  onPress?: () => void;
}

interface AppAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: AppAlertButton[];
  onRequestClose: () => void;
}

/**
 * React Native's Alert.alert() is a full no-op on web (react-native-web
 * ships an empty stub — no window.confirm, no callback, nothing). Any
 * confirmation flow that depends on Alert.alert's buttons silently does
 * nothing when running in a browser. This component renders an equivalent
 * dialog using a real Modal, so it behaves the same on web, iOS, and
 * Android.
 */
export function AppAlert({
  visible,
  title,
  message,
  buttons,
  onRequestClose,
}: AppAlertProps) {
  const resolvedButtons: AppAlertButton[] =
    buttons && buttons.length > 0 ? buttons : [{ text: 'OK', style: 'cancel' }];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={styles.buttonStack}>
            {resolvedButtons.map((button, index) => (
              <Pressable
                key={`${button.text}-${index}`}
                style={[
                  styles.button,
                  button.style === 'destructive' && styles.destructiveButton,
                  button.style === 'cancel' && styles.cancelButton,
                ]}
                onPress={() => {
                  onRequestClose();
                  button.onPress?.();
                }}
              >
                <Text
                  style={[
                    styles.buttonText,
                    button.style === 'cancel' && styles.cancelText,
                  ]}
                >
                  {button.text}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    width: '100%',
    maxWidth: 380,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 18,
  },
  buttonStack: {
    gap: 8,
  },
  button: {
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#2563eb',
  },
  destructiveButton: {
    backgroundColor: '#dc2626',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  cancelText: {
    color: '#334155',
  },
});