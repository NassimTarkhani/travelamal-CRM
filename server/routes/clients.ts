import { Router, Response } from 'express';
import { eq, desc, ilike, or, and, gte, lte, sql } from 'drizzle-orm';
import { db } from '.js';
import { clients, profiles, activities } from '.js';
import { authenticate, requireAdmin, AuthRequest } from '.js';
import { alias } from 'drizzle-orm/pg-core';

const router = Router();

const computeClient = (c: any) => ({
    ...c,
    total_amount: Number(c.total_amount || 0),
    amount_paid: Number(c.amount_paid || 0),
    refund_amount: Number(c.refund_amount || 0),
    amount_remaining: Number(c.total_amount || 0) - Number(c.amount_paid || 0),
    payment_status:
        Number(c.amount_paid || 0) >= Number(c.total_amount || 0) && Number(c.total_amount || 0) > 0
            ? 'Complet'
            : Number(c.amount_paid || 0) > 0
                ? 'Partiel'
                : 'Non payé',
});

// GET /api/clients
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { search, service, status, employee, startDate, endDate } = req.query as Record<string, string>;

        const responsibleProfile = alias(profiles, 'responsible_profile');

        let query = db
            .select({
                id: clients.id,
                full_name: clients.full_name,
                sequential_number: clients.sequential_number,
                service: clients.service,
                status: clients.status,
                total_amount: clients.total_amount,
                amount_paid: clients.amount_paid,
                refund_amount: clients.refund_amount,
                created_at: clients.created_at,
                responsible_employee: clients.responsible_employee,
                phone_primary: clients.phone_primary,
                email: clients.email,
                responsible_employee_name: responsibleProfile.name,
            })
            .from(clients)
            .leftJoin(responsibleProfile, eq(clients.responsible_employee, responsibleProfile.id))
            .orderBy(desc(clients.created_at));

        const conditions: any[] = [];

        if (search) {
            conditions.push(
                or(
                    ilike(clients.full_name, `%${search}%`),
                    ilike(clients.phone_primary, `%${search}%`),
                    ilike(clients.email, `%${search}%`)
                )
            );
        }
        if (service && service !== 'all') conditions.push(eq(clients.service, service));
        if (status && status !== 'all') conditions.push(eq(clients.status, status));
        if (employee && employee !== 'all') conditions.push(eq(clients.responsible_employee, employee));
        if (startDate) conditions.push(gte(clients.created_at, new Date(`${startDate}T00:00:00`)));
        if (endDate) conditions.push(lte(clients.created_at, new Date(`${endDate}T23:59:59`)));

        const result = conditions.length
            ? await query.where(and(...conditions))
            : await query;

        res.json(
            result.map((c) => ({
                ...computeClient(c),
                responsible_employee: c.responsible_employee_name
                    ? { name: c.responsible_employee_name }
                    : null,
            }))
        );
    } catch (err) {
        console.error('GET /clients error:', err);
        res.status(500).json({ error: 'Erreur lors de la récupération des clients' });
    }
});

