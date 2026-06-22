import m from 'mithril';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Button } from '../Button';

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
          m(Button, { id: 'custom-id', class: 'custom-class', disabled: true }, 'Click me'),
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
            'Click me'
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
      m.mount(container, { view: () => m(Button, { variant: 'solid' }, 'Solid') });
      const element = container.firstChild as HTMLElement;

      expect(element.style.backgroundColor).toBe('rgb(49, 130, 206)'); // default blue
      expect(element.style.color).toBe('rgb(255, 255, 255)');
      expect(element.style.borderColor).toBe('transparent');
    });

    it('defaults to solid variant when no variant prop provided', () => {
      m.mount(container, { view: () => m(Button, 'Default') });
      const element = container.firstChild as HTMLElement;

      expect(element.style.backgroundColor).toBe('rgb(49, 130, 206)');
      expect(element.style.color).toBe('rgb(255, 255, 255)');
    });

    it('applies outline variant with border color', () => {
      m.mount(container, { view: () => m(Button, { variant: 'outline' }, 'Outline') });
      const element = container.firstChild as HTMLElement;

      expect(element.style.borderColor).toBe('rgb(49, 130, 206)'); // default blue
      expect(element.style.color).toBe('rgb(49, 130, 206)');
      expect(element.style.backgroundColor).toBe('transparent');
    });

    it('applies ghost variant with no border or background', () => {
      m.mount(container, { view: () => m(Button, { variant: 'ghost' }, 'Ghost') });
      const element = container.firstChild as HTMLElement;

      expect(element.style.color).toBe('rgb(49, 130, 206)'); // default blue
      expect(element.style.backgroundColor).toBe('transparent');
      expect(element.style.borderColor).toBe('transparent');
    });
  });

  describe('colorScheme prop (design tokens)', () => {
    describe('solid variant', () => {
      it('applies blue color scheme (default)', () => {
        m.mount(container, {
          view: () => m(Button, { variant: 'solid', colorScheme: 'blue' }, 'Blue'),
        });
        const element = container.firstChild as HTMLElement;

        expect(element.style.backgroundColor).toBe('rgb(49, 130, 206)');
        expect(element.style.color).toBe('rgb(255, 255, 255)');
      });

      it('defaults to blue color scheme when no colorScheme provided', () => {
        m.mount(container, { view: () => m(Button, { variant: 'solid' }, 'Default') });
        const element = container.firstChild as HTMLElement;

        expect(element.style.backgroundColor).toBe('rgb(49, 130, 206)');
        expect(element.style.color).toBe('rgb(255, 255, 255)');
      });

      it('applies gray color scheme', () => {
        m.mount(container, {
          view: () => m(Button, { variant: 'solid', colorScheme: 'gray' }, 'Gray'),
        });
        const element = container.firstChild as HTMLElement;

        expect(element.style.backgroundColor).toBe('rgb(74, 85, 104)');
        expect(element.style.color).toBe('rgb(255, 255, 255)');
      });

      it('applies red color scheme', () => {
        m.mount(container, {
          view: () => m(Button, { variant: 'solid', colorScheme: 'red' }, 'Red'),
        });
        const element = container.firstChild as HTMLElement;

        expect(element.style.backgroundColor).toBe('rgb(229, 62, 62)');
        expect(element.style.color).toBe('rgb(255, 255, 255)');
      });

      it('applies green color scheme', () => {
        m.mount(container, {
          view: () => m(Button, { variant: 'solid', colorScheme: 'green' }, 'Green'),
        });
        const element = container.firstChild as HTMLElement;

        expect(element.style.backgroundColor).toBe('rgb(56, 161, 105)');
        expect(element.style.color).toBe('rgb(255, 255, 255)');
      });
    });

    describe('outline variant', () => {
      it('applies blue color scheme', () => {
        m.mount(container, {
          view: () => m(Button, { variant: 'outline', colorScheme: 'blue' }, 'Blue'),
        });
        const element = container.firstChild as HTMLElement;

        expect(element.style.borderColor).toBe('rgb(49, 130, 206)');
        expect(element.style.color).toBe('rgb(49, 130, 206)');
        expect(element.style.backgroundColor).toBe('transparent');
      });

      it('applies gray color scheme', () => {
        m.mount(container, {
          view: () => m(Button, { variant: 'outline', colorScheme: 'gray' }, 'Gray'),
        });
        const element = container.firstChild as HTMLElement;

        expect(element.style.borderColor).toBe('rgb(74, 85, 104)');
        expect(element.style.color).toBe('rgb(74, 85, 104)');
        expect(element.style.backgroundColor).toBe('transparent');
      });

      it('applies red color scheme', () => {
        m.mount(container, {
          view: () => m(Button, { variant: 'outline', colorScheme: 'red' }, 'Red'),
        });
        const element = container.firstChild as HTMLElement;

        expect(element.style.borderColor).toBe('rgb(229, 62, 62)');
        expect(element.style.color).toBe('rgb(229, 62, 62)');
        expect(element.style.backgroundColor).toBe('transparent');
      });

      it('applies green color scheme', () => {
        m.mount(container, {
          view: () => m(Button, { variant: 'outline', colorScheme: 'green' }, 'Green'),
        });
        const element = container.firstChild as HTMLElement;

        expect(element.style.borderColor).toBe('rgb(56, 161, 105)');
        expect(element.style.color).toBe('rgb(56, 161, 105)');
        expect(element.style.backgroundColor).toBe('transparent');
      });
    });

    describe('ghost variant', () => {
      it('applies blue color scheme', () => {
        m.mount(container, {
          view: () => m(Button, { variant: 'ghost', colorScheme: 'blue' }, 'Blue'),
        });
        const element = container.firstChild as HTMLElement;

        expect(element.style.color).toBe('rgb(49, 130, 206)');
        expect(element.style.backgroundColor).toBe('transparent');
      });

      it('applies gray color scheme', () => {
        m.mount(container, {
          view: () => m(Button, { variant: 'ghost', colorScheme: 'gray' }, 'Gray'),
        });
        const element = container.firstChild as HTMLElement;

        expect(element.style.color).toBe('rgb(74, 85, 104)');
        expect(element.style.backgroundColor).toBe('transparent');
      });

      it('applies red color scheme', () => {
        m.mount(container, {
          view: () => m(Button, { variant: 'ghost', colorScheme: 'red' }, 'Red'),
        });
        const element = container.firstChild as HTMLElement;

        expect(element.style.color).toBe('rgb(229, 62, 62)');
        expect(element.style.backgroundColor).toBe('transparent');
      });

      it('applies green color scheme', () => {
        m.mount(container, {
          view: () => m(Button, { variant: 'ghost', colorScheme: 'green' }, 'Green'),
        });
        const element = container.firstChild as HTMLElement;

        expect(element.style.color).toBe('rgb(56, 161, 105)');
        expect(element.style.backgroundColor).toBe('transparent');
      });
    });
  });

  describe('combined props (design token combinations)', () => {
    it('combines size and variant props', () => {
      m.mount(container, {
        view: () => m(Button, { size: 'lg', variant: 'outline' }, 'Large Outline'),
      });
      const element = container.firstChild as HTMLElement;

      expect(element.style.fontSize).toBe('1.125rem');
      expect(element.style.padding).toBe('10px 20px');
      expect(element.style.borderColor).toBe('rgb(49, 130, 206)');
      expect(element.style.backgroundColor).toBe('transparent');
    });

    it('combines size, variant, and colorScheme props', () => {
      m.mount(container, {
        view: () =>
          m(Button, { size: 'sm', variant: 'solid', colorScheme: 'red' }, 'Small Red Solid'),
      });
      const element = container.firstChild as HTMLElement;

      expect(element.style.fontSize).toBe('0.875rem');
      expect(element.style.padding).toBe('6px 12px');
      expect(element.style.backgroundColor).toBe('rgb(229, 62, 62)');
      expect(element.style.color).toBe('rgb(255, 255, 255)');
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
            'Custom'
          ),
      });
      const element = container.firstChild as HTMLElement;

      expect(element.style.backgroundColor).toBe('rgb(49, 130, 206)');
      expect(element.style.color).toBe('rgb(255, 255, 255)');
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
            'Custom Color'
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
      const variants: Array<'solid' | 'outline' | 'ghost'> = ['solid', 'outline', 'ghost'];

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
