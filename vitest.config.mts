import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    // Mock react-native for testing - only ui-native package imports from react-native
    // Other packages don't use react-native, so this alias won't mask any issues
    alias: {
      'react-native': path.resolve(
        __dirname,
        'packages/ui-native/src/__tests__/react-native-mock.ts',
      ),
    },
  },
});
