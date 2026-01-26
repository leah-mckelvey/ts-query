import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { Text, Heading } from '../Text';

describe('Text', () => {
  it('should render text content', () => {
    const { getByText } = render(<Text>Hello World</Text>);
    expect(getByText('Hello World')).toBeDefined();
  });

  it('should apply default styles', () => {
    const { container } = render(<Text>Test</Text>);
    const text = container.firstChild as HTMLElement;
    expect(text.style.fontSize).toBe('16px'); // md
    expect(text.style.fontWeight).toBe('400'); // normal
    expect(text.style.color).toBe('#111827'); // gray900
  });

  it('should apply size token', () => {
    const { container } = render(<Text size="xl">Large</Text>);
    const text = container.firstChild as HTMLElement;
    expect(text.style.fontSize).toBe('20px');
  });

  it('should apply numeric size', () => {
    const { container } = render(<Text size={24}>Custom</Text>);
    const text = container.firstChild as HTMLElement;
    expect(text.style.fontSize).toBe('24px');
  });

  it('should apply weight token', () => {
    const { container } = render(<Text weight="bold">Bold</Text>);
    const text = container.firstChild as HTMLElement;
    expect(text.style.fontWeight).toBe('700');
  });

  it('should apply color token', () => {
    const { container } = render(<Text color="blue600">Blue</Text>);
    const text = container.firstChild as HTMLElement;
    expect(text.style.color).toBe('#2563eb');
  });

  it('should apply raw color', () => {
    const { container } = render(<Text color="#ff0000">Red</Text>);
    const text = container.firstChild as HTMLElement;
    expect(text.style.color).toBe('#ff0000');
  });

  it('should apply text alignment', () => {
    const { container } = render(<Text align="center">Centered</Text>);
    const text = container.firstChild as HTMLElement;
    expect(text.style.textAlign).toBe('center');
  });

  it('should apply margins', () => {
    const { container } = render(
      <Text mt={2} mb={4}>
        Spaced
      </Text>,
    );
    const text = container.firstChild as HTMLElement;
    expect(text.style.marginTop).toBe('8px');
    expect(text.style.marginBottom).toBe('16px');
  });
});

describe('Heading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render heading content', () => {
    const { getByText } = render(<Heading>Title</Heading>);
    expect(getByText('Title')).toBeDefined();
  });

  it('should apply level 1 size', () => {
    const { container } = render(<Heading level={1}>H1</Heading>);
    const heading = container.firstChild as HTMLElement;
    expect(heading.style.fontSize).toBe('48px'); // 5xl
  });

  it('should apply level 2 size (default)', () => {
    const { container } = render(<Heading>H2</Heading>);
    const heading = container.firstChild as HTMLElement;
    expect(heading.style.fontSize).toBe('36px'); // 4xl
  });

  it('should apply level 3 size', () => {
    const { container } = render(<Heading level={3}>H3</Heading>);
    const heading = container.firstChild as HTMLElement;
    expect(heading.style.fontSize).toBe('30px'); // 3xl
  });

  it('should default to bold weight', () => {
    const { container } = render(<Heading>Bold</Heading>);
    const heading = container.firstChild as HTMLElement;
    expect(heading.style.fontWeight).toBe('700');
  });

  it('should allow size override', () => {
    const { container } = render(
      <Heading level={1} size="sm">
        Small H1
      </Heading>,
    );
    const heading = container.firstChild as HTMLElement;
    expect(heading.style.fontSize).toBe('14px');
  });
});
