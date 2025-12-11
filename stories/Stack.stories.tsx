import React from 'react';
import { Stack, Box, Button } from '@ts-query/ui-react';

export default {
  title: 'Layout/Stack',
  component: Stack,
  argTypes: {
    direction: {
      control: { type: 'radio' },
      options: ['row', 'column'],
    },
    gap: { control: { type: 'number' } },
  },
};

export const Vertical = {
  args: {
    direction: 'column' as const,
    gap: 3,
  },
  render: (args: any) => (
    <Stack {...args}>
      <Box p={2} bg="#edf2f7">
        Item 1
      </Box>
      <Box p={2} bg="#e2e8f0">
        Item 2
      </Box>
      <Box p={2} bg="#cbd5e0">
        Item 3
      </Box>
    </Stack>
  ),
};

export const HorizontalButtons = {
  args: {
    direction: 'row' as const,
    gap: 2,
  },
  render: (args: any) => (
    <Stack {...args}>
      <Button>Primary</Button>
      <Button variant="outline">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
    </Stack>
  ),
};

