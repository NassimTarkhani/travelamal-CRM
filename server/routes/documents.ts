import { Router, Response, Request } from 'express';
import { eq, desc } from 'drizzle-orm';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '.js';
import { documents, activities } from '.js';
import { authenticate, AuthRequest } from '.js';
import { UPLOADS_DIR } from '.js';

const router = Router();

// Configure multer disk storage — use a temp dir; we move the file to the
// correct client folder inside the route handler once req.body is fully parsed.
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        const tempDir = path.join(UPLOADS_DIR, '_temp');
        fs.mkdirSync(tempDir, { recursive: true });
        cb(null, tempDir);
    },
    filename: (_req, file, cb) => {
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        const base = path.basename(file.originalname, ext).replace(/[^a-z0-9]/gi, '_').toLowerCase();
        cb(null, `${base}_${timestamp}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
});

// GET /api/documents  - all documents
router.get('/', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
        const result = await db
            .select()
            .from(documents)
            .orderBy(desc(documents.upload_date));

        // Attach client info via separate query (simpler approach)
        res.json(result);
    } catch (err) {
        console.error('GET /documents error:', err);
        res.status(500).json({ error: 'Erreur lors de la récupération des documents' });
    }
});

// GET /api/documents/client/:clientId
router.get('/client/:clientId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const result = await db
            .select()
            .from(documents)
            .where(eq(documents.client_id, req.params.clientId))
            .orderBy(desc(documents.upload_date));

        res.json(result);
    } catch (err) {
        console.error('GET /documents/client/:clientId error:', err);
        res.status(500).json({ error: 'Erreur lors de la récupération des documents' });
    }
});

// POST /api/documents/upload
router.post('/upload', authenticate, upload.single('file'), async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'Aucun fichier fourni' });
            return;
        }

        const { client_id, document_type, file_name, expiry_date } = req.body;

        if (!client_id) {
            fs.unlinkSync(req.file.path);
            res.status(400).json({ error: 'client_id est requis' });
            return;
        }

        // Move file from temp dir to the correct client directory
        const clientDir = path.join(UPLOADS_DIR, client_id);
        fs.mkdirSync(clientDir, { recursive: true });
        const destPath = path.join(clientDir, req.file.filename);
        fs.renameSync(req.file.path, destPath);

        // Build the public URL for the file
        const file_url = `/uploads/${client_id}/${req.file.filename}`;

        const [doc] = await db
            .insert(documents)
            .values({
                client_id,
                document_type: document_type || 'Autre',
                file_url,
                file_name: file_name || req.file.originalname,
                expiry_date: expiry_date || null,
                uploaded_by: req.user!.id,
                status: 'Présent',
            })
            .returning();

        // Log activity
        db.insert(activities)
            .values({
                client_id,
                action_type: 'Document',
                description: `Document ajouté : ${document_type || 'Autre'} (${file_name || req.file.originalname})`,
                performed_by: req.user!.id,
            })
            .catch((e) => console.error('Activity log error:', e));

        res.status(201).json({ ...doc, file_url });
    } catch (err) {
        console.error('POST /documents/upload error:', err);
        res.status(500).json({ error: 'Erreur lors de l\'upload du document' });
    }
});

// DELETE /api/documents/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const [doc] = await db
            .select({ file_url: documents.file_url, client_id: documents.client_id })
            .from(documents)
            .where(eq(documents.id, req.params.id))
            .limit(1);

        if (!doc) {
            res.status(404).json({ error: 'Document introuvable' });
            return;
        }

        await db.delete(documents).where(eq(documents.id, req.params.id));

        // Try to delete the physical file
        if (doc.file_url && doc.file_url.startsWith('/uploads/')) {
            const filePath = path.join(UPLOADS_DIR, doc.file_url.replace('/uploads/', ''));
            fs.unlink(filePath, (err) => {
                if (err) console.error('File deletion error:', err.message);
            });
        }

        res.json({ success: true });
    } catch (err) {
        console.error('DELETE /documents/:id error:', err);
        res.status(500).json({ error: 'Erreur lors de la suppression du document' });
    }
});

export default router;
