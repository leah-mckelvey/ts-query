import React from 'react';
import { Button } from '@ts-query/ui-react';

export default {
  title: 'Primitives/Button',
  component: Button,
  argTypes: {
    children: { control: 'text' },
    variant: {
      control: { type: 'select' },
      options: ['solid', 'outline', 'ghost'],
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
    colorScheme: {
      control: { type: 'select' },
      options: ['blue', 'gray', 'red', 'green'],
    },
    onClick: { action: 'clicked' },
    style: { control: false },
  },
};

export const Primary = {
  args: {
    children: 'Button',
    variant: 'solid',
    size: 'md',
    colorScheme: 'blue',
  },
};

export const Outline = {
  args: {
    children: 'Outline Button',
    variant: 'outline',
    size: 'md',
    colorScheme: 'blue',
  },
};
