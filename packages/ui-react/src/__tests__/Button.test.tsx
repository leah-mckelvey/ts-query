import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '../Button';

describe('Button', () => {
  describe('rendering', () => {
    it('renders a button element', () => {
      render(<Button data-testid="button">Click me</Button>);
      const element = screen.getByTestId('button');
      expect(element.tagName).toBe('BUTTON');
      expect(element).toHaveTextContent('Click me');
    });

    it('forwards HTML button attributes', () => {
      render(
        <Button
          data-testid="button"
          id="custom-id"
          className="custom-class"
          disabled
        >
          Click me
        </Button>
      );
      const element = screen.getByTestId('button');
      expect(element).toHaveAttribute('id', 'custom-id');
      expect(element).toHaveClass('custom-class');
      expect(element).toBeDisabled();
    });

    it('supports onClick handler', () => {
      let clicked = false;
      render(<Button data-testid="button" onClick={() => { clicked = true; }}>Click me</Button>);
      const element = screen.getByTestId('button');
      element.click();
      expect(clicked).toBe(true);
    });
  });

  describe('base styles (design tokens)', () => {
    it('applies base button styles', () => {
      render(<Button data-testid="button">Click me</Button>);
      const element = screen.getByTestId('button');

      expect(element).toHaveStyle({
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '600',
        borderRadius: '0.375rem',
        cursor: 'pointer',
        borderStyle: 'solid',
      });
    });
  });

  describe('size prop (design tokens)', () => {
    it('applies sm size with correct fontSize and padding', () => {
      render(<Button data-testid="button" size="sm">Small</Button>);
      const element = screen.getByTestId('button');

      expect(element).toHaveStyle({
        fontSize: '0.875rem',
        padding: '6px 12px', // py: 1.5 * 4 = 6px, px: 3 * 4 = 12px
      });
    });

    it('applies md size (default) with correct fontSize and padding', () => {
      render(<Button data-testid="button" size="md">Medium</Button>);
      const element = screen.getByTestId('button');

      expect(element).toHaveStyle({
        fontSize: '1rem',
        padding: '8px 16px', // py: 2 * 4 = 8px, px: 4 * 4 = 16px
      });
    });

    it('defaults to md size when no size prop provided', () => {
      render(<Button data-testid="button">Default</Button>);
      const element = screen.getByTestId('button');

      expect(element).toHaveStyle({
        fontSize: '1rem',
        padding: '8px 16px',
      });
    });

    it('applies lg size with correct fontSize and padding', () => {
      render(<Button data-testid="button" size="lg">Large</Button>);
      const element = screen.getByTestId('button');

      expect(element).toHaveStyle({
        fontSize: '1.125rem',
        padding: '10px 20px', // py: 2.5 * 4 = 10px, px: 5 * 4 = 20px
      });
    });
  });

  describe('variant prop (design tokens)', () => {
    it('applies solid variant (default) with background color', () => {
      render(<Button data-testid="button" variant="solid">Solid</Button>);
      const element = screen.getByTestId('button');

      expect(element).toHaveStyle({
        backgroundColor: '#3182ce', // default blue
        color: '#ffffff',
        borderColor: 'transparent',
      });
    });

    it('defaults to solid variant when no variant prop provided', () => {
      render(<Button data-testid="button">Default</Button>);
      const element = screen.getByTestId('button');

      expect(element).toHaveStyle({
        backgroundColor: '#3182ce',
        color: '#ffffff',
      });
    });

    it('applies outline variant with border color', () => {
      render(<Button data-testid="button" variant="outline">Outline</Button>);
      const element = screen.getByTestId('button');

      expect(element).toHaveStyle({
        borderColor: '#3182ce', // default blue
        color: '#3182ce',
        backgroundColor: 'transparent',
      });
    });

    it('applies ghost variant with no border or background', () => {
      render(<Button data-testid="button" variant="ghost">Ghost</Button>);
      const element = screen.getByTestId('button');

      expect(element).toHaveStyle({
        color: '#3182ce', // default blue
        backgroundColor: 'transparent',
        borderColor: 'transparent',
      });
    });
  });

  describe('colorScheme prop (design tokens)', () => {
    describe('solid variant', () => {
      it('applies blue color scheme (default)', () => {
        render(<Button data-testid="button" variant="solid" colorScheme="blue">Blue</Button>);
        const element = screen.getByTestId('button');

        expect(element).toHaveStyle({
          backgroundColor: '#3182ce',
          color: '#ffffff',
        });
      });

      it('defaults to blue color scheme when no colorScheme provided', () => {
        render(<Button data-testid="button" variant="solid">Default</Button>);
        const element = screen.getByTestId('button');

        expect(element).toHaveStyle({
          backgroundColor: '#3182ce',
          color: '#ffffff',
        });
      });

      it('applies gray color scheme', () => {
        render(<Button data-testid="button" variant="solid" colorScheme="gray">Gray</Button>);
        const element = screen.getByTestId('button');

        expect(element).toHaveStyle({
          backgroundColor: '#4a5568',
          color: '#ffffff',
        });
      });

      it('applies red color scheme', () => {
        render(<Button data-testid="button" variant="solid" colorScheme="red">Red</Button>);
        const element = screen.getByTestId('button');

        expect(element).toHaveStyle({
          backgroundColor: '#e53e3e',
          color: '#ffffff',
        });
      });

      it('applies green color scheme', () => {
        render(<Button data-testid="button" variant="solid" colorScheme="green">Green</Button>);
        const element = screen.getByTestId('button');

        expect(element).toHaveStyle({
          backgroundColor: '#38a169',
          color: '#ffffff',
        });
      });
    });

    describe('outline variant', () => {
      it('applies blue color scheme', () => {
        render(<Button data-testid="button" variant="outline" colorScheme="blue">Blue</Button>);
        const element = screen.getByTestId('button');

        expect(element).toHaveStyle({
          borderColor: '#3182ce',
          color: '#3182ce',
          backgroundColor: 'transparent',
        });
      });

      it('applies gray color scheme', () => {
        render(<Button data-testid="button" variant="outline" colorScheme="gray">Gray</Button>);
        const element = screen.getByTestId('button');

        expect(element).toHaveStyle({
          borderColor: '#4a5568',
          color: '#4a5568',
          backgroundColor: 'transparent',
        });
      });

      it('applies red color scheme', () => {
        render(<Button data-testid="button" variant="outline" colorScheme="red">Red</Button>);
        const element = screen.getByTestId('button');

        expect(element).toHaveStyle({
          borderColor: '#e53e3e',
          color: '#e53e3e',
          backgroundColor: 'transparent',
        });
      });

      it('applies green color scheme', () => {
        render(<Button data-testid="button" variant="outline" colorScheme="green">Green</Button>);
        const element = screen.getByTestId('button');

        expect(element).toHaveStyle({
          borderColor: '#38a169',
          color: '#38a169',
          backgroundColor: 'transparent',
        });
      });
    });

    describe('ghost variant', () => {
      it('applies blue color scheme', () => {
        render(<Button data-testid="button" variant="ghost" colorScheme="blue">Blue</Button>);
        const element = screen.getByTestId('button');

        expect(element).toHaveStyle({
          color: '#3182ce',
          backgroundColor: 'transparent',
        });
      });

      it('applies gray color scheme', () => {
        render(<Button data-testid="button" variant="ghost" colorScheme="gray">Gray</Button>);
        const element = screen.getByTestId('button');

        expect(element).toHaveStyle({
          color: '#4a5568',
          backgroundColor: 'transparent',
        });
      });

      it('applies red color scheme', () => {
        render(<Button data-testid="button" variant="ghost" colorScheme="red">Red</Button>);
        const element = screen.getByTestId('button');

        expect(element).toHaveStyle({
          color: '#e53e3e',
          backgroundColor: 'transparent',
        });
      });

      it('applies green color scheme', () => {
        render(<Button data-testid="button" variant="ghost" colorScheme="green">Green</Button>);
        const element = screen.getByTestId('button');

        expect(element).toHaveStyle({
          color: '#38a169',
          backgroundColor: 'transparent',
        });
      });
    });
  });

  describe('combined props (design token combinations)', () => {
    it('combines size and variant props', () => {
      render(
        <Button data-testid="button" size="lg" variant="outline">
          Large Outline
        </Button>
      );
      const element = screen.getByTestId('button');

      expect(element).toHaveStyle({
        fontSize: '1.125rem',
        padding: '10px 20px',
        borderColor: '#3182ce',
        backgroundColor: 'transparent',
      });
    });

    it('combines size, variant, and colorScheme props', () => {
      render(
        <Button data-testid="button" size="sm" variant="solid" colorScheme="red">
          Small Red Solid
        </Button>
      );
      const element = screen.getByTestId('button');

      expect(element).toHaveStyle({
        fontSize: '0.875rem',
        padding: '6px 12px',
        backgroundColor: '#e53e3e',
        color: '#ffffff',
      });
    });
  });

  describe('style prop merging', () => {
    it('merges custom styles with variant styles', () => {
      render(
        <Button
          data-testid="button"
          variant="solid"
          style={{ border: '2px dashed red', textTransform: 'uppercase' }}
        >
          Custom
        </Button>
      );
      const element = screen.getByTestId('button');

      expect(element).toHaveStyle({
        backgroundColor: '#3182ce',
        color: '#ffffff',
        border: '2px dashed red',
        textTransform: 'uppercase',
      });
    });

    it('custom styles override variant styles', () => {
      render(
        <Button
          data-testid="button"
          variant="solid"
          colorScheme="blue"
          style={{ backgroundColor: 'purple' }}
        >
          Custom Color
        </Button>
      );
      const element = screen.getByTestId('button');

      expect(element).toHaveStyle({
        backgroundColor: 'purple',
      });
    });
  });

  describe('design token consistency', () => {
    it('uses 4px base unit for padding across all sizes', () => {
      const sizes: Array<{ size: 'sm' | 'md' | 'lg'; expected: string }> = [
        { size: 'sm', expected: '6px 12px' },   // 1.5*4 3*4
        { size: 'md', expected: '8px 16px' },   // 2*4 4*4
        { size: 'lg', expected: '10px 20px' },  // 2.5*4 5*4
      ];

      sizes.forEach(({ size, expected }) => {
        const { unmount } = render(<Button data-testid="button" size={size}>Test</Button>);
        const element = screen.getByTestId('button');
        expect(element).toHaveStyle({ padding: expected });
        unmount();
      });
    });

    it('applies consistent border radius across all variants', () => {
      const variants: Array<'solid' | 'outline' | 'ghost'> = ['solid', 'outline', 'ghost'];

      variants.forEach((variant) => {
        const { unmount } = render(<Button data-testid="button" variant={variant}>Test</Button>);
        const element = screen.getByTestId('button');
        expect(element).toHaveStyle({ borderRadius: '0.375rem' });
        unmount();
      });
    });
  });

  describe('accessibility', () => {
    it('supports aria-label attribute', () => {
      render(<Button data-testid="button" aria-label="Close dialog">X</Button>);
      const element = screen.getByTestId('button');
      expect(element).toHaveAttribute('aria-label', 'Close dialog');
    });

    it('supports type attribute', () => {
      render(<Button data-testid="button" type="submit">Submit</Button>);
      const element = screen.getByTestId('button');
      expect(element).toHaveAttribute('type', 'submit');
    });

    it('has cursor pointer for better UX', () => {
      render(<Button data-testid="button">Clickable</Button>);
      const element = screen.getByTestId('button');
      expect(element).toHaveStyle({ cursor: 'pointer' });
    });
  });
});
