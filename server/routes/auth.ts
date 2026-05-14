import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '.js';
import { profiles } from '.js';
import { authenticate, requireAdmin, AuthRequest } from '.js';

const router = Router();

const signToken = (profile: { id: string; email: string; role: string; name: string }) =>
    jwt.sign(
        { id: profile.id, email: profile.email, role: profile.role, name: profile.name },
        process.env.JWT_SECRET!,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;

    if (!email || !password) {
        res.status(400).json({ error: 'Email et mot de passe requis' });
        return;
    }

    try {
        const [profile] = await db.select().from(profiles).where(eq(profiles.email, email.toLowerCase().trim())).limit(1);

        if (!profile) {
            res.status(401).json({ error: 'Identifiants invalides' });
            return;
        }

        const valid = await bcrypt.compare(password, profile.password_hash);
        if (!valid) {
            res.status(401).json({ error: 'Identifiants invalides' });
            return;
        }

        const token = signToken({ id: profile.id, email: profile.email, role: profile.role, name: profile.name });

        const { password_hash, ...safeProfile } = profile;
        res.json({ token, profile: safeProfile });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const [profile] = await db
            .select({
                id: profiles.id,
                email: profiles.email,
                name: profiles.name,
                role: profiles.role,
                avatar_url: profiles.avatar_url,
                created_at: profiles.created_at,
            })
            .from(profiles)
            .where(eq(profiles.id, req.user!.id))
            .limit(1);

        if (!profile) {
            res.status(404).json({ error: 'Profil introuvable' });
            return;
        }

        res.json({ profile });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// POST /api/auth/register (admin only)
router.post('/register', authenticate, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name) {
        res.status(400).json({ error: 'Email, mot de passe et nom requis' });
        return;
    }

    const safeRole = role === 'Admin' || role === 'Employé' ? role : 'Employé';

    try {
        const [existing] = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.email, email.toLowerCase().trim())).limit(1);
        if (existing) {
            res.status(409).json({ error: 'Cet email est déjà utilisé' });
            return;
        }

        const salt = await bcrypt.genSalt(12);
        const password_hash = await bcrypt.hash(password, salt);

        const [created] = await db
            .insert(profiles)
            .values({
                email: email.toLowerCase().trim(),
                name,
                role: safeRole,
                password_hash,
            })
            .returning({
                id: profiles.id,
                email: profiles.email,
                name: profiles.name,
                role: profiles.role,
                avatar_url: profiles.avatar_url,
                created_at: profiles.created_at,
            });

        res.status(201).json(created);
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Erreur lors de la création de l\'utilisateur' });
    }
});

// PUT /api/auth/change-password
router.put('/change-password', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        res.status(400).json({ error: 'Mot de passe actuel et nouveau mot de passe requis' });
        return;
    }
    try {
        const [profile] = await db.select().from(profiles).where(eq(profiles.id, req.user!.id)).limit(1);
        if (!profile) {
            res.status(404).json({ error: 'Profil introuvable' });
            return;
        }
        const valid = await bcrypt.compare(currentPassword, profile.password_hash);
        if (!valid) {
            res.status(401).json({ error: 'Mot de passe actuel incorrect' });
            return;
        }
        const salt = await bcrypt.genSalt(12);
        const password_hash = await bcrypt.hash(newPassword, salt);
        await db.update(profiles).set({ password_hash }).where(eq(profiles.id, req.user!.id));
        res.json({ message: 'Mot de passe mis à jour' });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
