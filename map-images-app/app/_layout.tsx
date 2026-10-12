import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MarkersProvider } from '../context/MarkersContext';

// Ошибки рендера/навигации перехватываются встроенным ErrorBoundary expo-router.
export { ErrorBoundary } from 'expo-router';

export default function RootLayout() {
  return (
    <MarkersProvider>
      <StatusBar style="dark" />
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen
          name="marker/[id]"
          options={{ title: 'Маркер', headerBackTitle: 'Карта' }}
        />
      </Stack>
    </MarkersProvider>
  );
}
