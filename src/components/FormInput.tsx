import { TextInput, StyleSheet, type TextInputProps } from 'react-native';

export function FormInput(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor="#999"
      style={[styles.input, props.style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#fafafa',
    color: '#111',
  },
});
