import { mergeConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config = {
  stories: ['../stories/**/*.stories.@(ts|tsx)'],
  addons: [],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  viteFinal: async (baseConfig: any) => {
    return mergeConfig(baseConfig, {
      resolve: {
        alias: {
          '@ts-query/ui-react': path.resolve(
            __dirname,
            '../packages/ui-react/src',
          ),
        },
      },
    });
  },
};

export default config;