// GET /api/clients/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const responsibleProfile = alias(profiles, 'responsible_profile');

        const [client] = await db
            .select({
                id: clients.id,
                full_name: clients.full_name,
                sequential_number: clients.sequential_number,
                profession: clients.profession,
                marital_status: clients.marital_status,
                id_card_number: clients.id_card_number,
                phone_primary: clients.phone_primary,
                phone_secondary: clients.phone_secondary,
                email: clients.email,
                birth_date: clients.birth_date,
                nationality: clients.nationality,
                address_street: clients.address_street,
                address_city: clients.address_city,
                address_governorate: clients.address_governorate,
                folder_opening_date: clients.folder_opening_date,
                passport_number: clients.passport_number,
                passport_expiry: clients.passport_expiry,
                passport_alert_done: clients.passport_alert_done,
                b3_expiry: clients.b3_expiry,
                b3_alert_done: clients.b3_alert_done,
                embassy_registration_date: clients.embassy_registration_date,
                travel_alert_done: clients.travel_alert_done,
                service: clients.service,
                color_tag: clients.color_tag,
                status: clients.status,
                total_amount: clients.total_amount,
                amount_paid: clients.amount_paid,
                refund_amount: clients.refund_amount,
                payment_method: clients.payment_method,
                appointment_date: clients.appointment_date,
                travel_date: clients.travel_date,
                notes: clients.notes,
                created_at: clients.created_at,
                created_by: clients.created_by,
                responsible_employee: clients.responsible_employee,
                responsible_employee_name: responsibleProfile.name,
            })
            .from(clients)
            .leftJoin(responsibleProfile, eq(clients.responsible_employee, responsibleProfile.id))
            .where(eq(clients.id, req.params.id))
            .limit(1);

        if (!client) {
            res.status(404).json({ error: 'Client introuvable' });
            return;
        }

        res.json({
            ...computeClient(client),
            responsible_employee: client.responsible_employee_name
                ? { name: client.responsible_employee_name }
                : null,
        });
    } catch (err) {
        console.error('GET /clients/:id error:', err);
        res.status(500).json({ error: 'Erreur lors de la récupération du client' });
    }
});

// POST /api/clients
// Fields that are timestamp (not date) columns — must be Date objects for Drizzle
const TIMESTAMP_FIELDS = ['appointment_date'] as const;

const toDate = (v: any) => (v && typeof v === 'string' ? new Date(v) : v);

const sanitizeClientBody = (body: Record<string, any>) => {
    const sanitized: Record<string, any> = {};
    for (const [k, v] of Object.entries(body)) {
        const val = v === '' ? null : v;
        sanitized[k] = TIMESTAMP_FIELDS.includes(k as any) ? (val ? toDate(val) : null) : val;
    }
    return sanitized;
};

router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { amount_remaining, payment_status, sequential_number, ...body } = req.body;

        const sanitized = sanitizeClientBody(body);
        sanitized.created_by = sanitized.created_by || req.user!.id;
        if (!sanitized.folder_opening_date) {
            sanitized.folder_opening_date = new Date().toISOString().split('T')[0];
        }

        const [created] = await db.insert(clients).values(sanitized as any).returning({ id: clients.id });

        // Log activity
        db.insert(activities)
            .values({
                client_id: created.id,
                action_type: 'Création',
                description: `Nouveau dossier créé par ${req.user!.name || req.user!.email}`,
                performed_by: req.user!.id,
            })
            .catch((e) => console.error('Activity log error:', e));

        res.status(201).json({ id: created.id });
    } catch (err) {
        console.error('POST /clients error:', err);
        res.status(500).json({ error: 'Erreur lors de la création du client' });
    }
});

// PUT /api/clients/:id
router.put('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { amount_remaining, payment_status, sequential_number, id, created_at, ...body } = req.body;

        const sanitized = sanitizeClientBody(body);

        await db.update(clients).set(sanitized as any).where(eq(clients.id, req.params.id));

        // Log activity
        db.insert(activities)
            .values({
                client_id: req.params.id,
                action_type: 'Modification',
                description: `Dossier mis à jour par ${req.user!.name || req.user!.email}`,
                performed_by: req.user!.id,
            })
            .catch((e) => console.error('Activity log error:', e));

        res.json({ success: true });
    } catch (err) {
        console.error('PUT /clients/:id error:', err);
        res.status(500).json({ error: 'Erreur lors de la mise à jour du client' });
    }
});

// DELETE /api/clients/:id (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        await db.delete(clients).where(eq(clients.id, req.params.id));
        res.json({ success: true });
    } catch (err) {
        console.error('DELETE /clients/:id error:', err);
        res.status(500).json({ error: 'Erreur lors de la suppression du client' });
    }
});

export default router;
