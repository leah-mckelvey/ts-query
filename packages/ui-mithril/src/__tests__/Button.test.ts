import m from 'mithril';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Button, type ButtonAttrs } from '../Button';

// Test helpers implementing Embedded Design principle
type StyleAssertions = Record<string, string>;

const testButtonStyles = (
  container: HTMLElement,
  props: ButtonAttrs,
  children: string,
  expectedStyles: StyleAssertions,
) => {
  m.mount(container, { view: () => m(Button, props, children) });
  const element = container.firstChild as HTMLElement;

  Object.entries(expectedStyles).forEach(([property, expected]) => {
    expect(element.style[property as any]).toBe(expected);
  });
};

// Design concept: variant-color mapping
// Each variant applies colors to different CSS properties
type VariantColorProperties = {
  variant: ButtonAttrs['variant'];
  colorProperties: string[]; // CSS properties that receive the theme color
  baseProperties?: StyleAssertions; // Always-true properties
};

const VARIANT_COLOR_MAPPINGS: VariantColorProperties[] = [
  {
    variant: 'solid',
    colorProperties: ['backgroundColor'],
    baseProperties: { color: '#ffffff', borderColor: 'transparent' },
  },
  {
    variant: 'outline',
    colorProperties: ['borderColor', 'color'],
    baseProperties: { backgroundColor: 'transparent' },
  },
  {
    variant: 'ghost',
    colorProperties: ['color'],
    baseProperties: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
    },
  },
];

const COLOR_SCHEMES = {
  blue: '#3182ce',
  gray: '#4a5568',
  red: '#e53e3e',
  green: '#38a169',
} as const;

