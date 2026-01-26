import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { Stack, HStack, VStack } from '../Stack';

describe('Stack', () => {
  it('should render children', () => {
    const { getByText } = render(
      <Stack>
        <span>Child 1</span>
        <span>Child 2</span>
      </Stack>,
    );
    expect(getByText('Child 1')).toBeDefined();
    expect(getByText('Child 2')).toBeDefined();
  });

  it('should default to column direction', () => {
    const { container } = render(<Stack />);
    const stack = container.firstChild as HTMLElement;
    expect(stack.style.flexDirection).toBe('column');
  });

  it('should apply row direction', () => {
    const { container } = render(<Stack direction="row" />);
    const stack = container.firstChild as HTMLElement;
    expect(stack.style.flexDirection).toBe('row');
  });

  it('should apply gap', () => {
    const { container } = render(<Stack gap={4} />);
    const stack = container.firstChild as HTMLElement;
    expect(stack.style.gap).toBe('16px');
  });

  it('should apply alignment props', () => {
    const { container } = render(
      <Stack align="center" justify="space-between" />,
    );
    const stack = container.firstChild as HTMLElement;
    expect(stack.style.alignItems).toBe('center');
    expect(stack.style.justifyContent).toBe('space-between');
  });

  it('should apply wrap', () => {
    const { container } = render(<Stack wrap="wrap" />);
    const stack = container.firstChild as HTMLElement;
    expect(stack.style.flexWrap).toBe('wrap');
  });

  it('should inherit Box props', () => {
    const { container } = render(<Stack p={4} bg="gray100" />);
    const stack = container.firstChild as HTMLElement;
    expect(stack.style.padding).toBe('16px');
    expect(stack.style.backgroundColor).toBe('#f3f4f6');
  });
});

describe('HStack', () => {
  it('should render with row direction', () => {
    const { container } = render(<HStack />);
    const stack = container.firstChild as HTMLElement;
    expect(stack.style.flexDirection).toBe('row');
  });

  it('should apply gap', () => {
    const { container } = render(<HStack gap={2} />);
    const stack = container.firstChild as HTMLElement;
    expect(stack.style.gap).toBe('8px');
  });
});

describe('VStack', () => {
  it('should render with column direction', () => {
    const { container } = render(<VStack />);
    const stack = container.firstChild as HTMLElement;
    expect(stack.style.flexDirection).toBe('column');
  });

  it('should apply gap', () => {
    const { container } = render(<VStack gap={3} />);
    const stack = container.firstChild as HTMLElement;
    expect(stack.style.gap).toBe('12px');
  });
});
