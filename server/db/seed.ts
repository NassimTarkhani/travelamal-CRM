import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db, pool } from '.js';
import { profiles } from '.js';
import { eq } from 'drizzle-orm';

async function seed() {
    const email = 'admin@crm.tn';
    const password = '123456';

    const existing = await db.select().from(profiles).where(eq(profiles.email, email));
    if (existing.length > 0) {
        console.log(`✅ Admin account already exists: ${email}`);
        await pool.end();
        return;
    }

    const password_hash = await bcrypt.hash(password, 10);
    await db.insert(profiles).values({
        email,
        name: 'Administrateur',
        role: 'Admin',
        password_hash,
    });

    console.log(`✅ Admin account created: ${email} / ${password}`);
    await pool.end();
}

seed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
