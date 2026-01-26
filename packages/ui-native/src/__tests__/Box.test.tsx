import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { Box } from '../Box';

describe('Box', () => {
  it('should render children', () => {
    const { getByText } = render(<Box>Hello</Box>);
    expect(getByText('Hello')).toBeDefined();
  });

  it('should apply padding props', () => {
    const { container } = render(<Box p={4} testID="box" />);
    const box = container.firstChild as HTMLElement;
    expect(box.style.padding).toBe('16px');
  });

  it('should apply horizontal and vertical padding', () => {
    const { container } = render(<Box px={2} py={4} />);
    const box = container.firstChild as HTMLElement;
    // RN paddingHorizontal/paddingVertical are converted to individual properties
    expect(box.style.paddingLeft).toBe('8px');
    expect(box.style.paddingRight).toBe('8px');
    expect(box.style.paddingTop).toBe('16px');
    expect(box.style.paddingBottom).toBe('16px');
  });

  it('should apply margin props', () => {
    const { container } = render(<Box m={2} />);
    const box = container.firstChild as HTMLElement;
    expect(box.style.margin).toBe('8px');
  });

  it('should apply background color', () => {
    const { container } = render(<Box bg="blue500" />);
    const box = container.firstChild as HTMLElement;
    expect(box.style.backgroundColor).toBe('#3b82f6');
  });

  it('should apply raw color values', () => {
    const { container } = render(<Box bg="#ff0000" />);
    const box = container.firstChild as HTMLElement;
    expect(box.style.backgroundColor).toBe('#ff0000');
  });

  it('should apply border radius with token', () => {
    const { container } = render(<Box rounded="lg" />);
    const box = container.firstChild as HTMLElement;
    expect(box.style.borderRadius).toBe('12px');
  });

  it('should apply border radius with number', () => {
    const { container } = render(<Box rounded={20} />);
    const box = container.firstChild as HTMLElement;
    expect(box.style.borderRadius).toBe('20px');
  });

  it('should apply width and height', () => {
    const { container } = render(<Box w={100} h={50} />);
    const box = container.firstChild as HTMLElement;
    expect(box.style.width).toBe('100px');
    expect(box.style.height).toBe('50px');
  });

  it('should apply flex properties', () => {
    const { container } = render(
      <Box flex={1} alignItems="center" justifyContent="space-between" />,
    );
    const box = container.firstChild as HTMLElement;
    // RN flex is converted to flexGrow/flexShrink/flexBasis
    expect(box.style.flexGrow).toBe('1');
    expect(box.style.alignItems).toBe('center');
    expect(box.style.justifyContent).toBe('space-between');
  });

  it('should merge custom styles', () => {
    const { container } = render(<Box p={2} style={{ opacity: 0.5 }} />);
    const box = container.firstChild as HTMLElement;
    expect(box.style.padding).toBe('8px');
    expect(box.style.opacity).toBe('0.5');
  });
});
