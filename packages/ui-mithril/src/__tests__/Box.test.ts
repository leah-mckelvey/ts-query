import m from 'mithril';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Box } from '../Box';

describe('Box', () => {
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
    it('renders a div by default', () => {
      m.mount(container, { view: () => m(Box, 'Content') });
      const element = container.firstChild as HTMLElement;
      expect(element.tagName).toBe('DIV');
      expect(element.textContent).toBe('Content');
    });

    it('renders custom element when "as" prop is provided', () => {
      m.mount(container, { view: () => m(Box, { as: 'section' }, 'Content') });
      const element = container.firstChild as HTMLElement;
      expect(element.tagName).toBe('SECTION');
    });

    it('forwards HTML attributes', () => {
      m.mount(container, {
        view: () =>
          m(Box, { id: 'custom-id', class: 'custom-class' }, 'Content'),
      });
      const element = container.firstChild as HTMLElement;
      expect(element.getAttribute('id')).toBe('custom-id');
      expect(element.classList.contains('custom-class')).toBe(true);
    });
  });

  describe('padding props (design tokens)', () => {
    it('applies p (padding) with 4px base unit', () => {
      m.mount(container, { view: () => m(Box, { p: 4 }, 'Content') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.padding).toBe('16px');
    });

    it('applies px (horizontal padding) with 4px base unit', () => {
      m.mount(container, { view: () => m(Box, { px: 2 }, 'Content') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.paddingLeft).toBe('8px');
      expect(element.style.paddingRight).toBe('8px');
    });

    it('applies py (vertical padding) with 4px base unit', () => {
      m.mount(container, { view: () => m(Box, { py: 3 }, 'Content') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.paddingTop).toBe('12px');
      expect(element.style.paddingBottom).toBe('12px');
    });

    it('applies pt (padding-top)', () => {
      m.mount(container, { view: () => m(Box, { pt: 1 }, 'Content') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.paddingTop).toBe('4px');
    });

    it('applies pr (padding-right)', () => {
      m.mount(container, { view: () => m(Box, { pr: 5 }, 'Content') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.paddingRight).toBe('20px');
    });

    it('applies pb (padding-bottom)', () => {
      m.mount(container, { view: () => m(Box, { pb: 2 }, 'Content') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.paddingBottom).toBe('8px');
    });

    it('applies pl (padding-left)', () => {
      m.mount(container, { view: () => m(Box, { pl: 6 }, 'Content') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.paddingLeft).toBe('24px');
    });

    it('applies string padding values directly', () => {
      m.mount(container, { view: () => m(Box, { p: '2rem' }, 'Content') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.padding).toBe('2rem');
    });

    it('specific padding props override directional props', () => {
      m.mount(container, { view: () => m(Box, { px: 2, pl: 10 }, 'Content') });
      const element = container.firstChild as HTMLElement;
      // pl should override px for left padding
      expect(element.style.paddingLeft).toBe('40px');
      expect(element.style.paddingRight).toBe('8px');
    });
  });

  describe('margin props (design tokens)', () => {
    it('applies m (margin) with 4px base unit', () => {
      m.mount(container, { view: () => m(Box, { m: 4 }, 'Content') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.margin).toBe('16px');
    });

    it('applies mx (horizontal margin)', () => {
      m.mount(container, { view: () => m(Box, { mx: 2 }, 'Content') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.marginLeft).toBe('8px');
      expect(element.style.marginRight).toBe('8px');
    });

    it('applies my (vertical margin)', () => {
      m.mount(container, { view: () => m(Box, { my: 3 }, 'Content') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.marginTop).toBe('12px');
      expect(element.style.marginBottom).toBe('12px');
    });

    it('applies mt (margin-top)', () => {
      m.mount(container, { view: () => m(Box, { mt: 1 }, 'Content') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.marginTop).toBe('4px');
    });

    it('applies mr (margin-right)', () => {
      m.mount(container, { view: () => m(Box, { mr: 5 }, 'Content') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.marginRight).toBe('20px');
    });

    it('applies mb (margin-bottom)', () => {
      m.mount(container, { view: () => m(Box, { mb: 2 }, 'Content') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.marginBottom).toBe('8px');
    });

    it('applies ml (margin-left)', () => {
      m.mount(container, { view: () => m(Box, { ml: 6 }, 'Content') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.marginLeft).toBe('24px');
    });

    it('applies string margin values directly', () => {
      m.mount(container, { view: () => m(Box, { m: 'auto' }, 'Content') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.margin).toBe('auto');
    });

    it('specific margin props override directional props', () => {
      m.mount(container, { view: () => m(Box, { mx: 2, ml: 8 }, 'Content') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.marginLeft).toBe('32px');
      expect(element.style.marginRight).toBe('8px');
    });
  });

  describe('color props (design tokens)', () => {
    it('applies bg (background color)', () => {
      m.mount(container, { view: () => m(Box, { bg: '#3182ce' }, 'Content') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.backgroundColor).toBe('#3182ce');
    });

    it('applies color (text color)', () => {
      m.mount(container, {
        view: () => m(Box, { color: '#ffffff' }, 'Content'),
      });
      const element = container.firstChild as HTMLElement;
      expect(element.style.color).toBe('#ffffff');
    });

    it('applies both bg and color together', () => {
      m.mount(container, {
        view: () => m(Box, { bg: '#4a5568', color: '#ffffff' }, 'Content'),
      });
      const element = container.firstChild as HTMLElement;
      expect(element.style.backgroundColor).toBe('#4a5568');
      expect(element.style.color).toBe('#ffffff');
    });
  });

  describe('border radius prop (design tokens)', () => {
    it('applies numeric rounded value as pixels', () => {
      m.mount(container, { view: () => m(Box, { rounded: 8 }, 'Content') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.borderRadius).toBe('8px');
    });

    it('applies string rounded value directly', () => {
      m.mount(container, {
        view: () => m(Box, { rounded: '0.375rem' }, 'Content'),
      });
      const element = container.firstChild as HTMLElement;
      expect(element.style.borderRadius).toBe('0.375rem');
    });

    it('applies 0 rounded value', () => {
      m.mount(container, { view: () => m(Box, { rounded: 0 }, 'Content') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.borderRadius).toBe('0px');
    });
  });

  describe('style prop merging', () => {
    it('merges custom styles with prop-based styles', () => {
      m.mount(container, {
        view: () =>
          m(
            Box,
            {
              p: 4,
              bg: '#3182ce',
              style: { border: '1px solid black', display: 'flex' },
            },
            'Content',
          ),
      });
      const element = container.firstChild as HTMLElement;
      expect(element.style.padding).toBe('16px');
      expect(element.style.backgroundColor).toBe('#3182ce');
      expect(element.style.border).toBe('1px solid black');
      expect(element.style.display).toBe('flex');
    });

    it('prop-based styles override custom styles', () => {
      m.mount(container, {
        view: () =>
          m(
            Box,
            {
              p: 4,
              style: { padding: '100px' },
            },
            'Content',
          ),
      });
      const element = container.firstChild as HTMLElement;
      // Prop-based padding should override custom style padding
      expect(element.style.padding).toBe('16px');
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
        m.mount(container, { view: () => m(Box, { p: value }, 'Content') });
        const element = container.firstChild as HTMLElement;
        expect(element.style.padding).toBe(expected);
        m.mount(container, null);
      });
    });
  });

  describe('composition', () => {
    it('can be nested within other Box components', () => {
      m.mount(container, {
        view: () =>
          m(Box, { p: 4, bg: '#e2e8f0', id: 'outer' }, [
            m(Box, { p: 2, bg: '#ffffff', id: 'inner' }, 'Nested content'),
          ]),
      });

      const outer = container.querySelector('#outer') as HTMLElement;
      const inner = container.querySelector('#inner') as HTMLElement;

      expect(outer.style.padding).toBe('16px');
      expect(outer.style.backgroundColor).toBe('#e2e8f0');

      expect(inner.style.padding).toBe('8px');
      expect(inner.style.backgroundColor).toBe('#ffffff');

      expect(outer.contains(inner)).toBe(true);
    });
  });
});
