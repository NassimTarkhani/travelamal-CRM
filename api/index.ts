/**
 * Vercel serverless entry point.
 * Vercel's @vercel/node runtime invokes this with (req, res),
 * preserving the original URL so Express routing works normally.
 */
import app from '../server/app.js';

export default app;
