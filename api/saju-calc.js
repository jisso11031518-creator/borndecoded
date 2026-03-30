/**
 * POST /api/saju-calc
 * Saju engine standalone API — returns full saju JSON for n8n shorts automation.
 * Secured by TEST_SECRET header.
 *
 * Input (POST body):
 * {
 *   "name": "Test User",
 *   "birthYear": 2006,
 *   "birthMonth": 6,
 *   "birthDay": 15,
 *   "birthHour": 10,
 *   "birthMinute": 30,
 *   "birthCity": "Portland, OR, USA",
 *   "longitude": -122.6765,
 *   "timezone": "America/Los_Angeles",
 *   "gender": "female"
 * }
 *
 * Output: Full saju-engine result JSON
 */

export const config = { maxDuration: 30 };

import { runSajuEngine } from '../lib/saju-engine.mjs';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const testSecret = process.env.TEST_SECRET;
  const provided = req.headers['x-test-secret'];
  if (!testSecret || provided !== testSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const {
      name = 'Chart Reading',
      birthYear, birthMonth, birthDay,
      birthHour = null, birthMinute = 0,
      birthCity = '',
      longitude, timezone = 'America/New_York',
      gender = 'female',
    } = req.body;

    if (!birthYear || !birthMonth || !birthDay) {
      return res.status(400).json({ error: 'birthYear, birthMonth, birthDay are required' });
    }

    const result = runSajuEngine({
      name,
      year: birthYear,
      month: birthMonth,
      day: birthDay,
      hour: birthHour,
      minute: birthMinute,
      longitude,
      timezone,
      gender,
      birthCity,
      fixedQuestions: { gender, relationship: '', career: '' },
      freeQuestions: [],
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('[saju-calc] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