describe('Button', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    m.mount(container, null);
    document.body.removeChild(container);
  });

  describe('rendering', () => {
    it('renders a button element', () => {
      m.mount(container, { view: () => m(Button, 'Click me') });
      const element = container.firstChild as HTMLButtonElement;
      expect(element.tagName).toBe('BUTTON');
      expect(element.textContent).toBe('Click me');
    });

    it('forwards HTML button attributes', () => {
      m.mount(container, {
        view: () =>
          m(
            Button,
            { id: 'custom-id', class: 'custom-class', disabled: true },
            'Click me',
          ),
      });
      const element = container.firstChild as HTMLButtonElement;
      expect(element.getAttribute('id')).toBe('custom-id');
      expect(element.classList.contains('custom-class')).toBe(true);
      expect(element.disabled).toBe(true);
    });

    it('supports onclick handler', () => {
      let clicked = false;
      m.mount(container, {
        view: () =>
          m(
            Button,
            {
              onclick: () => {
                clicked = true;
              },
            },
            'Click me',
          ),
      });
      const element = container.firstChild as HTMLButtonElement;
      element.click();
      expect(clicked).toBe(true);
    });
  });

  describe('base styles (design tokens)', () => {
    it('applies base button styles', () => {
      m.mount(container, { view: () => m(Button, 'Click me') });
      const element = container.firstChild as HTMLElement;

      expect(element.style.display).toBe('inline-flex');
      expect(element.style.alignItems).toBe('center');
      expect(element.style.justifyContent).toBe('center');
      expect(element.style.fontWeight).toBe('600');
      expect(element.style.borderRadius).toBe('0.375rem');
      expect(element.style.cursor).toBe('pointer');
      expect(element.style.borderStyle).toBe('solid');
    });
  });

  describe('size prop (design tokens)', () => {
    it('applies sm size with correct fontSize and padding', () => {
      m.mount(container, { view: () => m(Button, { size: 'sm' }, 'Small') });
      const element = container.firstChild as HTMLElement;

      expect(element.style.fontSize).toBe('0.875rem');
      expect(element.style.padding).toBe('6px 12px'); // py: 1.5 * 4 = 6px, px: 3 * 4 = 12px
    });

    it('applies md size (default) with correct fontSize and padding', () => {
      m.mount(container, { view: () => m(Button, { size: 'md' }, 'Medium') });
      const element = container.firstChild as HTMLElement;

      expect(element.style.fontSize).toBe('1rem');
      expect(element.style.padding).toBe('8px 16px'); // py: 2 * 4 = 8px, px: 4 * 4 = 16px
    });

    it('defaults to md size when no size prop provided', () => {
      m.mount(container, { view: () => m(Button, 'Default') });
      const element = container.firstChild as HTMLElement;

      expect(element.style.fontSize).toBe('1rem');
      expect(element.style.padding).toBe('8px 16px');
    });

    it('applies lg size with correct fontSize and padding', () => {
      m.mount(container, { view: () => m(Button, { size: 'lg' }, 'Large') });
      const element = container.firstChild as HTMLElement;

      expect(element.style.fontSize).toBe('1.125rem');
      expect(element.style.padding).toBe('10px 20px'); // py: 2.5 * 4 = 10px, px: 5 * 4 = 20px
    });
  });

  describe('variant prop (design tokens)', () => {
    it('applies solid variant (default) with background color', () => {
      m.mount(container, {
        view: () => m(Button, { variant: 'solid' }, 'Solid'),
      });
      const element = container.firstChild as HTMLElement;

      expect(element.style.backgroundColor).toBe('#3182ce'); // default blue
      expect(element.style.color).toBe('#ffffff');
      expect(element.style.borderColor).toBe('transparent');
    });

    it('defaults to solid variant when no variant prop provided', () => {
      m.mount(container, { view: () => m(Button, 'Default') });
      const element = container.firstChild as HTMLElement;

      expect(element.style.backgroundColor).toBe('#3182ce');
      expect(element.style.color).toBe('#ffffff');
    });

    it('applies outline variant with border color', () => {
      m.mount(container, {
        view: () => m(Button, { variant: 'outline' }, 'Outline'),
      });
      const element = container.firstChild as HTMLElement;

      expect(element.style.borderColor).toBe('#3182ce'); // default blue
      expect(element.style.color).toBe('#3182ce');
      expect(element.style.backgroundColor).toBe('transparent');
    });

    it('applies ghost variant with no border or background', () => {
      m.mount(container, {
        view: () => m(Button, { variant: 'ghost' }, 'Ghost'),
      });
      const element = container.firstChild as HTMLElement;

      expect(element.style.color).toBe('#3182ce'); // default blue
      expect(element.style.backgroundColor).toBe('transparent');
      expect(element.style.borderColor).toBe('transparent');
    });
  });

  describe('colorScheme prop (design tokens)', () => {
    // Refactored using Embedded Design principle:
    // The test structure now makes explicit the Cartesian product: variants × colorSchemes
    // Each variant has specific CSS properties that receive the color
    VARIANT_COLOR_MAPPINGS.forEach(
      ({ variant, colorProperties, baseProperties }) => {
        describe(`${variant} variant`, () => {
          Object.entries(COLOR_SCHEMES).forEach(([schemeName, schemeColor]) => {
            it(`applies ${schemeName} color scheme`, () => {
              const expectedStyles: StyleAssertions = {
                ...baseProperties,
                ...Object.fromEntries(
                  colorProperties.map((prop) => [prop, schemeColor]),
                ),
              };

              testButtonStyles(
                container,
                {
                  variant,
                  colorScheme: schemeName as keyof typeof COLOR_SCHEMES,
                },
                schemeName,
                expectedStyles,
              );
            });
          });

          // Test default colorScheme behavior (blue is default)
          if (variant === 'solid') {
            it('defaults to blue color scheme when no colorScheme provided', () => {
              const expectedStyles: StyleAssertions = {
                ...baseProperties,
                ...Object.fromEntries(
                  colorProperties.map((prop) => [prop, COLOR_SCHEMES.blue]),
                ),
              };

              testButtonStyles(
                container,
                { variant },
                'Default',
                expectedStyles,
              );
            });
          }
        });
      },
    );
  });

  describe('combined props (design token combinations)', () => {
    it('combines size and variant props', () => {
      m.mount(container, {
        view: () =>
          m(Button, { size: 'lg', variant: 'outline' }, 'Large Outline'),
      });
      const element = container.firstChild as HTMLElement;

      expect(element.style.fontSize).toBe('1.125rem');
      expect(element.style.padding).toBe('10px 20px');
      expect(element.style.borderColor).toBe('#3182ce');
      expect(element.style.backgroundColor).toBe('transparent');
    });

    it('combines size, variant, and colorScheme props', () => {
      m.mount(container, {
        view: () =>
          m(
            Button,
            { size: 'sm', variant: 'solid', colorScheme: 'red' },
            'Small Red Solid',
          ),
      });
      const element = container.firstChild as HTMLElement;

      expect(element.style.fontSize).toBe('0.875rem');
      expect(element.style.padding).toBe('6px 12px');
      expect(element.style.backgroundColor).toBe('#e53e3e');
      expect(element.style.color).toBe('#ffffff');
    });
  });

  describe('style prop merging', () => {
    it('merges custom styles with variant styles', () => {
      m.mount(container, {
        view: () =>
          m(
            Button,
            {
              variant: 'solid',
              style: { border: '2px dashed red', textTransform: 'uppercase' },
            },
            'Custom',
          ),
      });
      const element = container.firstChild as HTMLElement;

      expect(element.style.backgroundColor).toBe('#3182ce');
      expect(element.style.color).toBe('#ffffff');
      expect(element.style.border).toBe('2px dashed red');
      expect(element.style.textTransform).toBe('uppercase');
    });

    it('custom styles override variant styles', () => {
      m.mount(container, {
        view: () =>
          m(
            Button,
            {
              variant: 'solid',
              colorScheme: 'blue',
              style: { backgroundColor: 'purple' },
            },
            'Custom Color',
          ),
      });
      const element = container.firstChild as HTMLElement;

      expect(element.style.backgroundColor).toBe('purple');
    });
  });

  describe('design token consistency', () => {
    it('uses 4px base unit for padding across all sizes', () => {
      const sizes: Array<{ size: 'sm' | 'md' | 'lg'; expected: string }> = [
        { size: 'sm', expected: '6px 12px' }, // 1.5*4 3*4
        { size: 'md', expected: '8px 16px' }, // 2*4 4*4
        { size: 'lg', expected: '10px 20px' }, // 2.5*4 5*4
      ];

      sizes.forEach(({ size, expected }) => {
        m.mount(container, { view: () => m(Button, { size }, 'Test') });
        const element = container.firstChild as HTMLElement;
        expect(element.style.padding).toBe(expected);
        m.mount(container, null);
      });
    });

    it('applies consistent border radius across all variants', () => {
      const variants: Array<'solid' | 'outline' | 'ghost'> = [
        'solid',
        'outline',
        'ghost',
      ];

      variants.forEach((variant) => {
        m.mount(container, { view: () => m(Button, { variant }, 'Test') });
        const element = container.firstChild as HTMLElement;
        expect(element.style.borderRadius).toBe('0.375rem');
        m.mount(container, null);
      });
    });
  });

  describe('accessibility', () => {
    it('supports aria-label attribute', () => {
      m.mount(container, {
        view: () => m(Button, { 'aria-label': 'Close dialog' }, 'X'),
      });
      const element = container.firstChild as HTMLElement;
      expect(element.getAttribute('aria-label')).toBe('Close dialog');
    });

    it('supports type attribute', () => {
      m.mount(container, {
        view: () => m(Button, { type: 'submit' }, 'Submit'),
      });
      const element = container.firstChild as HTMLButtonElement;
      expect(element.getAttribute('type')).toBe('submit');
    });

    it('has cursor pointer for better UX', () => {
      m.mount(container, { view: () => m(Button, 'Clickable') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.cursor).toBe('pointer');
    });
  });
});
