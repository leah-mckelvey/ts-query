import m from 'mithril';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Stack } from '../Stack';

describe('Stack', () => {
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
    it('renders a div element', () => {
      m.mount(container, { view: () => m(Stack, 'Content') });
      const element = container.firstChild as HTMLElement;
      expect(element.tagName).toBe('DIV');
      expect(element.textContent).toBe('Content');
    });

    it('forwards HTML attributes', () => {
      m.mount(container, {
        view: () => m(Stack, { id: 'custom-id', class: 'custom-class' }, 'Content'),
      });
      const element = container.firstChild as HTMLElement;
      expect(element.getAttribute('id')).toBe('custom-id');
      expect(element.classList.contains('custom-class')).toBe(true);
    });

    it('renders children', () => {
      m.mount(container, {
        view: () =>
          m(Stack, [m('div', 'Child 1'), m('div', 'Child 2'), m('div', 'Child 3')]),
      });
      const element = container.firstChild as HTMLElement;
      expect(element.textContent).toContain('Child 1');
      expect(element.textContent).toContain('Child 2');
      expect(element.textContent).toContain('Child 3');
    });
  });

  describe('base styles (design tokens)', () => {
    it('applies display flex by default', () => {
      m.mount(container, { view: () => m(Stack, 'Content') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.display).toBe('flex');
    });
  });

  describe('direction prop (design tokens)', () => {
    it('defaults to column direction', () => {
      m.mount(container, { view: () => m(Stack, 'Content') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.flexDirection).toBe('column');
    });

    it('applies column direction', () => {
      m.mount(container, { view: () => m(Stack, { direction: 'column' }, 'Content') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.flexDirection).toBe('column');
    });

    it('applies row direction', () => {
      m.mount(container, { view: () => m(Stack, { direction: 'row' }, 'Content') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.flexDirection).toBe('row');
    });
  });

  describe('gap prop (design tokens)', () => {
    it('applies numeric gap with 4px base unit', () => {
      m.mount(container, { view: () => m(Stack, { gap: 4 }, 'Content') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.gap).toBe('16px');
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
        m.mount(container, { view: () => m(Stack, { gap: value }, 'Content') });
        const element = container.firstChild as HTMLElement;
        expect(element.style.gap).toBe(expected);
        m.mount(container, null);
      });
    });

    it('applies string gap values directly', () => {
      m.mount(container, { view: () => m(Stack, { gap: '2rem' }, 'Content') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.gap).toBe('2rem');
    });

    it('does not apply gap when not provided', () => {
      m.mount(container, { view: () => m(Stack, 'Content') });
      const element = container.firstChild as HTMLElement;
      // Gap should be undefined/not set
      expect(element.style.gap).toBe('');
    });

    it('applies gap of 0', () => {
      m.mount(container, { view: () => m(Stack, { gap: 0 }, 'Content') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.gap).toBe('0px');
    });
  });

  describe('align prop (design tokens)', () => {
    it('applies align-items: center', () => {
      m.mount(container, { view: () => m(Stack, { align: 'center' }, 'Content') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.alignItems).toBe('center');
    });

    it('applies align-items: flex-start', () => {
      m.mount(container, { view: () => m(Stack, { align: 'flex-start' }, 'Content') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.alignItems).toBe('flex-start');
    });

    it('applies align-items: flex-end', () => {
      m.mount(container, { view: () => m(Stack, { align: 'flex-end' }, 'Content') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.alignItems).toBe('flex-end');
    });

    it('applies align-items: stretch', () => {
      m.mount(container, { view: () => m(Stack, { align: 'stretch' }, 'Content') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.alignItems).toBe('stretch');
    });

    it('applies align-items: baseline', () => {
      m.mount(container, { view: () => m(Stack, { align: 'baseline' }, 'Content') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.alignItems).toBe('baseline');
    });
  });

  describe('justify prop (design tokens)', () => {
    it('applies justify-content: center', () => {
      m.mount(container, { view: () => m(Stack, { justify: 'center' }, 'Content') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.justifyContent).toBe('center');
    });

    it('applies justify-content: flex-start', () => {
      m.mount(container, { view: () => m(Stack, { justify: 'flex-start' }, 'Content') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.justifyContent).toBe('flex-start');
    });

    it('applies justify-content: flex-end', () => {
      m.mount(container, { view: () => m(Stack, { justify: 'flex-end' }, 'Content') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.justifyContent).toBe('flex-end');
    });

    it('applies justify-content: space-between', () => {
      m.mount(container, { view: () => m(Stack, { justify: 'space-between' }, 'Content') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.justifyContent).toBe('space-between');
    });

    it('applies justify-content: space-around', () => {
      m.mount(container, { view: () => m(Stack, { justify: 'space-around' }, 'Content') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.justifyContent).toBe('space-around');
    });

    it('applies justify-content: space-evenly', () => {
      m.mount(container, { view: () => m(Stack, { justify: 'space-evenly' }, 'Content') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.justifyContent).toBe('space-evenly');
    });
  });

  describe('combined props (design token combinations)', () => {
    it('combines direction and gap', () => {
      m.mount(container, { view: () => m(Stack, { direction: 'row', gap: 4 }, 'Content') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.flexDirection).toBe('row');
      expect(element.style.gap).toBe('16px');
    });

    it('combines direction, gap, align, and justify', () => {
      m.mount(container, {
        view: () =>
          m(
            Stack,
            { direction: 'row', gap: 2, align: 'center', justify: 'space-between' },
            'Content'
          ),
      });
      const element = container.firstChild as HTMLElement;
      expect(element.style.flexDirection).toBe('row');
      expect(element.style.gap).toBe('8px');
      expect(element.style.alignItems).toBe('center');
      expect(element.style.justifyContent).toBe('space-between');
    });

    it('column direction with center alignment', () => {
      m.mount(container, {
        view: () => m(Stack, { direction: 'column', gap: 3, align: 'center' }, 'Content'),
      });
      const element = container.firstChild as HTMLElement;
      expect(element.style.flexDirection).toBe('column');
      expect(element.style.gap).toBe('12px');
      expect(element.style.alignItems).toBe('center');
    });
  });

  describe('style prop merging', () => {
    it('merges custom styles with Stack props', () => {
      m.mount(container, {
        view: () =>
          m(
            Stack,
            {
              direction: 'row',
              gap: 4,
              style: { border: '1px solid black', padding: '10px' },
            },
            'Content'
          ),
      });
      const element = container.firstChild as HTMLElement;
      expect(element.style.flexDirection).toBe('row');
      expect(element.style.gap).toBe('16px');
      expect(element.style.border).toBe('1px solid black');
      expect(element.style.padding).toBe('10px');
    });

    it('custom styles override Stack props', () => {
      m.mount(container, {
        view: () =>
          m(Stack, { direction: 'row', style: { flexDirection: 'column-reverse' } }, 'Content'),
      });
      const element = container.firstChild as HTMLElement;
      // Custom style should override
      expect(element.style.flexDirection).toBe('column-reverse');
    });
  });

  describe('composition with Box', () => {
    it('renders using Box component internally', () => {
      m.mount(container, { view: () => m(Stack, 'Content') });
      const element = container.firstChild as HTMLElement;
      // Stack uses Box internally, so it should be a div
      expect(element.tagName).toBe('DIV');
    });

    it('can accept Box-like props through rest spread', () => {
      // Box props are not in Stack's interface, but they should be forwarded
      // This test verifies that extra props are passed through
      m.mount(container, {
        view: () => m(Stack, { 'data-custom': 'value' }, 'Content'),
      });
      const element = container.firstChild as HTMLElement;
      expect(element.getAttribute('data-custom')).toBe('value');
    });
  });

  describe('layout behavior', () => {
    it('lays out children in column by default', () => {
      m.mount(container, {
        view: () =>
          m(Stack, { gap: 2 }, [
            m('div', { id: 'child-1' }, 'Child 1'),
            m('div', { id: 'child-2' }, 'Child 2'),
          ]),
      });
      const stack = container.firstChild as HTMLElement;

      expect(stack.style.display).toBe('flex');
      expect(stack.style.flexDirection).toBe('column');
      expect(stack.style.gap).toBe('8px');
    });

    it('lays out children in row when direction is row', () => {
      m.mount(container, {
        view: () =>
          m(Stack, { direction: 'row', gap: 4 }, [
            m('div', { id: 'child-1' }, 'Child 1'),
            m('div', { id: 'child-2' }, 'Child 2'),
          ]),
      });
      const stack = container.firstChild as HTMLElement;

      expect(stack.style.display).toBe('flex');
      expect(stack.style.flexDirection).toBe('row');
      expect(stack.style.gap).toBe('16px');
    });
  });

  describe('nested stacks', () => {
    it('can be nested within other Stack components', () => {
      m.mount(container, {
        view: () =>
          m(Stack, { direction: 'column', gap: 4, id: 'outer' }, [
            m(Stack, { direction: 'row', gap: 2, id: 'inner' }, [
              m('div', 'Nested 1'),
              m('div', 'Nested 2'),
            ]),
          ]),
      });

      const outer = container.querySelector('#outer') as HTMLElement;
      const inner = container.querySelector('#inner') as HTMLElement;

      expect(outer.style.flexDirection).toBe('column');
      expect(outer.style.gap).toBe('16px');

      expect(inner.style.flexDirection).toBe('row');
      expect(inner.style.gap).toBe('8px');

      expect(outer.contains(inner)).toBe(true);
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
        m.mount(container, { view: () => m(Stack, { gap: value }, 'Content') });
        const element = container.firstChild as HTMLElement;
        expect(element.style.gap).toBe(expected);
        m.mount(container, null);
      });
    });
  });
});
