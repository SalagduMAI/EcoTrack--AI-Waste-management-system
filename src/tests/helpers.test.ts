import { describe, it, expect } from 'vitest';
import { getInitials, generateUnitsForBlock, formatActivityTime } from '../utils/helpers';

describe('getInitials', () => {
  it('should generate initials from first and last names', () => {
    expect(getInitials('Donovan', 'Rajapaksa')).toBe('DR');
    expect(getInitials('Priya', 'Jayasinghe')).toBe('PJ');
  });

  it('should handle single empty names or null-like values', () => {
    expect(getInitials('', 'Rajapaksa')).toBe('R');
    expect(getInitials('Donovan', '')).toBe('D');
  });

  it('should return fallback if both names are empty', () => {
    expect(getInitials('', '')).toBe('AS');
  });
});

describe('generateUnitsForBlock', () => {
  it('should generate the correct structure of units for floors', () => {
    const units = generateUnitsForBlock('Block A', 2, 3);
    
    // Check floors
    expect(Object.keys(units)).toEqual(['1', '2']);
    
    // Check units on floor 1
    expect(units[1]).toHaveLength(3);
    expect(units[1][0]).toEqual({
      unit_number: 'A-101',
      resident: null,
      resident_phone: null,
      resident_email: null,
    });
    expect(units[1][1].unit_number).toBe('A-102');
    expect(units[1][2].unit_number).toBe('A-103');
    
    // Check units on floor 2
    expect(units[2]).toHaveLength(3);
    expect(units[2][0].unit_number).toBe('A-201');
    expect(units[2][1].unit_number).toBe('A-202');
    expect(units[2][2].unit_number).toBe('A-203');
  });

  it('should merge and preserve existing unit allocations if provided', () => {
    const existing = {
      1: [
        {
          unit_number: 'A-101',
          resident: 'John Doe',
          resident_phone: '123456789',
          resident_email: 'john@example.com',
        }
      ]
    };
    
    const units = generateUnitsForBlock('Block A', 1, 2, existing);
    
    expect(units[1]).toHaveLength(2);
    expect(units[1][0]).toEqual({
      unit_number: 'A-101',
      resident: 'John Doe',
      resident_phone: '123456789',
      resident_email: 'john@example.com',
    });
    expect(units[1][1]).toEqual({
      unit_number: 'A-102',
      resident: null,
      resident_phone: null,
      resident_email: null,
    });
  });
});

describe('formatActivityTime', () => {
  it('should return Just now for very recent times', () => {
    const now = Date.now();
    expect(formatActivityTime(now)).toBe('Just now');
    expect(formatActivityTime(now - 30000)).toBe('Just now');
  });

  it('should return minutes ago for times within an hour', () => {
    const now = Date.now();
    expect(formatActivityTime(now - 120000)).toBe('2m ago');
    expect(formatActivityTime(now - 3500000)).toBe('58m ago');
  });

  it('should return hours ago for times within a day', () => {
    const now = Date.now();
    expect(formatActivityTime(now - 7200000)).toBe('2h ago');
    expect(formatActivityTime(now - 82800000)).toBe('23h ago');
  });

  it('should return Yesterday or days ago for older times', () => {
    const now = Date.now();
    // Yesterday is generally between 24 and 48 hours ago
    expect(formatActivityTime(now - 25 * 3600000)).toBe('Yesterday');
    expect(formatActivityTime(now - 3 * 24 * 3600000)).toBe('3d ago');
  });

  it('should return fallback if timestamp is missing or zero', () => {
    expect(formatActivityTime(0)).toBe('Recently');
  });
});
