import { Router, Response } from 'express';
import { eq, desc } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from '.js';
import { profiles } from '.js';
import { authenticate, requireAdmin, AuthRequest } from '.js';

const router = Router();

// GET /api/profiles
router.get('/', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
        const result = await db
            .select({
                id: profiles.id,
                email: profiles.email,
                name: profiles.name,
                role: profiles.role,
                avatar_url: profiles.avatar_url,
                created_at: profiles.created_at,
            })
            .from(profiles)
            .orderBy(desc(profiles.created_at));

        res.json(result);
    } catch (err) {
        console.error('GET /profiles error:', err);
        res.status(500).json({ error: 'Erreur lors de la récupération des profils' });
    }
});

// GET /api/profiles/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
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
            .where(eq(profiles.id, req.params.id))
            .limit(1);

        if (!profile) {
            res.status(404).json({ error: 'Profil introuvable' });
            return;
        }

        res.json(profile);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// PUT /api/profiles/:id
router.put('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    // Users can update their own profile; admins can update any profile
    if (req.user!.id !== req.params.id && req.user!.role !== 'Admin') {
        res.status(403).json({ error: 'Accès refusé' });
        return;
    }

    try {
        const { name, avatar_url, role, password } = req.body;
        const updates: Record<string, any> = {};

        if (name !== undefined) updates.name = name;
        if (avatar_url !== undefined) updates.avatar_url = avatar_url;
        if (role !== undefined && req.user!.role === 'Admin') {
            const safeRole = role === 'Admin' || role === 'Employé' ? role : 'Employé';
            updates.role = safeRole;
        }
        if (password) {
            const salt = await bcrypt.genSalt(12);
            updates.password_hash = await bcrypt.hash(password, salt);
        }

        const [updated] = await db
            .update(profiles)
            .set(updates)
            .where(eq(profiles.id, req.params.id))
            .returning({
                id: profiles.id,
                email: profiles.email,
                name: profiles.name,
                role: profiles.role,
                avatar_url: profiles.avatar_url,
                created_at: profiles.created_at,
            });

        res.json(updated);
    } catch (err) {
        console.error('PUT /profiles/:id error:', err);
        res.status(500).json({ error: 'Erreur lors de la mise à jour du profil' });
    }
});

// DELETE /api/profiles/:id (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
    // Prevent deleting own account
    if (req.params.id === req.user!.id) {
        res.status(400).json({ error: 'Impossible de supprimer votre propre compte' });
        return;
    }
    try {
        await db.delete(profiles).where(eq(profiles.id, req.params.id));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
});

export default router;
