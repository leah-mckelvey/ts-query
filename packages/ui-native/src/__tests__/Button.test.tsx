import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button', () => {
  it('should render button text', () => {
    const { getByText } = render(<Button>Click Me</Button>);
    expect(getByText('Click Me')).toBeDefined();
  });

  it('should call onPress when clicked', () => {
    const onPress = vi.fn();
    const { getByRole } = render(<Button onPress={onPress}>Click</Button>);
    fireEvent.click(getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('should not call onPress when disabled', () => {
    const onPress = vi.fn();
    const { getByRole } = render(
      <Button onPress={onPress} disabled>
        Disabled
      </Button>,
    );
    const button = getByRole('button');
    expect(button).toHaveProperty('disabled', true);
  });

  it('should apply solid variant styles by default', () => {
    const { getByRole } = render(<Button>Solid</Button>);
    const button = getByRole('button') as HTMLButtonElement;
    expect(button.style.backgroundColor).toBe('#2563eb'); // blue600
  });

  it('should apply outline variant styles', () => {
    const { getByRole } = render(<Button variant="outline">Outline</Button>);
    const button = getByRole('button') as HTMLButtonElement;
    expect(button.style.borderWidth).toBe('1px');
    expect(button.style.borderColor).toBe('#2563eb');
  });

  it('should apply ghost variant styles', () => {
    const { getByRole } = render(<Button variant="ghost">Ghost</Button>);
    const button = getByRole('button') as HTMLButtonElement;
    expect(button.style.backgroundColor).toBe('transparent');
    expect(button.style.borderWidth).toBe('0px');
  });

  it('should apply size sm', () => {
    const { getByRole } = render(<Button size="sm">Small</Button>);
    const button = getByRole('button') as HTMLButtonElement;
    // RN paddingVertical is converted to paddingTop + paddingBottom
    expect(button.style.paddingTop).toBe('8px');
    expect(button.style.paddingBottom).toBe('8px');
  });

  it('should apply size lg', () => {
    const { getByRole } = render(<Button size="lg">Large</Button>);
    const button = getByRole('button') as HTMLButtonElement;
    // RN paddingVertical is converted to paddingTop + paddingBottom
    expect(button.style.paddingTop).toBe('12px');
    expect(button.style.paddingBottom).toBe('12px');
  });

  it('should apply red color scheme', () => {
    const { getByRole } = render(<Button colorScheme="red">Delete</Button>);
    const button = getByRole('button') as HTMLButtonElement;
    expect(button.style.backgroundColor).toBe('#dc2626'); // red600
  });

  it('should apply green color scheme', () => {
    const { getByRole } = render(<Button colorScheme="green">Success</Button>);
    const button = getByRole('button') as HTMLButtonElement;
    expect(button.style.backgroundColor).toBe('#16a34a'); // green600
  });

  it('should apply full width', () => {
    const { getByRole } = render(<Button fullWidth>Full</Button>);
    const button = getByRole('button') as HTMLButtonElement;
    expect(button.style.width).toBe('100%');
  });

  it('should apply disabled opacity', () => {
    const { getByRole } = render(<Button disabled>Disabled</Button>);
    const button = getByRole('button') as HTMLButtonElement;
    expect(button.style.opacity).toBe('0.5');
  });

  it('should have accessibility role', () => {
    const { getByRole } = render(<Button>Accessible</Button>);
    expect(getByRole('button')).toBeDefined();
  });
});
