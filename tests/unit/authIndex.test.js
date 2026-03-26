/**
 * @file tests/unit/authIndex.test.js
 * @description Unit tests for src/auth/index.js
 * Verifies that getAuthAdapter() returns the correct adapter based on AUTH_MODE.
 * @agent QA
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// ─── Mock the mockAuthAdapter module BEFORE any dynamic import ────────────────

const mockAdapter = {
  createUser: jest.fn(),
  findUserByEmail: jest.fn(),
  verifyPassword: jest.fn(),
  generateToken: jest.fn(),
  verifyToken: jest.fn(),
};

jest.unstable_mockModule('../../src/auth/mockAuthAdapter.js', () => ({
  mockAuthAdapter: mockAdapter,
}));

// ─── Dynamic import (must come after all mockModule calls) ────────────────────

const { getAuthAdapter } = await import('../../src/auth/index.js');

// ─── Test helpers ─────────────────────────────────────────────────────────────

const originalAuthMode = process.env.AUTH_MODE;

afterEach(() => {
  if (originalAuthMode === undefined) {
    delete process.env.AUTH_MODE;
  } else {
    process.env.AUTH_MODE = originalAuthMode;
  }
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('getAuthAdapter — default / mock mode', () => {

  it('returns the mock adapter when AUTH_MODE is not set', () => {
    delete process.env.AUTH_MODE;
    const adapter = getAuthAdapter();
    expect(adapter).toBe(mockAdapter);
  });

  it('returns the mock adapter when AUTH_MODE=mock', () => {
    process.env.AUTH_MODE = 'mock';
    const adapter = getAuthAdapter();
    expect(adapter).toBe(mockAdapter);
  });

  it('returned adapter has createUser method', () => {
    delete process.env.AUTH_MODE;
    const adapter = getAuthAdapter();
    expect(typeof adapter.createUser).toBe('function');
  });

  it('returned adapter has findUserByEmail method', () => {
    delete process.env.AUTH_MODE;
    const adapter = getAuthAdapter();
    expect(typeof adapter.findUserByEmail).toBe('function');
  });

  it('returned adapter has verifyPassword method', () => {
    delete process.env.AUTH_MODE;
    const adapter = getAuthAdapter();
    expect(typeof adapter.verifyPassword).toBe('function');
  });

  it('returned adapter has generateToken method', () => {
    delete process.env.AUTH_MODE;
    const adapter = getAuthAdapter();
    expect(typeof adapter.generateToken).toBe('function');
  });

  it('returned adapter has verifyToken method', () => {
    delete process.env.AUTH_MODE;
    const adapter = getAuthAdapter();
    expect(typeof adapter.verifyToken).toBe('function');
  });

});

describe('getAuthAdapter — cognito mode', () => {

  it('throws when AUTH_MODE=cognito', () => {
    process.env.AUTH_MODE = 'cognito';
    expect(() => getAuthAdapter()).toThrow();
  });

  it('error message mentions "Cognito" when AUTH_MODE=cognito', () => {
    process.env.AUTH_MODE = 'cognito';
    expect(() => getAuthAdapter()).toThrow(/cognito/i);
  });

  it('error message mentions "mock" as the fallback when AUTH_MODE=cognito', () => {
    process.env.AUTH_MODE = 'cognito';
    expect(() => getAuthAdapter()).toThrow(/mock/i);
  });

});
