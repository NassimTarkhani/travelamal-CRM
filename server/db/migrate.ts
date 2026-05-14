import 'dotenv/config';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from '.js';
import path from 'path';

async function main() {
    console.log('Running database migrations...');
    await migrate(db, {
        migrationsFolder: path.join(process.cwd(), 'drizzle', 'migrations'),
    });
    console.log('Migrations completed successfully!');
    await pool.end();
}

main().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
