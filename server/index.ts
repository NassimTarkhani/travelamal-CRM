import 'dotenv/config';
import http from 'http';
import { pool } from '.js';
import app from '.js';

const PORT = Number(process.env.PORT) || 3001;

// Use http.createServer with increased maxHeaderSize to tolerate large cookies
const server = http.createServer({ maxHeaderSize: 65536 }, app);

server.listen(PORT, '0.0.0.0', async () => {
    try {
        const client = await pool.connect();
        client.release();
        console.log('✅ Database connected');
    } catch (err) {
        console.error('⚠️  Database connection failed:', err);
    }

    console.log(`🚀 TravelAmal API server running on http://0.0.0.0:${PORT}`);
    console.log(`   Database: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@') || '(not configured)'}`);
});
