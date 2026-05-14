import { Router, Response, Request } from 'express';
import { eq, desc } from 'drizzle-orm';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '.js';
import { expenses, profiles } from '.js';
import { authenticate, requireAdmin, AuthRequest } from '.js';
import { alias } from 'drizzle-orm/pg-core';
import { UPLOADS_DIR } from '.js';

const router = Router();

const storage = multer.diskStorage({
    destination: (_req: Request, _file, cb) => {
        const uploadDir = path.join(UPLOADS_DIR, 'expenses');
        fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        const base = path.basename(file.originalname, ext).replace(/[^a-z0-9]/gi, '_').toLowerCase();
        cb(null, `${base}_${timestamp}${ext}`);
    },
});

const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// GET /api/expenses
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { created_by: filterBy } = req.query as Record<string, string>;
        const creatorAlias = alias(profiles, 'creator_info');

        let query = db
            .select({
                id: expenses.id,
                amount: expenses.amount,
                description: expenses.description,
                proof_url: expenses.proof_url,
                client_id: expenses.client_id,
                created_by: expenses.created_by,
                created_at: expenses.created_at,
                creator_name: creatorAlias.name,
                creator_email: creatorAlias.email,
            })
            .from(expenses)
            .leftJoin(creatorAlias, eq(expenses.created_by, creatorAlias.id))
            .orderBy(desc(expenses.created_at));

        // Non-admins can only see their own expenses; filter if created_by param is set
        const rows = filterBy && filterBy !== 'all'
            ? await query.where(eq(expenses.created_by, filterBy))
            : await query;

        res.json(
            rows.map((e) => ({
                ...e,
                amount: Number(e.amount),
                profiles: { name: e.creator_name, email: e.creator_email },
            }))
        );
    } catch (err) {
        console.error('GET /expenses error:', err);
        res.status(500).json({ error: 'Erreur lors de la récupération des dépenses' });
    }
});

// POST /api/expenses/upload - upload proof file
router.post('/upload', authenticate, upload.single('file'), async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.file) {
        res.status(400).json({ error: 'Aucun fichier fourni' });
        return;
    }
    const file_url = `/uploads/expenses/${req.file.filename}`;
    res.json({ file_url });
});

// POST /api/expenses
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { amount, description, proof_url, client_id } = req.body;

        if (!amount || !description) {
            res.status(400).json({ error: 'Montant et description requis' });
            return;
        }

        const [expense] = await db
            .insert(expenses)
            .values({
                amount: String(amount),
                description,
                proof_url: proof_url || null,
                client_id: client_id || null,
                created_by: req.user!.id,
            })
            .returning();

        res.status(201).json({ ...expense, amount: Number(expense.amount) });
    } catch (err) {
        console.error('POST /expenses error:', err);
        res.status(500).json({ error: 'Erreur lors de la création de la dépense' });
    }
});

// DELETE /api/expenses/:id (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const [expense] = await db
            .select({ proof_url: expenses.proof_url })
            .from(expenses)
            .where(eq(expenses.id, req.params.id))
            .limit(1);

        await db.delete(expenses).where(eq(expenses.id, req.params.id));

        if (expense?.proof_url && expense.proof_url.startsWith('/uploads/')) {
            const filePath = path.join(UPLOADS_DIR, '..', expense.proof_url);
            fs.unlink(filePath, () => { });
        }

        res.json({ success: true });
    } catch (err) {
        console.error('DELETE /expenses/:id error:', err);
        res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
});

export default router;
