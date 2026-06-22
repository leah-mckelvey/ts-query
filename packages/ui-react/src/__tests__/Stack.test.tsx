import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Stack } from '../Stack';

describe('Stack', () => {
  describe('rendering', () => {
    it('renders a div element', () => {
      render(<Stack data-testid="stack">Content</Stack>);
      const element = screen.getByTestId('stack');
      expect(element.tagName).toBe('DIV');
      expect(element).toHaveTextContent('Content');
    });

    it('forwards HTML attributes', () => {
      render(
        <Stack data-testid="stack" id="custom-id" className="custom-class">
          Content
        </Stack>
      );
      const element = screen.getByTestId('stack');
      expect(element).toHaveAttribute('id', 'custom-id');
      expect(element).toHaveClass('custom-class');
    });

    it('renders children', () => {
      render(
        <Stack data-testid="stack">
          <div>Child 1</div>
          <div>Child 2</div>
          <div>Child 3</div>
        </Stack>
      );
      const element = screen.getByTestId('stack');
      expect(element).toHaveTextContent('Child 1');
      expect(element).toHaveTextContent('Child 2');
      expect(element).toHaveTextContent('Child 3');
    });
  });

  describe('base styles (design tokens)', () => {
    it('applies display flex by default', () => {
      render(<Stack data-testid="stack">Content</Stack>);
      const element = screen.getByTestId('stack');
      expect(element).toHaveStyle({ display: 'flex' });
    });
  });

  describe('direction prop (design tokens)', () => {
    it('defaults to column direction', () => {
      render(<Stack data-testid="stack">Content</Stack>);
      const element = screen.getByTestId('stack');
      expect(element).toHaveStyle({ flexDirection: 'column' });
    });

    it('applies column direction', () => {
      render(<Stack data-testid="stack" direction="column">Content</Stack>);
      const element = screen.getByTestId('stack');
      expect(element).toHaveStyle({ flexDirection: 'column' });
    });

    it('applies row direction', () => {
      render(<Stack data-testid="stack" direction="row">Content</Stack>);
      const element = screen.getByTestId('stack');
      expect(element).toHaveStyle({ flexDirection: 'row' });
    });
  });

  describe('gap prop (design tokens)', () => {
    it('applies numeric gap with 4px base unit', () => {
      render(<Stack data-testid="stack" gap={4}>Content</Stack>);
      const element = screen.getByTestId('stack');
      expect(element).toHaveStyle({ gap: '16px' });
    });

    it('applies various numeric gap values', () => {
      const testCases = [
        { value: 1, expected: '4px' },
        { value: 2, expected: '8px' },
        { value: 3, expected: '12px' },
        { value: 4, expected: '16px' },
        { value: 6, expected: '24px' },
        { value: 8, expected: '32px' },
      ];

      testCases.forEach(({ value, expected }) => {
        const { unmount } = render(<Stack data-testid="stack" gap={value}>Content</Stack>);
        const element = screen.getByTestId('stack');
        expect(element).toHaveStyle({ gap: expected });
        unmount();
      });
    });

    it('applies string gap values directly', () => {
      render(<Stack data-testid="stack" gap="2rem">Content</Stack>);
      const element = screen.getByTestId('stack');
      expect(element).toHaveStyle({ gap: '2rem' });
    });

    it('does not apply gap when not provided', () => {
      render(<Stack data-testid="stack">Content</Stack>);
      const element = screen.getByTestId('stack');
      // Gap should be undefined/not set
      expect(element.style.gap).toBe('');
    });

    it('applies gap of 0', () => {
      render(<Stack data-testid="stack" gap={0}>Content</Stack>);
      const element = screen.getByTestId('stack');
      expect(element).toHaveStyle({ gap: '0px' });
    });
  });

  describe('align prop (design tokens)', () => {
    it('applies align-items: center', () => {
      render(<Stack data-testid="stack" align="center">Content</Stack>);
      const element = screen.getByTestId('stack');
      expect(element).toHaveStyle({ alignItems: 'center' });
    });

    it('applies align-items: flex-start', () => {
      render(<Stack data-testid="stack" align="flex-start">Content</Stack>);
      const element = screen.getByTestId('stack');
      expect(element).toHaveStyle({ alignItems: 'flex-start' });
    });

    it('applies align-items: flex-end', () => {
      render(<Stack data-testid="stack" align="flex-end">Content</Stack>);
      const element = screen.getByTestId('stack');
      expect(element).toHaveStyle({ alignItems: 'flex-end' });
    });

    it('applies align-items: stretch', () => {
      render(<Stack data-testid="stack" align="stretch">Content</Stack>);
      const element = screen.getByTestId('stack');
      expect(element).toHaveStyle({ alignItems: 'stretch' });
    });

    it('applies align-items: baseline', () => {
      render(<Stack data-testid="stack" align="baseline">Content</Stack>);
      const element = screen.getByTestId('stack');
      expect(element).toHaveStyle({ alignItems: 'baseline' });
    });
  });

  describe('justify prop (design tokens)', () => {
    it('applies justify-content: center', () => {
      render(<Stack data-testid="stack" justify="center">Content</Stack>);
      const element = screen.getByTestId('stack');
      expect(element).toHaveStyle({ justifyContent: 'center' });
    });

    it('applies justify-content: flex-start', () => {
      render(<Stack data-testid="stack" justify="flex-start">Content</Stack>);
      const element = screen.getByTestId('stack');
      expect(element).toHaveStyle({ justifyContent: 'flex-start' });
    });

    it('applies justify-content: flex-end', () => {
      render(<Stack data-testid="stack" justify="flex-end">Content</Stack>);
      const element = screen.getByTestId('stack');
      expect(element).toHaveStyle({ justifyContent: 'flex-end' });
    });

    it('applies justify-content: space-between', () => {
      render(<Stack data-testid="stack" justify="space-between">Content</Stack>);
      const element = screen.getByTestId('stack');
      expect(element).toHaveStyle({ justifyContent: 'space-between' });
    });

    it('applies justify-content: space-around', () => {
      render(<Stack data-testid="stack" justify="space-around">Content</Stack>);
      const element = screen.getByTestId('stack');
      expect(element).toHaveStyle({ justifyContent: 'space-around' });
    });

    it('applies justify-content: space-evenly', () => {
      render(<Stack data-testid="stack" justify="space-evenly">Content</Stack>);
      const element = screen.getByTestId('stack');
      expect(element).toHaveStyle({ justifyContent: 'space-evenly' });
    });
  });

  describe('combined props (design token combinations)', () => {
    it('combines direction and gap', () => {
      render(
        <Stack data-testid="stack" direction="row" gap={4}>
          Content
        </Stack>
      );
      const element = screen.getByTestId('stack');
      expect(element).toHaveStyle({
        flexDirection: 'row',
        gap: '16px',
      });
    });

    it('combines direction, gap, align, and justify', () => {
      render(
        <Stack
          data-testid="stack"
          direction="row"
          gap={2}
          align="center"
          justify="space-between"
        >
          Content
        </Stack>
      );
      const element = screen.getByTestId('stack');
      expect(element).toHaveStyle({
        flexDirection: 'row',
        gap: '8px',
        alignItems: 'center',
        justifyContent: 'space-between',
      });
    });

    it('column direction with center alignment', () => {
      render(
        <Stack data-testid="stack" direction="column" gap={3} align="center">
          Content
        </Stack>
      );
      const element = screen.getByTestId('stack');
      expect(element).toHaveStyle({
        flexDirection: 'column',
        gap: '12px',
        alignItems: 'center',
      });
    });
  });

  describe('style prop merging', () => {
    it('merges custom styles with Stack props', () => {
      render(
        <Stack
          data-testid="stack"
          direction="row"
          gap={4}
          style={{ border: '1px solid black', padding: '10px' }}
        >
          Content
        </Stack>
      );
      const element = screen.getByTestId('stack');
      expect(element).toHaveStyle({
        flexDirection: 'row',
        gap: '16px',
        border: '1px solid black',
        padding: '10px',
      });
    });

    it('custom styles override Stack props', () => {
      render(
        <Stack
          data-testid="stack"
          direction="row"
          style={{ flexDirection: 'column-reverse' }}
        >
          Content
        </Stack>
      );
      const element = screen.getByTestId('stack');
      // Custom style should override
      expect(element).toHaveStyle({ flexDirection: 'column-reverse' });
    });
  });

  describe('composition with Box', () => {
    it('renders using Box component internally', () => {
      render(<Stack data-testid="stack">Content</Stack>);
      const element = screen.getByTestId('stack');
      // Stack uses Box internally, so it should be a div
      expect(element.tagName).toBe('DIV');
    });

    it('can accept Box-like props through rest spread', () => {
      // Box props are not in Stack's interface, but they should be forwarded
      // This test verifies that extra props are passed through
      render(
        <Stack data-testid="stack" data-custom="value">
          Content
        </Stack>
      );
      const element = screen.getByTestId('stack');
      expect(element).toHaveAttribute('data-custom', 'value');
    });
  });

  describe('layout behavior', () => {
    it('lays out children in column by default', () => {
      render(
        <Stack data-testid="stack" gap={2}>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </Stack>
      );
      const stack = screen.getByTestId('stack');

      expect(stack).toHaveStyle({
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      });
    });

    it('lays out children in row when direction is row', () => {
      render(
        <Stack data-testid="stack" direction="row" gap={4}>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </Stack>
      );
      const stack = screen.getByTestId('stack');

      expect(stack).toHaveStyle({
        display: 'flex',
        flexDirection: 'row',
        gap: '16px',
      });
    });
  });

  describe('nested stacks', () => {
    it('can be nested within other Stack components', () => {
      render(
        <Stack data-testid="outer" direction="column" gap={4}>
          <Stack data-testid="inner" direction="row" gap={2}>
            <div>Nested 1</div>
            <div>Nested 2</div>
          </Stack>
        </Stack>
      );

      const outer = screen.getByTestId('outer');
      const inner = screen.getByTestId('inner');

      expect(outer).toHaveStyle({
        flexDirection: 'column',
        gap: '16px',
      });

      expect(inner).toHaveStyle({
        flexDirection: 'row',
        gap: '8px',
      });

      expect(outer).toContainElement(inner);
    });
  });

  describe('design token consistency', () => {
    it('uses 4px base unit for gap values', () => {
      const testCases = [
        { value: 1, expected: '4px' },
        { value: 2, expected: '8px' },
        { value: 4, expected: '16px' },
        { value: 8, expected: '32px' },
      ];

      testCases.forEach(({ value, expected }) => {
        const { unmount } = render(<Stack data-testid="stack" gap={value}>Content</Stack>);
        const element = screen.getByTestId('stack');
        expect(element).toHaveStyle({ gap: expected });
        unmount();
      });
    });
  });
});
