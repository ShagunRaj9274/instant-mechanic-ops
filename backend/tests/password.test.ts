import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../src/lib/password';

describe('password hashing', () => {
  it('accepts the right password and rejects the wrong one', () => {
    const stored = hashPassword('instant123');
    expect(verifyPassword('instant123', stored)).toBe(true);
    expect(verifyPassword('instant1234', stored)).toBe(false);
  });

  it('salts every hash, so identical passwords differ on disk', () => {
    expect(hashPassword('same')).not.toEqual(hashPassword('same'));
  });

  it('never throws on malformed stored values', () => {
    expect(verifyPassword('x', 'not-a-hash')).toBe(false);
    expect(verifyPassword('x', '')).toBe(false);
  });
});
