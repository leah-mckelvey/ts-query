import { describe, it, expect } from 'vitest';
import {
  space,
  fontSize,
  fontWeight,
  radius,
  colors,
  resolveSpace,
  resolveColor,
} from '../tokens';

describe('tokens', () => {
  describe('space', () => {
    it('should have correct space values', () => {
      expect(space[0]).toBe(0);
      expect(space[1]).toBe(4);
      expect(space[2]).toBe(8);
      expect(space[4]).toBe(16);
      expect(space[8]).toBe(32);
    });
  });

  describe('fontSize', () => {
    it('should have correct font size values', () => {
      expect(fontSize.xs).toBe(12);
      expect(fontSize.sm).toBe(14);
      expect(fontSize.md).toBe(16);
      expect(fontSize.lg).toBe(18);
      expect(fontSize.xl).toBe(20);
    });
  });

  describe('fontWeight', () => {
    it('should have correct font weight values', () => {
      expect(fontWeight.normal).toBe('400');
      expect(fontWeight.medium).toBe('500');
      expect(fontWeight.semibold).toBe('600');
      expect(fontWeight.bold).toBe('700');
    });
  });

  describe('radius', () => {
    it('should have correct radius values', () => {
      expect(radius.none).toBe(0);
      expect(radius.sm).toBe(4);
      expect(radius.md).toBe(8);
      expect(radius.lg).toBe(12);
      expect(radius.full).toBe(9999);
    });
  });

  describe('colors', () => {
    it('should have basic colors', () => {
      expect(colors.white).toBe('#ffffff');
      expect(colors.black).toBe('#000000');
      expect(colors.transparent).toBe('transparent');
    });

    it('should have color scales', () => {
      expect(colors.blue500).toBe('#3b82f6');
      expect(colors.gray500).toBe('#6b7280');
      expect(colors.red500).toBe('#ef4444');
      expect(colors.green500).toBe('#22c55e');
    });
  });

  describe('resolveSpace', () => {
    it('should resolve space tokens', () => {
      expect(resolveSpace(0)).toBe(0);
      expect(resolveSpace(1)).toBe(4);
      expect(resolveSpace(4)).toBe(16);
    });

    it('should treat raw numbers as multipliers', () => {
      // Numbers not in the space scale are treated as multipliers
      expect(resolveSpace(100)).toBe(400); // 100 * 4
    });
  });

  describe('resolveColor', () => {
    it('should resolve color tokens', () => {
      expect(resolveColor('blue500')).toBe('#3b82f6');
      expect(resolveColor('white')).toBe('#ffffff');
    });

    it('should pass through raw color values', () => {
      expect(resolveColor('#ff0000')).toBe('#ff0000');
      expect(resolveColor('rgb(255, 0, 0)')).toBe('rgb(255, 0, 0)');
    });
  });
});
