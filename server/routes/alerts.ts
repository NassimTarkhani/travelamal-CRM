import { Router, Response } from 'express';
import { eq, or, and, lte } from 'drizzle-orm';
import { db } from '.js';
import { clients } from '.js';
import { authenticate, AuthRequest } from '.js';
import { addDays, format } from 'date-fns';

const router = Router();

// GET /api/alerts
router.get('/', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
        const today = new Date();
        const alertThreshold = addDays(today, 45);
        const travelThreshold = addDays(today, 7);

        const result = await db
            .select({
                id: clients.id,
                full_name: clients.full_name,
                phone_primary: clients.phone_primary,
                passport_expiry: clients.passport_expiry,
                b3_expiry: clients.b3_expiry,
                travel_date: clients.travel_date,
                passport_alert_done: clients.passport_alert_done,
                b3_alert_done: clients.b3_alert_done,
                travel_alert_done: clients.travel_alert_done,
            })
            .from(clients)
            .where(
                or(
                    and(eq(clients.passport_alert_done, false), lte(clients.passport_expiry, format(alertThreshold, 'yyyy-MM-dd'))),
                    and(eq(clients.b3_alert_done, false), lte(clients.b3_expiry, format(alertThreshold, 'yyyy-MM-dd'))),
                    and(eq(clients.travel_alert_done, false), lte(clients.travel_date, format(travelThreshold, 'yyyy-MM-dd')))
                )
            );

        res.json(result);
    } catch (err) {
        console.error('GET /alerts error:', err);
        res.status(500).json({ error: 'Erreur lors de la récupération des alertes' });
    }
});

// PATCH /api/alerts/:clientId
router.patch('/:clientId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { type, done } = req.body;
        const field =
            type === 'passport'
                ? 'passport_alert_done'
                : type === 'b3'
                    ? 'b3_alert_done'
                    : 'travel_alert_done';

        await db
            .update(clients)
            .set({ [field]: Boolean(done) } as any)
            .where(eq(clients.id, req.params.clientId));

        res.json({ success: true });
    } catch (err) {
        console.error('PATCH /alerts/:clientId error:', err);
        res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'alerte' });
    }
});

export default router;
