import React from 'react';
import { Box } from '@ts-query/ui-react';

export default {
  title: 'Primitives/Box',
  component: Box,
  argTypes: {
    children: { control: 'text' },
    // spacing (4px scale when numeric)
    p: { control: { type: 'number' } },
    px: { control: { type: 'number' } },
    py: { control: { type: 'number' } },
    pt: { control: { type: 'number' } },
    pr: { control: { type: 'number' } },
    pb: { control: { type: 'number' } },
    pl: { control: { type: 'number' } },
    m: { control: { type: 'number' } },
    mx: { control: { type: 'number' } },
    my: { control: { type: 'number' } },
    mt: { control: { type: 'number' } },
    mr: { control: { type: 'number' } },
    mb: { control: { type: 'number' } },
    ml: { control: { type: 'number' } },
    // colors / radius
    bg: { control: 'color' },
    color: { control: 'color' },
    rounded: { control: { type: 'number' } },
    // hide noisy/advanced props from the panel
    as: { control: false },
    style: { control: false },
  },
};

export const Basic = {
  args: {
    p: 4,
    bg: '#edf2f7',
    children: 'This is a Box',
  },
};

export const Nested = {
  render: (args: any) => (
    <Box {...args}>
      <Box p={2} bg="#e2e8f0" rounded={4}>
        Inner box
      </Box>
    </Box>
  ),
  args: {
    p: 4,
    bg: '#edf2f7',
  },
};
