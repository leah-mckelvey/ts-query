import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Text, Heading } from '../Text';

describe('Text', () => {
  describe('rendering', () => {
    it('renders a p element by default', () => {
      render(<Text data-testid="text">Text content</Text>);
      const element = screen.getByTestId('text');
      expect(element.tagName).toBe('P');
      expect(element).toHaveTextContent('Text content');
    });

    it('renders custom element when "as" prop is provided', () => {
      render(
        <Text as="span" data-testid="text">
          Text content
        </Text>,
      );
      const element = screen.getByTestId('text');
      expect(element.tagName).toBe('SPAN');
    });

    it('can render as a div', () => {
      render(
        <Text as="div" data-testid="text">
          Text content
        </Text>,
      );
      const element = screen.getByTestId('text');
      expect(element.tagName).toBe('DIV');
    });

    it('forwards HTML attributes', () => {
      render(
        <Text data-testid="text" id="custom-id" className="custom-class">
          Text content
        </Text>,
      );
      const element = screen.getByTestId('text');
      expect(element).toHaveAttribute('id', 'custom-id');
      expect(element).toHaveClass('custom-class');
    });
  });

  describe('base styles (design tokens)', () => {
    it('applies margin: 0 by default', () => {
      render(<Text data-testid="text">Text content</Text>);
      const element = screen.getByTestId('text');
      expect(element).toHaveStyle({ margin: '0' });
    });
  });

  describe('fontSize prop (design tokens)', () => {
    it('applies custom fontSize', () => {
      render(
        <Text data-testid="text" fontSize="1.5rem">
          Large text
        </Text>,
      );
      const element = screen.getByTestId('text');
      expect(element).toHaveStyle({ fontSize: '1.5rem' });
    });

    it('applies fontSize in pixels', () => {
      render(
        <Text data-testid="text" fontSize="18px">
          Text
        </Text>,
      );
      const element = screen.getByTestId('text');
      expect(element).toHaveStyle({ fontSize: '18px' });
    });

    it('does not apply fontSize when not provided', () => {
      render(<Text data-testid="text">Text</Text>);
      const element = screen.getByTestId('text');
      // fontSize should not be set in inline styles (will use browser default)
      expect(element.style.fontSize).toBe('');
    });
  });

  describe('fontWeight prop (design tokens)', () => {
    it('applies numeric fontWeight', () => {
      render(
        <Text data-testid="text" fontWeight={700}>
          Bold text
        </Text>,
      );
      const element = screen.getByTestId('text');
      expect(element).toHaveStyle({ fontWeight: '700' });
    });

    it('applies string fontWeight', () => {
      render(
        <Text data-testid="text" fontWeight="bold">
          Bold text
        </Text>,
      );
      const element = screen.getByTestId('text');
      expect(element).toHaveStyle({ fontWeight: 'bold' });
    });

    it('applies various fontWeight values', () => {
      const weights = [300, 400, 500, 600, 700, 800];

      weights.forEach((weight) => {
        const { unmount } = render(
          <Text data-testid="text" fontWeight={weight}>
            Text
          </Text>,
        );
        const element = screen.getByTestId('text');
        expect(element).toHaveStyle({ fontWeight: String(weight) });
        unmount();
      });
    });

    it('does not apply fontWeight when not provided', () => {
      render(<Text data-testid="text">Text</Text>);
      const element = screen.getByTestId('text');
      expect(element.style.fontWeight).toBe('');
    });
  });

  describe('combined props (design token combinations)', () => {
    it('applies both fontSize and fontWeight', () => {
      render(
        <Text data-testid="text" fontSize="1.5rem" fontWeight={600}>
          Styled text
        </Text>,
      );
      const element = screen.getByTestId('text');
      expect(element).toHaveStyle({
        fontSize: '1.5rem',
        fontWeight: '600',
      });
    });
  });

  describe('style prop merging', () => {
    it('merges custom styles with Text props', () => {
      render(
        <Text
          data-testid="text"
          fontSize="1.5rem"
          style={{ color: 'red', textAlign: 'center' }}
        >
          Custom styled
        </Text>,
      );
      const element = screen.getByTestId('text');
      expect(element).toHaveStyle({
        fontSize: '1.5rem',
        color: 'red',
        textAlign: 'center',
      });
    });

    it('custom styles override Text props', () => {
      render(
        <Text data-testid="text" fontSize="1rem" style={{ fontSize: '2rem' }}>
          Override
        </Text>,
      );
      const element = screen.getByTestId('text');
      expect(element).toHaveStyle({ fontSize: '2rem' });
    });
  });
});

