/**
 * @file backend/handlers/solveHandler.js
 * @description Lambda-compatible handler for GET /api/solve/{worksheetId}.
 * Returns the worksheet questions without answers or explanations so students
 * can solve the worksheet interactively.
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
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
};

/**
 * Lambda handler — GET /api/solve/{worksheetId}
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
    const worksheetId =
      (event.pathParameters && (event.pathParameters.worksheetId || event.pathParameters.id)) ||
      null;

    if (!worksheetId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing worksheetId.' }),
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

    // Strip answer and explanation from every question before sending to the client
    const publicQuestions = (worksheet.questions || []).map((q) => {
      const { answer, explanation, ...pub } = q;
      return pub;
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        worksheetId: worksheet.worksheetId,
        grade: worksheet.grade,
        subject: worksheet.subject,
        topic: worksheet.topic,
        difficulty: worksheet.difficulty,
        estimatedTime: worksheet.estimatedTime,
        timerSeconds: worksheet.timerSeconds,
        totalPoints: worksheet.totalPoints,
        questions: publicQuestions,
      }),
    };
  } catch (err) {
    console.error('solveHandler error:', err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error.' }),
    };
  }
};
