import React from 'react';
import { Box, Heading, Text } from '@ts-query/ui-react';

export default {
  title: 'Primitives/Typography',
};

export const Headings = () => (
  <Box p={4} bg="#f7fafc">
    <Heading level={1}>Heading 1</Heading>
    <Heading level={2}>Heading 2</Heading>
    <Heading level={3}>Heading 3</Heading>
    <Heading level={4}>Heading 4</Heading>
    <Heading level={5}>Heading 5</Heading>
    <Heading level={6}>Heading 6</Heading>
  </Box>
);

export const BodyText = () => (
  <Box p={4} bg="#f7fafc">
    <Text>
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio.
    </Text>
    <Text color="#4a5568">
      This is secondary text using the Text component with a custom color.
    </Text>
  </Box>
);
