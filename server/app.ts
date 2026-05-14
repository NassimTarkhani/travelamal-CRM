import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import { UPLOADS_DIR } from './config.js';

import authRoutes from './routes/auth.js';
import clientRoutes from './routes/clients.js';
import paymentRoutes from './routes/payments.js';
import documentRoutes from './routes/documents.js';
import expenseRoutes from './routes/expenses.js';
import activityRoutes from './routes/activities.js';
import profileRoutes from './routes/profiles.js';
import dashboardRoutes from './routes/dashboard.js';
import alertRoutes from './routes/alerts.js';

// Ensure uploads directory exists (works locally; /tmp/uploads is writable on Vercel)
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const app = express();

// CORS - allow configured origins (set CORS_ORIGIN env var in Vercel)
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map((o) => o.trim());

app.use(
    cors({
        origin: (origin, cb) => {
            if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
                cb(null, true);
            } else {
                cb(new Error('CORS not allowed'));
            }
        },
        credentials: true,
    })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static(UPLOADS_DIR));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/alerts', alertRoutes);

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Erreur serveur interne' });
});

export default app;
