import path from 'path';

/**
 * On Vercel serverless, process.cwd() is read-only (/var/task).
 * Use /tmp/uploads instead (ephemeral — files won't persist across invocations).
 * Locally, use the project-relative uploads/ folder.
 */
export const UPLOADS_DIR = process.env.VERCEL
    ? '/tmp/uploads'
    : path.join(process.cwd(), 'uploads');
