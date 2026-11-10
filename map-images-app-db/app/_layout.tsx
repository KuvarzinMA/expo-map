import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { DatabaseProvider, useDatabase } from '../contexts/DatabaseContext';
import { errorMessage } from '../database/errors';

// Ошибки рендера/навигации перехватываются встроенным ErrorBoundary expo-router.
export { ErrorBoundary } from 'expo-router';

/** Показывает загрузку/ошибку, пока база данных не готова. */
function DatabaseGate({ children }: { children: React.ReactNode }) {
  const { isLoading, error, retry } = useDatabase();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.muted}>Подготовка базы данных…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Ошибка базы данных</Text>
        <Text style={styles.muted}>{errorMessage(error)}</Text>
        <Text style={styles.details}>{error.message}</Text>
        <Pressable style={styles.button} onPress={retry}>
          <Text style={styles.buttonText}>Повторить</Text>
        </Pressable>
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <DatabaseProvider>
      <StatusBar style="dark" />
      <DatabaseGate>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen
            name="marker/[id]"
            options={{ title: 'Маркер', headerBackTitle: 'Карта' }}
          />
        </Stack>
      </DatabaseGate>
    </DatabaseProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  muted: { color: '#666', marginTop: 12, textAlign: 'center' },
  details: { color: '#999', fontSize: 12, marginTop: 8, textAlign: 'center' },
  errorTitle: { fontSize: 18, fontWeight: '600', color: '#c0392b' },
  button: {
    marginTop: 16,
    backgroundColor: '#2f80ed',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});
