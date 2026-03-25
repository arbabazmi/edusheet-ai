/**
 * @file backend/handlers/submitHandler.js
 * @description Lambda-compatible handler for POST /api/submit.
 * Reads the stored solve-data.json, scores the student's answers, and returns
 * a full per-question result breakdown.
 *
 * Local dev:  reads worksheets-local/{worksheetId}/solve-data.json
 * Lambda/AWS: S3 integration to be wired in the CDK stack (Phase 5)
 */

import { readFileSync } from 'fs';
import { join, dirname, resolve, sep } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};

// Lazy-load resultBuilder to keep module load time fast
let _buildResult;
async function getBuildResult() {
  if (!_buildResult) {
    const mod = await import('../../src/solve/resultBuilder.js');
    _buildResult = mod.buildResult;
  }
  return _buildResult;
}

/**
 * Lambda handler — POST /api/submit
 *
 * Request body:
 *   { worksheetId, studentName?, answers: [{number, answer}], timeTaken, timed }
 *
 * @param {Object} event - API Gateway event or Express-shaped mock event
 * @param {Object} [context] - Lambda context (optional in local dev)
 * @returns {Promise<{statusCode: number, headers: Object, body: string}>}
 */
export const handler = async (event, context) => {
  if (context && context.callbackWaitsForEmptyEventLoop !== undefined) {
    context.callbackWaitsForEmptyEventLoop = false;
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  try {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid JSON in request body.' }),
      };
    }

    const { worksheetId, answers, timeTaken, timed } = body;

    if (!worksheetId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'worksheetId is required.' }),
      };
    }

    // Guard against path traversal: worksheetId must be a v4 UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(worksheetId)) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid worksheetId format.' }),
      };
    }

    if (!Array.isArray(answers)) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'answers must be an array.' }),
      };
    }

    // Local dev: resolve path 2 levels up from backend/handlers/ to project root
    const baseDir = resolve(join(__dirname, '../../worksheets-local'));
    const localDir = resolve(join(baseDir, worksheetId));

    // Ensure the resolved path stays within the worksheets-local directory
    if (!localDir.startsWith(baseDir + sep)) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid worksheetId format.' }),
      };
    }

    const filePath = join(localDir, 'solve-data.json');

    let worksheet;
    try {
      worksheet = JSON.parse(readFileSync(filePath, 'utf8'));
    } catch {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Worksheet not found.' }),
      };
    }

    const buildResult = await getBuildResult();
    const result = buildResult(
      worksheet,
      answers,
      typeof timeTaken === 'number' ? timeTaken : 0,
      Boolean(timed),
    );

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(result),
    };
  } catch (err) {
    console.error('submitHandler error:', err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error.' }),
    };
  }
};
