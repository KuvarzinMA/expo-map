import { Alert, Platform } from 'react-native';

/**
 * Alert.alert из React Native на web ничего не делает,
 * поэтому в браузере используем window.confirm / window.alert.
 */

export function showMessage(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

export function confirmAction(
  title: string,
  message?: string,
  confirmText = 'Удалить'
): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(
      window.confirm(message ? `${title}\n\n${message}` : title)
    );
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Отмена', style: 'cancel', onPress: () => resolve(false) },
        { text: confirmText, style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}
