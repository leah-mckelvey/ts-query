import m from 'mithril';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Text, Heading } from '../Text';

describe('Text', () => {
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
    it('renders a p element by default', () => {
      m.mount(container, { view: () => m(Text, 'Text content') });
      const element = container.firstChild as HTMLElement;
      expect(element.tagName).toBe('P');
      expect(element.textContent).toBe('Text content');
    });

    it('renders custom element when "as" prop is provided', () => {
      m.mount(container, { view: () => m(Text, { as: 'span' }, 'Text content') });
      const element = container.firstChild as HTMLElement;
      expect(element.tagName).toBe('SPAN');
    });

    it('can render as a div', () => {
      m.mount(container, { view: () => m(Text, { as: 'div' }, 'Text content') });
      const element = container.firstChild as HTMLElement;
      expect(element.tagName).toBe('DIV');
    });

    it('forwards HTML attributes', () => {
      m.mount(container, {
        view: () => m(Text, { id: 'custom-id', class: 'custom-class' }, 'Text content'),
      });
      const element = container.firstChild as HTMLElement;
      expect(element.getAttribute('id')).toBe('custom-id');
      expect(element.classList.contains('custom-class')).toBe(true);
    });
  });

  describe('base styles (design tokens)', () => {
    it('applies margin: 0 by default', () => {
      m.mount(container, { view: () => m(Text, 'Text content') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.margin).toBe('0px');
    });
  });

  describe('fontSize prop (design tokens)', () => {
    it('applies custom fontSize', () => {
      m.mount(container, { view: () => m(Text, { fontSize: '1.5rem' }, 'Large text') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.fontSize).toBe('1.5rem');
    });

    it('applies fontSize in pixels', () => {
      m.mount(container, { view: () => m(Text, { fontSize: '18px' }, 'Text') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.fontSize).toBe('18px');
    });

    it('does not apply fontSize when not provided', () => {
      m.mount(container, { view: () => m(Text, 'Text') });
      const element = container.firstChild as HTMLElement;
      // fontSize should not be set in inline styles
      expect(element.style.fontSize).toBe('');
    });
  });

  describe('fontWeight prop (design tokens)', () => {
    it('applies numeric fontWeight', () => {
      m.mount(container, { view: () => m(Text, { fontWeight: 700 }, 'Bold text') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.fontWeight).toBe('700');
    });

    it('applies string fontWeight', () => {
      m.mount(container, { view: () => m(Text, { fontWeight: 'bold' }, 'Bold text') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.fontWeight).toBe('bold');
    });

    it('applies various fontWeight values', () => {
      const weights = [300, 400, 500, 600, 700, 800];

      weights.forEach((weight) => {
        m.mount(container, { view: () => m(Text, { fontWeight: weight }, 'Text') });
        const element = container.firstChild as HTMLElement;
        expect(element.style.fontWeight).toBe(String(weight));
        m.mount(container, null);
      });
    });

    it('does not apply fontWeight when not provided', () => {
      m.mount(container, { view: () => m(Text, 'Text') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.fontWeight).toBe('');
    });
  });

  describe('combined props (design token combinations)', () => {
    it('applies both fontSize and fontWeight', () => {
      m.mount(container, {
        view: () => m(Text, { fontSize: '1.5rem', fontWeight: 600 }, 'Styled text'),
      });
      const element = container.firstChild as HTMLElement;
      expect(element.style.fontSize).toBe('1.5rem');
      expect(element.style.fontWeight).toBe('600');
    });
  });

  describe('style prop merging', () => {
    it('merges custom styles with Text props', () => {
      m.mount(container, {
        view: () =>
          m(
            Text,
            { fontSize: '1.5rem', style: { color: 'red', textAlign: 'center' } },
            'Custom styled'
          ),
      });
      const element = container.firstChild as HTMLElement;
      expect(element.style.fontSize).toBe('1.5rem');
      expect(element.style.color).toBe('red');
      expect(element.style.textAlign).toBe('center');
    });

    it('custom styles override Text props', () => {
      m.mount(container, {
        view: () => m(Text, { fontSize: '1rem', style: { fontSize: '2rem' } }, 'Override'),
      });
      const element = container.firstChild as HTMLElement;
      expect(element.style.fontSize).toBe('2rem');
    });
  });
});

describe('Heading', () => {
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
    it('renders h2 element by default', () => {
      m.mount(container, { view: () => m(Heading, 'Heading content') });
      const element = container.firstChild as HTMLElement;
      expect(element.tagName).toBe('H2');
      expect(element.textContent).toBe('Heading content');
    });

    it('renders h1 when level is 1', () => {
      m.mount(container, { view: () => m(Heading, { level: 1 }, 'Heading 1') });
      const element = container.firstChild as HTMLElement;
      expect(element.tagName).toBe('H1');
    });

    it('renders h2 when level is 2', () => {
      m.mount(container, { view: () => m(Heading, { level: 2 }, 'Heading 2') });
      const element = container.firstChild as HTMLElement;
      expect(element.tagName).toBe('H2');
    });

    it('renders h3 when level is 3', () => {
      m.mount(container, { view: () => m(Heading, { level: 3 }, 'Heading 3') });
      const element = container.firstChild as HTMLElement;
      expect(element.tagName).toBe('H3');
    });

    it('renders h4 when level is 4', () => {
      m.mount(container, { view: () => m(Heading, { level: 4 }, 'Heading 4') });
      const element = container.firstChild as HTMLElement;
      expect(element.tagName).toBe('H4');
    });

    it('renders h5 when level is 5', () => {
      m.mount(container, { view: () => m(Heading, { level: 5 }, 'Heading 5') });
      const element = container.firstChild as HTMLElement;
      expect(element.tagName).toBe('H5');
    });

    it('renders h6 when level is 6', () => {
      m.mount(container, { view: () => m(Heading, { level: 6 }, 'Heading 6') });
      const element = container.firstChild as HTMLElement;
      expect(element.tagName).toBe('H6');
    });

    it('renders custom element when "as" prop is provided', () => {
      m.mount(container, { view: () => m(Heading, { as: 'div', level: 1 }, 'Div heading') });
      const element = container.firstChild as HTMLElement;
      expect(element.tagName).toBe('DIV');
    });

    it('forwards HTML attributes', () => {
      m.mount(container, {
        view: () =>
          m(Heading, { id: 'custom-id', class: 'custom-class', level: 1 }, 'Heading'),
      });
      const element = container.firstChild as HTMLElement;
      expect(element.getAttribute('id')).toBe('custom-id');
      expect(element.classList.contains('custom-class')).toBe(true);
    });
  });

  describe('base styles (design tokens)', () => {
    it('applies margin: 0 by default', () => {
      m.mount(container, { view: () => m(Heading, 'Heading') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.margin).toBe('0px');
    });

    it('applies fontWeight: 700 by default', () => {
      m.mount(container, { view: () => m(Heading, 'Heading') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.fontWeight).toBe('700');
    });
  });

  describe('level-based fontSize (design tokens)', () => {
    it('applies correct fontSize for level 1', () => {
      m.mount(container, { view: () => m(Heading, { level: 1 }, 'H1') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.fontSize).toBe('2.25rem');
    });

    it('applies correct fontSize for level 2', () => {
      m.mount(container, { view: () => m(Heading, { level: 2 }, 'H2') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.fontSize).toBe('1.875rem');
    });

    it('applies correct fontSize for level 3', () => {
      m.mount(container, { view: () => m(Heading, { level: 3 }, 'H3') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.fontSize).toBe('1.5rem');
    });

    it('applies correct fontSize for level 4', () => {
      m.mount(container, { view: () => m(Heading, { level: 4 }, 'H4') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.fontSize).toBe('1.25rem');
    });

    it('applies correct fontSize for level 5', () => {
      m.mount(container, { view: () => m(Heading, { level: 5 }, 'H5') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.fontSize).toBe('1.125rem');
    });

    it('applies correct fontSize for level 6', () => {
      m.mount(container, { view: () => m(Heading, { level: 6 }, 'H6') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.fontSize).toBe('1rem');
    });

    it('defaults to level 2 fontSize when no level provided', () => {
      m.mount(container, { view: () => m(Heading, 'Default') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.fontSize).toBe('1.875rem');
    });
  });

  describe('fontSize prop override (design tokens)', () => {
    it('custom fontSize overrides level-based fontSize', () => {
      m.mount(container, { view: () => m(Heading, { level: 1, fontSize: '3rem' }, 'Custom') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.fontSize).toBe('3rem');
    });

    it('applies custom fontSize with any level', () => {
      m.mount(container, { view: () => m(Heading, { level: 4, fontSize: '2rem' }, 'Custom') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.fontSize).toBe('2rem');
    });
  });

  describe('fontWeight prop (design tokens)', () => {
    it('applies custom fontWeight', () => {
      m.mount(container, { view: () => m(Heading, { fontWeight: 800 }, 'Extra bold') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.fontWeight).toBe('800');
    });

    it('applies numeric fontWeight values', () => {
      const weights = [400, 500, 600, 700, 800];

      weights.forEach((weight) => {
        m.mount(container, { view: () => m(Heading, { fontWeight: weight }, 'Heading') });
        const element = container.firstChild as HTMLElement;
        expect(element.style.fontWeight).toBe(String(weight));
        m.mount(container, null);
      });
    });

    it('applies string fontWeight', () => {
      m.mount(container, { view: () => m(Heading, { fontWeight: 'normal' }, 'Normal') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.fontWeight).toBe('normal');
    });
  });

  describe('combined props (design token combinations)', () => {
    it('combines level, custom fontSize, and fontWeight', () => {
      m.mount(container, {
        view: () =>
          m(Heading, { level: 1, fontSize: '4rem', fontWeight: 900 }, 'Custom heading'),
      });
      const element = container.firstChild as HTMLElement;
      expect(element.style.fontSize).toBe('4rem');
      expect(element.style.fontWeight).toBe('900');
    });

    it('combines level and fontWeight with default fontSize', () => {
      m.mount(container, { view: () => m(Heading, { level: 3, fontWeight: 600 }, 'Heading') });
      const element = container.firstChild as HTMLElement;
      expect(element.style.fontSize).toBe('1.5rem');
      expect(element.style.fontWeight).toBe('600');
    });
  });

  describe('style prop merging', () => {
    it('merges custom styles with Heading props', () => {
      m.mount(container, {
        view: () =>
          m(
            Heading,
            { level: 2, style: { color: 'blue', textAlign: 'center' } },
            'Styled heading'
          ),
      });
      const element = container.firstChild as HTMLElement;
      expect(element.style.fontSize).toBe('1.875rem');
      expect(element.style.fontWeight).toBe('700');
      expect(element.style.color).toBe('blue');
      expect(element.style.textAlign).toBe('center');
    });

    it('custom styles override Heading props', () => {
      m.mount(container, {
        view: () =>
          m(
            Heading,
            { level: 1, fontWeight: 700, style: { fontSize: '5rem', fontWeight: 400 } },
            'Override'
          ),
      });
      const element = container.firstChild as HTMLElement;
      expect(element.style.fontSize).toBe('5rem');
      expect(element.style.fontWeight).toBe('400');
    });
  });

  describe('semantic HTML', () => {
    it('uses correct semantic tags for document structure', () => {
      m.mount(container, {
        view: () =>
          m('div', [
            m(Heading, { level: 1 }, 'Main Title'),
            m(Heading, { level: 2 }, 'Section'),
            m(Heading, { level: 3 }, 'Subsection'),
          ]),
      });

      expect(container.querySelector('h1')?.textContent).toBe('Main Title');
      expect(container.querySelector('h2')?.textContent).toBe('Section');
      expect(container.querySelector('h3')?.textContent).toBe('Subsection');
    });
  });

  describe('design token consistency', () => {
    it('maintains consistent heading size hierarchy', () => {
      const levels = [
        { level: 1, fontSize: '2.25rem' },
        { level: 2, fontSize: '1.875rem' },
        { level: 3, fontSize: '1.5rem' },
        { level: 4, fontSize: '1.25rem' },
        { level: 5, fontSize: '1.125rem' },
        { level: 6, fontSize: '1rem' },
      ] as const;

      levels.forEach(({ level, fontSize }) => {
        m.mount(container, { view: () => m(Heading, { level }, `H${level}`) });
        const element = container.firstChild as HTMLElement;
        expect(element.style.fontSize).toBe(fontSize);
        m.mount(container, null);
      });
    });

    it('all headings use fontWeight 700 by default', () => {
      const levels = [1, 2, 3, 4, 5, 6] as const;

      levels.forEach((level) => {
        m.mount(container, { view: () => m(Heading, { level }, `H${level}`) });
        const element = container.firstChild as HTMLElement;
        expect(element.style.fontWeight).toBe('700');
        m.mount(container, null);
      });
    });
  });
});
