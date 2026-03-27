import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { Card } from '../Card';

describe('Card', () => {
  describe('CardRoot', () => {
    it('should render children', () => {
      const { getByText } = render(
        <Card>
          <span>Card Content</span>
        </Card>,
      );
      expect(getByText('Card Content')).toBeDefined();
    });

    it('should apply default variant styles', () => {
      const { getByTestId } = render(
        <Card testID="card">
          <span>Content</span>
        </Card>,
      );
      const card = getByTestId('card') as HTMLElement;
      expect(card.style.backgroundColor).toBe('#ffffff'); // white
      expect(card.style.borderRadius).toBe('12px'); // radius.lg = 12
    });

    it('should apply elevated variant styles', () => {
      const { getByTestId } = render(
        <Card variant="elevated" testID="card">
          <span>Content</span>
        </Card>,
      );
      const card = getByTestId('card') as HTMLElement;
      expect(card.style.backgroundColor).toBe('#ffffff');
    });

    it('should apply outlined variant styles', () => {
      const { getByTestId } = render(
        <Card variant="outlined" testID="card">
          <span>Content</span>
        </Card>,
      );
      const card = getByTestId('card') as HTMLElement;
      expect(card.style.borderWidth).toBe('1px');
      expect(card.style.borderColor).toBe('#e5e7eb'); // gray200
    });

    it('should be pressable when onPress is provided', () => {
      const onPress = vi.fn();
      const { getByRole } = render(
        <Card onPress={onPress}>
          <span>Pressable Card</span>
        </Card>,
      );
      const button = getByRole('button');
      fireEvent.click(button);
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('should not be a button when onPress is not provided', () => {
      const { queryByRole } = render(
        <Card>
          <span>Non-pressable Card</span>
        </Card>,
      );
      expect(queryByRole('button')).toBeNull();
    });

    it('should apply custom styles', () => {
      const { getByTestId } = render(
        <Card testID="card" style={{ margin: 10 }}>
          <span>Content</span>
        </Card>,
      );
      const card = getByTestId('card') as HTMLElement;
      expect(card.style.margin).toBe('10px');
    });
  });

  describe('Card.Header', () => {
    it('should render header content', () => {
      const { getByText } = render(
        <Card>
          <Card.Header>
            <span>Header Title</span>
          </Card.Header>
        </Card>,
      );
      expect(getByText('Header Title')).toBeDefined();
    });

    it('should apply custom styles to header', () => {
      const { getByText } = render(
        <Card>
          <Card.Header style={{ backgroundColor: 'red' }}>
            <span>Header</span>
          </Card.Header>
        </Card>,
      );
      const header = getByText('Header').parentElement as HTMLElement;
      expect(header.style.backgroundColor).toBe('red');
    });
  });

  describe('Card.Body', () => {
    it('should render body content', () => {
      const { getByText } = render(
        <Card>
          <Card.Body>
            <span>Body Content</span>
          </Card.Body>
        </Card>,
      );
      expect(getByText('Body Content')).toBeDefined();
    });

    it('should apply custom styles to body', () => {
      const { getByText } = render(
        <Card>
          <Card.Body style={{ backgroundColor: 'blue' }}>
            <span>Body</span>
          </Card.Body>
        </Card>,
      );
      const body = getByText('Body').parentElement as HTMLElement;
      expect(body.style.backgroundColor).toBe('blue');
    });
  });

  describe('Card.Footer', () => {
    it('should render footer content', () => {
      const { getByText } = render(
        <Card>
          <Card.Footer>
            <span>Footer Content</span>
          </Card.Footer>
        </Card>,
      );
      expect(getByText('Footer Content')).toBeDefined();
    });

    it('should apply custom styles to footer', () => {
      const { getByText } = render(
        <Card>
          <Card.Footer style={{ backgroundColor: 'green' }}>
            <span>Footer</span>
          </Card.Footer>
        </Card>,
      );
      const footer = getByText('Footer').parentElement as HTMLElement;
      expect(footer.style.backgroundColor).toBe('green');
    });
  });

  describe('Compound component', () => {
    it('should render full card with all sections', () => {
      const { getByText } = render(
        <Card variant="elevated">
          <Card.Header>
            <span>Title</span>
          </Card.Header>
          <Card.Body>
            <span>Content</span>
          </Card.Body>
          <Card.Footer>
            <span>Actions</span>
          </Card.Footer>
        </Card>,
      );
      expect(getByText('Title')).toBeDefined();
      expect(getByText('Content')).toBeDefined();
      expect(getByText('Actions')).toBeDefined();
    });
  });
});
