import { Router, Response } from 'express';
import { eq, desc } from 'drizzle-orm';
import { db } from '.js';
import { activities, profiles, clients } from '.js';
import { authenticate, AuthRequest } from '.js';
import { alias } from 'drizzle-orm/pg-core';

const router = Router();

// GET /api/activities
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { performed_by, action_type } = req.query as Record<string, string>;

        const performerAlias = alias(profiles, 'performer_info');
        const clientAlias = alias(clients, 'client_info');

        let query = db
            .select({
                id: activities.id,
                client_id: activities.client_id,
                action_type: activities.action_type,
                description: activities.description,
                performed_by: activities.performed_by,
                action_date: activities.action_date,
                performer_name: performerAlias.name,
                client_name: clientAlias.full_name,
                client_sequential: clientAlias.sequential_number,
            })
            .from(activities)
            .leftJoin(performerAlias, eq(activities.performed_by, performerAlias.id))
            .leftJoin(clientAlias, eq(activities.client_id, clientAlias.id))
            .orderBy(desc(activities.action_date));

        const conditions: any[] = [];
        if (performed_by && performed_by !== 'all') {
            conditions.push(eq(activities.performed_by, performed_by));
        }
        if (action_type && action_type !== 'all') {
            conditions.push(eq(activities.action_type, action_type));
        }

        const result = conditions.length ? await query.where(...conditions) : await (query as any).limit(100);

        res.json(
            result.map((a) => ({
                ...a,
                performer: a.performer_name ? { name: a.performer_name } : null,
                client: a.client_name ? { full_name: a.client_name, sequential_number: a.client_sequential } : null,
            }))
        );
    } catch (err) {
        console.error('GET /activities error:', err);
        res.status(500).json({ error: 'Erreur lors de la récupération des activités' });
    }
});

// GET /api/activities/client/:clientId
router.get('/client/:clientId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const performerAlias = alias(profiles, 'performer_info');

        const result = await db
            .select({
                id: activities.id,
                client_id: activities.client_id,
                action_type: activities.action_type,
                description: activities.description,
                performed_by: activities.performed_by,
                action_date: activities.action_date,
                performer_name: performerAlias.name,
            })
            .from(activities)
            .leftJoin(performerAlias, eq(activities.performed_by, performerAlias.id))
            .where(eq(activities.client_id, req.params.clientId))
            .orderBy(desc(activities.action_date));

        res.json(
            result.map((a) => ({
                ...a,
                profiles: a.performer_name ? { name: a.performer_name } : null,
            }))
        );
    } catch (err) {
        console.error('GET /activities/client error:', err);
        res.status(500).json({ error: 'Erreur lors de la récupération des activités' });
    }
});

// POST /api/activities
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { client_id, action_type, description } = req.body;

        if (!description) {
            res.status(400).json({ error: 'Description requise' });
            return;
        }

        const [activity] = await db
            .insert(activities)
            .values({
                client_id: client_id || null,
                action_type: action_type || 'Modification',
                description,
                performed_by: req.user!.id,
            })
            .returning();

        res.status(201).json(activity);
    } catch (err) {
        console.error('POST /activities error:', err);
        res.status(500).json({ error: 'Erreur lors de la création de l\'activité' });
    }
});

export default router;