describe('Heading', () => {
  describe('rendering', () => {
    it('renders h2 element by default', () => {
      render(<Heading data-testid="heading">Heading content</Heading>);
      const element = screen.getByTestId('heading');
      expect(element.tagName).toBe('H2');
      expect(element).toHaveTextContent('Heading content');
    });

    it('renders h1 when level is 1', () => {
      render(
        <Heading data-testid="heading" level={1}>
          Heading 1
        </Heading>,
      );
      const element = screen.getByTestId('heading');
      expect(element.tagName).toBe('H1');
    });

    it('renders h2 when level is 2', () => {
      render(
        <Heading data-testid="heading" level={2}>
          Heading 2
        </Heading>,
      );
      const element = screen.getByTestId('heading');
      expect(element.tagName).toBe('H2');
    });

    it('renders h3 when level is 3', () => {
      render(
        <Heading data-testid="heading" level={3}>
          Heading 3
        </Heading>,
      );
      const element = screen.getByTestId('heading');
      expect(element.tagName).toBe('H3');
    });

    it('renders h4 when level is 4', () => {
      render(
        <Heading data-testid="heading" level={4}>
          Heading 4
        </Heading>,
      );
      const element = screen.getByTestId('heading');
      expect(element.tagName).toBe('H4');
    });

    it('renders h5 when level is 5', () => {
      render(
        <Heading data-testid="heading" level={5}>
          Heading 5
        </Heading>,
      );
      const element = screen.getByTestId('heading');
      expect(element.tagName).toBe('H5');
    });

    it('renders h6 when level is 6', () => {
      render(
        <Heading data-testid="heading" level={6}>
          Heading 6
        </Heading>,
      );
      const element = screen.getByTestId('heading');
      expect(element.tagName).toBe('H6');
    });

    it('renders custom element when "as" prop is provided', () => {
      render(
        <Heading as="div" data-testid="heading" level={1}>
          Div heading
        </Heading>,
      );
      const element = screen.getByTestId('heading');
      expect(element.tagName).toBe('DIV');
    });

    it('forwards HTML attributes', () => {
      render(
        <Heading
          data-testid="heading"
          id="custom-id"
          className="custom-class"
          level={1}
        >
          Heading
        </Heading>,
      );
      const element = screen.getByTestId('heading');
      expect(element).toHaveAttribute('id', 'custom-id');
      expect(element).toHaveClass('custom-class');
    });
  });

  describe('base styles (design tokens)', () => {
    it('applies margin: 0 by default', () => {
      render(<Heading data-testid="heading">Heading</Heading>);
      const element = screen.getByTestId('heading');
      expect(element).toHaveStyle({ margin: '0' });
    });

    it('applies fontWeight: 700 by default', () => {
      render(<Heading data-testid="heading">Heading</Heading>);
      const element = screen.getByTestId('heading');
      expect(element).toHaveStyle({ fontWeight: '700' });
    });
  });

  describe('level-based fontSize (design tokens)', () => {
    it('applies correct fontSize for level 1', () => {
      render(
        <Heading data-testid="heading" level={1}>
          H1
        </Heading>,
      );
      const element = screen.getByTestId('heading');
      expect(element).toHaveStyle({ fontSize: '2.25rem' });
    });

    it('applies correct fontSize for level 2', () => {
      render(
        <Heading data-testid="heading" level={2}>
          H2
        </Heading>,
      );
      const element = screen.getByTestId('heading');
      expect(element).toHaveStyle({ fontSize: '1.875rem' });
    });

    it('applies correct fontSize for level 3', () => {
      render(
        <Heading data-testid="heading" level={3}>
          H3
        </Heading>,
      );
      const element = screen.getByTestId('heading');
      expect(element).toHaveStyle({ fontSize: '1.5rem' });
    });

    it('applies correct fontSize for level 4', () => {
      render(
        <Heading data-testid="heading" level={4}>
          H4
        </Heading>,
      );
      const element = screen.getByTestId('heading');
      expect(element).toHaveStyle({ fontSize: '1.25rem' });
    });

    it('applies correct fontSize for level 5', () => {
      render(
        <Heading data-testid="heading" level={5}>
          H5
        </Heading>,
      );
      const element = screen.getByTestId('heading');
      expect(element).toHaveStyle({ fontSize: '1.125rem' });
    });

    it('applies correct fontSize for level 6', () => {
      render(
        <Heading data-testid="heading" level={6}>
          H6
        </Heading>,
      );
      const element = screen.getByTestId('heading');
      expect(element).toHaveStyle({ fontSize: '1rem' });
    });

    it('defaults to level 2 fontSize when no level provided', () => {
      render(<Heading data-testid="heading">Default</Heading>);
      const element = screen.getByTestId('heading');
      expect(element).toHaveStyle({ fontSize: '1.875rem' });
    });
  });

  describe('fontSize prop override (design tokens)', () => {
    it('custom fontSize overrides level-based fontSize', () => {
      render(
        <Heading data-testid="heading" level={1} fontSize="3rem">
          Custom
        </Heading>,
      );
      const element = screen.getByTestId('heading');
      expect(element).toHaveStyle({ fontSize: '3rem' });
    });

    it('applies custom fontSize with any level', () => {
      render(
        <Heading data-testid="heading" level={4} fontSize="2rem">
          Custom
        </Heading>,
      );
      const element = screen.getByTestId('heading');
      expect(element).toHaveStyle({ fontSize: '2rem' });
    });
  });

  describe('fontWeight prop (design tokens)', () => {
    it('applies custom fontWeight', () => {
      render(
        <Heading data-testid="heading" fontWeight={800}>
          Extra bold
        </Heading>,
      );
      const element = screen.getByTestId('heading');
      expect(element).toHaveStyle({ fontWeight: '800' });
    });

    it('applies numeric fontWeight values', () => {
      const weights = [400, 500, 600, 700, 800];

      weights.forEach((weight) => {
        const { unmount } = render(
          <Heading data-testid="heading" fontWeight={weight}>
            Heading
          </Heading>,
        );
        const element = screen.getByTestId('heading');
        expect(element).toHaveStyle({ fontWeight: String(weight) });
        unmount();
      });
    });

    it('applies string fontWeight', () => {
      render(
        <Heading data-testid="heading" fontWeight="normal">
          Normal
        </Heading>,
      );
      const element = screen.getByTestId('heading');
      expect(element).toHaveStyle({ fontWeight: 'normal' });
    });
  });

  describe('combined props (design token combinations)', () => {
    it('combines level, custom fontSize, and fontWeight', () => {
      render(
        <Heading
          data-testid="heading"
          level={1}
          fontSize="4rem"
          fontWeight={900}
        >
          Custom heading
        </Heading>,
      );
      const element = screen.getByTestId('heading');
      expect(element).toHaveStyle({
        fontSize: '4rem',
        fontWeight: '900',
      });
    });

    it('combines level and fontWeight with default fontSize', () => {
      render(
        <Heading data-testid="heading" level={3} fontWeight={600}>
          Heading
        </Heading>,
      );
      const element = screen.getByTestId('heading');
      expect(element).toHaveStyle({
        fontSize: '1.5rem',
        fontWeight: '600',
      });
    });
  });

  describe('style prop merging', () => {
    it('merges custom styles with Heading props', () => {
      render(
        <Heading
          data-testid="heading"
          level={2}
          style={{ color: 'blue', textAlign: 'center' }}
        >
          Styled heading
        </Heading>,
      );
      const element = screen.getByTestId('heading');
      expect(element).toHaveStyle({
        fontSize: '1.875rem',
        fontWeight: '700',
        color: 'blue',
        textAlign: 'center',
      });
    });

    it('custom styles override Heading props', () => {
      render(
        <Heading
          data-testid="heading"
          level={1}
          fontWeight={700}
          style={{ fontSize: '5rem', fontWeight: 400 }}
        >
          Override
        </Heading>,
      );
      const element = screen.getByTestId('heading');
      expect(element).toHaveStyle({
        fontSize: '5rem',
        fontWeight: '400',
      });
    });
  });

  describe('semantic HTML', () => {
    it('uses correct semantic tags for document structure', () => {
      const { container } = render(
        <div>
          <Heading level={1}>Main Title</Heading>
          <Heading level={2}>Section</Heading>
          <Heading level={3}>Subsection</Heading>
        </div>,
      );

      expect(container.querySelector('h1')).toHaveTextContent('Main Title');
      expect(container.querySelector('h2')).toHaveTextContent('Section');
      expect(container.querySelector('h3')).toHaveTextContent('Subsection');
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
        const { unmount } = render(
          <Heading data-testid="heading" level={level}>
            H{level}
          </Heading>,
        );
        const element = screen.getByTestId('heading');
        expect(element).toHaveStyle({ fontSize });
        unmount();
      });
    });

    it('all headings use fontWeight 700 by default', () => {
      const levels = [1, 2, 3, 4, 5, 6] as const;

      levels.forEach((level) => {
        const { unmount } = render(
          <Heading data-testid="heading" level={level}>
            H{level}
          </Heading>,
        );
        const element = screen.getByTestId('heading');
        expect(element).toHaveStyle({ fontWeight: '700' });
        unmount();
      });
    });
  });
});
