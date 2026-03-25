/**
 * @file tests/unit/solveHandler.test.js
 * @description Unit tests for backend/handlers/solveHandler.js
 * The filesystem is mocked to avoid real I/O.
 * No real AWS SDK calls are made.
 * @agent QA
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// ─── Mock fs BEFORE any dynamic import of the handler ────────────────────────

jest.unstable_mockModule('fs', () => ({
  readFileSync: jest.fn(),
}));

// ─── Dynamic imports (must come after all mockModule calls) ──────────────────

const { readFileSync } = await import('fs');
const { handler } = await import('../../backend/handlers/solveHandler.js');

// ─── Shared fixture ───────────────────────────────────────────────────────────

const mockSolveData = {
  worksheetId: 'abc-123',
  grade: 3,
  subject: 'Math',
  topic: 'Multiplication',
  difficulty: 'Medium',
  estimatedTime: '20 minutes',
  timerSeconds: 1200,
  totalPoints: 2,
  questions: [
    {
      number: 1,
      type: 'fill-in-the-blank',
      question: '4×6=?',
      answer: '24',
      explanation: 'Multiply 4 by 6.',
      points: 1,
    },
    {
      number: 2,
      type: 'multiple-choice',
      question: '7×8=?',
      options: ['A. 54', 'B. 56'],
      answer: 'B. 56',
      explanation: '7×8=56.',
      points: 1,
    },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockEvent(worksheetId, method = 'GET') {
  return {
    httpMethod: method,
    pathParameters: worksheetId != null ? { worksheetId } : null,
  };
}

const mockContext = { callbackWaitsForEmptyEventLoop: true };

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── OPTIONS preflight ────────────────────────────────────────────────────────

describe('solveHandler — OPTIONS preflight', () => {

  it('returns status 200 for OPTIONS request', async () => {
    const result = await handler({ httpMethod: 'OPTIONS' }, mockContext);
    expect(result.statusCode).toBe(200);
  });

  it('returns CORS headers on OPTIONS response', async () => {
    const result = await handler({ httpMethod: 'OPTIONS' }, mockContext);
    expect(result.headers['Access-Control-Allow-Origin']).toBeDefined();
  });

});

// ─── Happy path (200) ─────────────────────────────────────────────────────────

describe('solveHandler — happy path', () => {

  beforeEach(() => {
    readFileSync.mockReturnValue(JSON.stringify(mockSolveData));
  });

  it('returns status 200 for a valid worksheetId', async () => {
    const result = await handler(mockEvent('abc-123'), mockContext);
    expect(result.statusCode).toBe(200);
  });

  it('response body contains worksheetId', async () => {
    const result = await handler(mockEvent('abc-123'), mockContext);
    const body = JSON.parse(result.body);
    expect(body).toHaveProperty('worksheetId', 'abc-123');
  });

  it('response body contains a questions array', async () => {
    const result = await handler(mockEvent('abc-123'), mockContext);
    const body = JSON.parse(result.body);
    expect(Array.isArray(body.questions)).toBe(true);
    expect(body.questions).toHaveLength(2);
  });

  it('questions in response do NOT include the answer field', async () => {
    const result = await handler(mockEvent('abc-123'), mockContext);
    const body = JSON.parse(result.body);
    for (const q of body.questions) {
      expect(q).not.toHaveProperty('answer');
    }
  });

  it('questions in response do NOT include the explanation field', async () => {
    const result = await handler(mockEvent('abc-123'), mockContext);
    const body = JSON.parse(result.body);
    for (const q of body.questions) {
      expect(q).not.toHaveProperty('explanation');
    }
  });

  it('questions in response still contain the question text', async () => {
    const result = await handler(mockEvent('abc-123'), mockContext);
    const body = JSON.parse(result.body);
    expect(body.questions[0]).toHaveProperty('question', '4×6=?');
  });

  it('CORS headers are present on a 200 response', async () => {
    const result = await handler(mockEvent('abc-123'), mockContext);
    expect(result.headers['Access-Control-Allow-Origin']).toBeDefined();
  });

});

// ─── 404 — worksheet not found ────────────────────────────────────────────────

describe('solveHandler — 404 worksheet not found', () => {

  beforeEach(() => {
    const err = new Error('ENOENT: no such file or directory');
    err.code = 'ENOENT';
    readFileSync.mockImplementation(() => { throw err; });
  });

  it('returns status 404 when the solve-data.json file does not exist', async () => {
    const result = await handler(mockEvent('unknown-id'), mockContext);
    expect(result.statusCode).toBe(404);
  });

  it('returns error: "Worksheet not found." on 404', async () => {
    const result = await handler(mockEvent('unknown-id'), mockContext);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Worksheet not found.');
  });

  it('CORS headers are present on a 404 response', async () => {
    const result = await handler(mockEvent('unknown-id'), mockContext);
    expect(result.headers['Access-Control-Allow-Origin']).toBeDefined();
  });

});

// ─── 400 — missing worksheetId ────────────────────────────────────────────────

describe('solveHandler — 400 missing worksheetId', () => {

  it('returns status 400 when pathParameters is null', async () => {
    const result = await handler(mockEvent(null), mockContext);
    expect(result.statusCode).toBe(400);
  });

  it('returns an error message when worksheetId is missing', async () => {
    const result = await handler(mockEvent(null), mockContext);
    const body = JSON.parse(result.body);
    expect(body.error).toBeTruthy();
  });

  it('CORS headers are present on a 400 response', async () => {
    const result = await handler(mockEvent(null), mockContext);
    expect(result.headers['Access-Control-Allow-Origin']).toBeDefined();
  });

});
