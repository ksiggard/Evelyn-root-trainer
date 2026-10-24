import { describe, it, expect } from 'vitest';
import { ALL_CHARACTERS } from './characters';
import { bitsFor } from './codec';
import { displayBits, groupBits, spokenBits } from './formatting';

describe('groupBits', () => {
  it('groups an 8-bit string after the 3rd bit', () => {
    expect(groupBits('01100001')).toBe('011 00001');
  });

  it('leaves strings of 3 characters or fewer unchanged', () => {
    expect(groupBits('011')).toBe('011');
    expect(groupBits('01')).toBe('01');
  });

  it('keeps an empty string empty', () => {
    expect(groupBits('')).toBe('');
  });

  it('groups placeholder bits without altering them', () => {
    expect(groupBits('0110____')).toBe('011 0____');
  });

  it('uses a custom separator in place of the default space', () => {
    expect(groupBits('01100001', '·')).toBe('011·00001');
  });

  it.each(ALL_CHARACTERS)(
    'places a space at index 3 for %s and removing it recovers the bits',
    (ch) => {
      const bits = bitsFor(ch) as string;
      const grouped = groupBits(bits);
      expect(grouped).toHaveLength(9);
      expect(grouped[3]).toBe(' ');
      expect(grouped.replace(' ', '')).toBe(bits);
    },
  );
});

describe('displayBits', () => {
  it('groups bits when the setting is on', () => {
    expect(displayBits('01100001', true)).toBe('011 00001');
  });

  it('leaves bits unchanged when the setting is off', () => {
    expect(displayBits('01100001', false)).toBe('01100001');
  });

  it('groups placeholder bits when the setting is on', () => {
    expect(displayBits('011_____', true)).toBe('011 _____');
  });
});

describe('spokenBits', () => {
  it('speaks each bit as a word with a comma after the third', () => {
    expect(spokenBits('01100001')).toBe('zero one one, zero zero zero zero one');
  });

  it('speaks an underscore placeholder as "blank"', () => {
    expect(spokenBits('0110____')).toBe('zero one one, zero blank blank blank blank');
  });
});
