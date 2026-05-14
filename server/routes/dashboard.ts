import { Router, Response } from 'express';
import { eq, desc, gte, lte, and } from 'drizzle-orm';
import { db } from '.js';
import { clients, payments, expenses, profiles, activities } from '.js';
import { authenticate, AuthRequest } from '.js';
import { alias } from 'drizzle-orm/pg-core';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';

const router = Router();

// GET /api/dashboard/stats
router.get('/stats', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const allClients = await db
            .select({ id: clients.id, status: clients.status, amount_paid: clients.amount_paid, created_at: clients.created_at })
            .from(clients);

        const monthlyTotal = allClients.reduce((sum, c) => {
            const isThisMonth = new Date(c.created_at!) >= firstDayOfMonth;
            return isThisMonth ? sum + Number(c.amount_paid || 0) : sum;
        }, 0);

        const activeDossiers = allClients.filter((c) => c.status === 'En cours').length;

        res.json({
            totalClients: allClients.length,
            activeDossiers,
            monthlyTotal,
            activeAlerts: 0,
        });
    } catch (err) {
        console.error('GET /dashboard/stats error:', err);
        res.status(500).json({ error: 'Erreur stats tableau de bord' });
    }
});

// GET /api/dashboard/recent-clients
router.get('/recent-clients', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
        const creatorAlias = alias(profiles, 'creator_info');

        const result = await db
            .select({
                id: clients.id,
                full_name: clients.full_name,
                service: clients.service,
                sequential_number: clients.sequential_number,
                created_at: clients.created_at,
                created_by: clients.created_by,
                creator_name: creatorAlias.name,
            })
            .from(clients)
            .leftJoin(creatorAlias, eq(clients.created_by, creatorAlias.id))
            .orderBy(desc(clients.created_at))
            .limit(5);

        res.json(
            result.map((c) => ({
                ...c,
                creator: c.creator_name ? { name: c.creator_name } : null,
            }))
        );
    } catch (err) {
        res.status(500).json({ error: 'Erreur clients récents' });
    }
});

// GET /api/dashboard/payments-chart
router.get('/payments-chart', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
        const months = Array.from({ length: 6 }, (_, i) => {
            const date = subMonths(new Date(), 5 - i);
            return {
                month: format(date, 'MMM', { locale: fr }),
                start: startOfMonth(date),
                end: endOfMonth(date),
            };
        });

        const results = await Promise.all(
            months.map(async (m) => {
                const rows = await db
                    .select({ amount: payments.amount })
                    .from(payments)
                    .where(
                        and(
                            eq(payments.is_deleted, false),
                            gte(payments.payment_date, m.start.toISOString().split('T')[0]),
                            lte(payments.payment_date, m.end.toISOString().split('T')[0])
                        )
                    );
                const total = rows.reduce((sum, p) => sum + Number(p.amount || 0), 0);
                return { name: m.month, total };
            })
        );

        res.json(results);
    } catch (err) {
        res.status(500).json({ error: 'Erreur graphique paiements' });
    }
});

// GET /api/dashboard/services-chart
router.get('/services-chart', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
        const allClients = await db.select({ service: clients.service }).from(clients);

        const counts: Record<string, number> = {};
        allClients.forEach((c) => {
            const s = c.service || 'Autres';
            counts[s] = (counts[s] || 0) + 1;
        });

        res.json(Object.entries(counts).map(([name, value]) => ({ name, value })));
    } catch (err) {
        res.status(500).json({ error: 'Erreur graphique services' });
    }
});

// GET /api/dashboard/employees-chart
router.get('/employees-chart', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
        const recorderAlias = alias(profiles, 'recorder_info');

        const rows = await db
            .select({
                amount: payments.amount,
                recorded_by: payments.recorded_by,
                recorder_name: recorderAlias.name,
            })
            .from(payments)
            .leftJoin(recorderAlias, eq(payments.recorded_by, recorderAlias.id))
            .where(eq(payments.is_deleted, false));

        const counts: Record<string, { name: string; total: number }> = {};
        rows.forEach((p) => {
            const id = p.recorded_by || 'unknown';
            const name = p.recorder_name || 'Inconnu';
            if (!counts[id]) counts[id] = { name, total: 0 };
            counts[id].total += Number(p.amount || 0);
        });

        res.json(Object.values(counts).sort((a, b) => b.total - a.total).slice(0, 5));
    } catch (err) {
        res.status(500).json({ error: 'Erreur graphique employés' });
    }
});

// GET /api/statistics
router.get('/statistics', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
        const [allClients, allPayments, allExpenses] = await Promise.all([
            db.select({ service: clients.service, total_amount: clients.total_amount, amount_paid: clients.amount_paid, created_at: clients.created_at }).from(clients),
            db.select({ amount: payments.amount, payment_date: payments.payment_date, created_at: payments.created_at }).from(payments).where(eq(payments.is_deleted, false)),
            db.select({ amount: expenses.amount, created_at: expenses.created_at }).from(expenses),
        ]);

        res.json({
            clients: allClients.map((c) => ({ ...c, total_amount: Number(c.total_amount), amount_paid: Number(c.amount_paid) })),
            payments: allPayments.map((p) => ({ ...p, amount: Number(p.amount) })),
            expenses: allExpenses.map((e) => ({ ...e, amount: Number(e.amount) })),
        });
    } catch (err) {
        res.status(500).json({ error: 'Erreur statistiques' });
    }
});

export default router;
