import { describe, expect, it } from 'bun:test';
import type { WeekId } from '@/shared/types';
import {
  formatDate,
  getConfigPath,
  getSubjectsPath,
  getWeeklyNotePath,
} from '../config';

describe('Config Path Utilities', () => {
  describe('getConfigPath', () => {
    it('should return path to config.json', () => {
      const result = getConfigPath();
      expect(result).toBe('PaperSync/.papersync/config.json');
    });
  });

  describe('getSubjectsPath', () => {
    it('should return path to subjects.json', () => {
      const result = getSubjectsPath();
      expect(result).toBe('PaperSync/.papersync/subjects.json');
    });
  });

  describe('getWeeklyNotePath', () => {
    it('should return path with week ID', () => {
      const result = getWeeklyNotePath('2026-W05' as WeekId);
      expect(result).toBe('PaperSync/Weekly/2026-W05.md');
    });
  });
});

describe('formatDate', () => {
  it('should format ISO date to readable format', () => {
    const result = formatDate('2026-01-27');

    expect(result).toContain('January');
    expect(result).toContain('27');
  });

  it('should handle different months', () => {
    const result = formatDate('2026-07-15');

    expect(result).toContain('July');
    expect(result).toContain('15');
  });
});
