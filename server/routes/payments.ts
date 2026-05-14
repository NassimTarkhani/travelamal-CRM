import { Router, Response } from 'express';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';
import { db } from '.js';
import { payments, clients, profiles, activities } from '.js';
import { authenticate, requireAdmin, AuthRequest } from '.js';
import { alias } from 'drizzle-orm/pg-core';

const router = Router();

// GET /api/payments  - all payments history
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const clientAlias = alias(clients, 'client_info');
        const recorderAlias = alias(profiles, 'recorder_info');

        const result = await db
            .select({
                id: payments.id,
                client_id: payments.client_id,
                amount: payments.amount,
                payment_date: payments.payment_date,
                method: payments.method,
                recorded_by: payments.recorded_by,
                is_deleted: payments.is_deleted,
                created_at: payments.created_at,
                client_name: clientAlias.full_name,
                recorder_name: recorderAlias.name,
            })
            .from(payments)
            .leftJoin(clientAlias, eq(payments.client_id, clientAlias.id))
            .leftJoin(recorderAlias, eq(payments.recorded_by, recorderAlias.id))
            .where(eq(payments.is_deleted, false))
            .orderBy(desc(payments.payment_date));

        res.json(
            result.map((p) => ({
                ...p,
                amount: Number(p.amount),
                client: p.client_name ? { full_name: p.client_name } : null,
                recorder: p.recorder_name ? { name: p.recorder_name } : null,
            }))
        );
    } catch (err) {
        console.error('GET /payments error:', err);
        res.status(500).json({ error: 'Erreur lors de la récupération des paiements' });
    }
});

// GET /api/payments/client/:clientId
router.get('/client/:clientId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const recorderAlias = alias(profiles, 'recorder_info');

        const result = await db
            .select({
                id: payments.id,
                client_id: payments.client_id,
                amount: payments.amount,
                payment_date: payments.payment_date,
                method: payments.method,
                recorded_by: payments.recorded_by,
                is_deleted: payments.is_deleted,
                created_at: payments.created_at,
                recorder_name: recorderAlias.name,
            })
            .from(payments)
            .leftJoin(recorderAlias, eq(payments.recorded_by, recorderAlias.id))
            .where(and(eq(payments.client_id, req.params.clientId), eq(payments.is_deleted, false)))
            .orderBy(desc(payments.payment_date));

        res.json(
            result.map((p) => ({
                ...p,
                amount: Number(p.amount),
                profiles: p.recorder_name ? { name: p.recorder_name } : null,
            }))
        );
    } catch (err) {
        console.error('GET /payments/client/:clientId error:', err);
        res.status(500).json({ error: 'Erreur lors de la récupération des paiements' });
    }
});

// GET /api/payments/stats/employees
router.get('/stats/employees', authenticate, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const recorderAlias = alias(profiles, 'recorder_info');

        const result = await db
            .select({
                amount: payments.amount,
                recorded_by: payments.recorded_by,
                recorder_name: recorderAlias.name,
            })
            .from(payments)
            .leftJoin(recorderAlias, eq(payments.recorded_by, recorderAlias.id))
            .where(eq(payments.is_deleted, false));

        const stats: Record<string, { name: string; count: number; total: number }> = {};
        result.forEach((p) => {
            const id = p.recorded_by || 'unknown';
            const name = p.recorder_name || 'Inconnu';
            if (!stats[id]) stats[id] = { name, count: 0, total: 0 };
            stats[id].count += 1;
            stats[id].total += Number(p.amount || 0);
        });

        res.json(Object.values(stats).sort((a, b) => b.total - a.total));
    } catch (err) {
        res.status(500).json({ error: 'Erreur stats employés' });
    }
});

// POST /api/payments
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { client_id, amount, payment_date, method } = req.body;

        if (!client_id || !amount) {
            res.status(400).json({ error: 'client_id et amount sont requis' });
            return;
        }

        const [payment] = await db
            .insert(payments)
            .values({
                client_id,
                amount: String(amount),
                payment_date: payment_date || new Date().toISOString().split('T')[0],
                method,
                recorded_by: req.user!.id,
            })
            .returning();

        // Increment client amount_paid
        await db
            .update(clients)
            .set({ amount_paid: sql`amount_paid + ${String(amount)}` })
            .where(eq(clients.id, client_id));

        // Log activity
        db.insert(activities)
            .values({
                client_id,
                action_type: 'Paiement',
                description: `Paiement de ${Number(amount).toFixed(3)} TND enregistré par ${req.user!.name || req.user!.email}`,
                performed_by: req.user!.id,
            })
            .catch((e) => console.error('Activity log error:', e));

        res.status(201).json({ ...payment, amount: Number(payment.amount) });
    } catch (err) {
        console.error('POST /payments error:', err);
        res.status(500).json({ error: 'Erreur lors de l\'enregistrement du paiement' });
    }
});

// PATCH /api/payments/:id/delete  (soft delete)
router.patch('/:id/delete', authenticate, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const [payment] = await db
            .select({ amount: payments.amount, client_id: payments.client_id })
            .from(payments)
            .where(eq(payments.id, req.params.id))
            .limit(1);

        if (!payment) {
            res.status(404).json({ error: 'Paiement introuvable' });
            return;
        }

        await db.update(payments).set({ is_deleted: true }).where(eq(payments.id, req.params.id));

        // Decrement client amount_paid
        await db
            .update(clients)
            .set({ amount_paid: sql`GREATEST(0, amount_paid - ${String(payment.amount)})` })
            .where(eq(clients.id, payment.client_id!));

        res.json({ success: true });
    } catch (err) {
        console.error('PATCH /payments/:id/delete error:', err);
        res.status(500).json({ error: 'Erreur lors de la suppression du paiement' });
    }
});

// POST /api/payments/increment (legacy RPC replacement)
router.post('/increment', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { p_client_id, p_amount } = req.body;
        await db
            .update(clients)
            .set({ amount_paid: sql`amount_paid + ${String(p_amount)}` })
            .where(eq(clients.id, p_client_id));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Erreur incrément paiement' });
    }
});

export default router;
