import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Box } from '../Box';

describe('Box', () => {
  describe('rendering', () => {
    it('renders a div by default', () => {
      render(<Box data-testid="box">Content</Box>);
      const element = screen.getByTestId('box');
      expect(element.tagName).toBe('DIV');
      expect(element).toHaveTextContent('Content');
    });

    it('renders custom element when "as" prop is provided', () => {
      render(
        <Box as="section" data-testid="box">
          Content
        </Box>,
      );
      const element = screen.getByTestId('box');
      expect(element.tagName).toBe('SECTION');
    });

    it('forwards HTML attributes', () => {
      render(
        <Box data-testid="box" id="custom-id" className="custom-class">
          Content
        </Box>,
      );
      const element = screen.getByTestId('box');
      expect(element).toHaveAttribute('id', 'custom-id');
      expect(element).toHaveClass('custom-class');
    });
  });

  describe('padding props (design tokens)', () => {
    it('applies p (padding) with 4px base unit', () => {
      render(
        <Box data-testid="box" p={4}>
          Content
        </Box>,
      );
      const element = screen.getByTestId('box');
      expect(element).toHaveStyle({ padding: '16px' });
    });

    it('applies px (horizontal padding) with 4px base unit', () => {
      render(
        <Box data-testid="box" px={2}>
          Content
        </Box>,
      );
      const element = screen.getByTestId('box');
      expect(element).toHaveStyle({
        paddingLeft: '8px',
        paddingRight: '8px',
      });
    });

    it('applies py (vertical padding) with 4px base unit', () => {
      render(
        <Box data-testid="box" py={3}>
          Content
        </Box>,
      );
      const element = screen.getByTestId('box');
      expect(element).toHaveStyle({
        paddingTop: '12px',
        paddingBottom: '12px',
      });
    });

    it('applies pt (padding-top)', () => {
      render(
        <Box data-testid="box" pt={1}>
          Content
        </Box>,
      );
      const element = screen.getByTestId('box');
      expect(element).toHaveStyle({ paddingTop: '4px' });
    });

    it('applies pr (padding-right)', () => {
      render(
        <Box data-testid="box" pr={5}>
          Content
        </Box>,
      );
      const element = screen.getByTestId('box');
      expect(element).toHaveStyle({ paddingRight: '20px' });
    });

    it('applies pb (padding-bottom)', () => {
      render(
        <Box data-testid="box" pb={2}>
          Content
        </Box>,
      );
      const element = screen.getByTestId('box');
      expect(element).toHaveStyle({ paddingBottom: '8px' });
    });

    it('applies pl (padding-left)', () => {
      render(
        <Box data-testid="box" pl={6}>
          Content
        </Box>,
      );
      const element = screen.getByTestId('box');
      expect(element).toHaveStyle({ paddingLeft: '24px' });
    });

    it('applies string padding values directly', () => {
      render(
        <Box data-testid="box" p="2rem">
          Content
        </Box>,
      );
      const element = screen.getByTestId('box');
      expect(element).toHaveStyle({ padding: '2rem' });
    });

    it('specific padding props override directional props', () => {
      render(
        <Box data-testid="box" px={2} pl={10}>
          Content
        </Box>,
      );
      const element = screen.getByTestId('box');
      // pl should override px for left padding
      expect(element).toHaveStyle({
        paddingLeft: '40px',
        paddingRight: '8px',
      });
    });
  });

  describe('margin props (design tokens)', () => {
    it('applies m (margin) with 4px base unit', () => {
      render(
        <Box data-testid="box" m={4}>
          Content
        </Box>,
      );
      const element = screen.getByTestId('box');
      expect(element).toHaveStyle({ margin: '16px' });
    });

    it('applies mx (horizontal margin)', () => {
      render(
        <Box data-testid="box" mx={2}>
          Content
        </Box>,
      );
      const element = screen.getByTestId('box');
      expect(element).toHaveStyle({
        marginLeft: '8px',
        marginRight: '8px',
      });
    });

    it('applies my (vertical margin)', () => {
      render(
        <Box data-testid="box" my={3}>
          Content
        </Box>,
      );
      const element = screen.getByTestId('box');
      expect(element).toHaveStyle({
        marginTop: '12px',
        marginBottom: '12px',
      });
    });

    it('applies mt (margin-top)', () => {
      render(
        <Box data-testid="box" mt={1}>
          Content
        </Box>,
      );
      const element = screen.getByTestId('box');
      expect(element).toHaveStyle({ marginTop: '4px' });
    });

    it('applies mr (margin-right)', () => {
      render(
        <Box data-testid="box" mr={5}>
          Content
        </Box>,
      );
      const element = screen.getByTestId('box');
      expect(element).toHaveStyle({ marginRight: '20px' });
    });

    it('applies mb (margin-bottom)', () => {
      render(
        <Box data-testid="box" mb={2}>
          Content
        </Box>,
      );
      const element = screen.getByTestId('box');
      expect(element).toHaveStyle({ marginBottom: '8px' });
    });

    it('applies ml (margin-left)', () => {
      render(
        <Box data-testid="box" ml={6}>
          Content
        </Box>,
      );
      const element = screen.getByTestId('box');
      expect(element).toHaveStyle({ marginLeft: '24px' });
    });

    it('applies string margin values directly', () => {
      render(
        <Box data-testid="box" m="auto">
          Content
        </Box>,
      );
      const element = screen.getByTestId('box');
      expect(element).toHaveStyle({ margin: 'auto' });
    });

    it('specific margin props override directional props', () => {
      render(
        <Box data-testid="box" mx={2} ml={8}>
          Content
        </Box>,
      );
      const element = screen.getByTestId('box');
      expect(element).toHaveStyle({
        marginLeft: '32px',
        marginRight: '8px',
      });
    });
  });

  describe('color props (design tokens)', () => {
    it('applies bg (background color)', () => {
      render(
        <Box data-testid="box" bg="#3182ce">
          Content
        </Box>,
      );
      const element = screen.getByTestId('box');
      expect(element).toHaveStyle({ backgroundColor: '#3182ce' });
    });

    it('applies color (text color)', () => {
      render(
        <Box data-testid="box" color="#ffffff">
          Content
        </Box>,
      );
      const element = screen.getByTestId('box');
      expect(element).toHaveStyle({ color: '#ffffff' });
    });

    it('applies both bg and color together', () => {
      render(
        <Box data-testid="box" bg="#4a5568" color="#ffffff">
          Content
        </Box>,
      );
      const element = screen.getByTestId('box');
      expect(element).toHaveStyle({
        backgroundColor: '#4a5568',
        color: '#ffffff',
      });
    });
  });

  describe('border radius prop (design tokens)', () => {
    it('applies numeric rounded value as pixels', () => {
      render(
        <Box data-testid="box" rounded={8}>
          Content
        </Box>,
      );
      const element = screen.getByTestId('box');
      expect(element).toHaveStyle({ borderRadius: '8px' });
    });

    it('applies string rounded value directly', () => {
      render(
        <Box data-testid="box" rounded="0.375rem">
          Content
        </Box>,
      );
      const element = screen.getByTestId('box');
      expect(element).toHaveStyle({ borderRadius: '0.375rem' });
    });

    it('applies 0 rounded value', () => {
      render(
        <Box data-testid="box" rounded={0}>
          Content
        </Box>,
      );
      const element = screen.getByTestId('box');
      expect(element).toHaveStyle({ borderRadius: '0px' });
    });
  });

  describe('style prop merging', () => {
    it('merges custom styles with prop-based styles', () => {
      render(
        <Box
          data-testid="box"
          p={4}
          bg="#3182ce"
          style={{ border: '1px solid black', display: 'flex' }}
        >
          Content
        </Box>,
      );
      const element = screen.getByTestId('box');
      expect(element).toHaveStyle({
        padding: '16px',
        backgroundColor: '#3182ce',
        border: '1px solid black',
        display: 'flex',
      });
    });

    it('prop-based styles override custom styles', () => {
      render(
        <Box data-testid="box" p={4} style={{ padding: '100px' }}>
          Content
        </Box>,
      );
      const element = screen.getByTestId('box');
      // Prop-based padding should override custom style padding
      expect(element).toHaveStyle({ padding: '16px' });
    });
  });

  describe('design token verification', () => {
    it('uses 4px base unit for space values', () => {
      const testCases = [
        { value: 1, expected: '4px' },
        { value: 2, expected: '8px' },
        { value: 3, expected: '12px' },
        { value: 4, expected: '16px' },
        { value: 5, expected: '20px' },
        { value: 6, expected: '24px' },
        { value: 8, expected: '32px' },
        { value: 10, expected: '40px' },
      ];

      testCases.forEach(({ value, expected }) => {
        const { unmount } = render(
          <Box data-testid="box" p={value}>
            Content
          </Box>,
        );
        const element = screen.getByTestId('box');
        expect(element).toHaveStyle({ padding: expected });
        unmount();
      });
    });
  });

  describe('composition', () => {
    it('can be nested within other Box components', () => {
      render(
        <Box data-testid="outer" p={4} bg="#e2e8f0">
          <Box data-testid="inner" p={2} bg="#ffffff">
            Nested content
          </Box>
        </Box>,
      );

      const outer = screen.getByTestId('outer');
      const inner = screen.getByTestId('inner');

      expect(outer).toHaveStyle({
        padding: '16px',
        backgroundColor: '#e2e8f0',
      });

      expect(inner).toHaveStyle({
        padding: '8px',
        backgroundColor: '#ffffff',
      });

      expect(outer).toContainElement(inner);
    });
  });
});
