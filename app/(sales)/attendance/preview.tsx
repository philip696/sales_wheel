import { Alert, Image, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { useAttendanceFlow } from '@/src/features/attendance/AttendanceFlowContext';

export default function AttendancePreviewScreen() {
  const { photoUri, selectedStore } = useAttendanceFlow();

  if (!photoUri) {
    return (
      <ScreenContainer title="No Photo">
        <PrimaryButton
          title="Retake"
          onPress={() => router.replace('/(sales)/attendance/camera')}
        />
      </ScreenContainer>
    );
  }

  const handleSubmit = () => {
    Alert.alert(
      'Submit Attendance',
      'Attendance submission will be implemented in the next phase. ' +
        'The backend RPC `submit_attendance` is ready.',
      [{ text: 'OK', onPress: () => router.push('/(sales)/attendance/result') }]
    );
  };

  return (
    <ScreenContainer
      title="Preview Photo"
      subtitle={selectedStore?.name ?? 'Attendance photo'}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: photoUri }} style={styles.image} />
      </View>

      <PrimaryButton title="Submit Attendance" onPress={handleSubmit} />
      <PrimaryButton
        title="Retake"
        variant="secondary"
        onPress={() => router.replace('/(sales)/attendance/camera')}
        style={styles.button}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    flex: 1,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
  },
  image: {
    flex: 1,
    resizeMode: 'contain',
  },
  button: {
    marginTop: 12,
  },
});
