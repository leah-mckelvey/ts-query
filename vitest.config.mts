import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM-compatible __dirname replacement
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    // Mock react-native for testing
    // Note: This alias applies globally to all packages. Currently only ui-native
    // imports from react-native, but if other packages add RN imports in the future,
    // they will also use this mock. Consider package-specific vitest configs if
    // different packages need different mocking strategies.
    alias: {
      'react-native': path.resolve(
        __dirname,
        'packages/ui-native/src/__tests__/react-native-mock.tsx',
      ),
    },
  },
});
