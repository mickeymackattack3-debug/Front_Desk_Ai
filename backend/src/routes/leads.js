import { getDb } from '../db.js';

export default async function leadsRoutes(fastify) {
  // Get all leads for a business
  fastify.get('/api/businesses/:businessId/leads', async (req, reply) => {
    const db = getDb();
    const { status, limit = 50 } = req.query;
    let query = `SELECT * FROM leads WHERE business_id = ?`;
    const params = [req.params.businessId];

    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }
    query += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(parseInt(limit));

    const leads = db.prepare(query).all(...params);
    return reply.send(leads);
  });

  // Get a single lead with full info
  fastify.get('/api/leads/:id', async (req, reply) => {
    const db = getDb();
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
    if (!lead) {
      return reply.code(404).send({ error: 'Lead not found' });
    }
    // Also get conversations
    lead.conversations = db.prepare(
      'SELECT * FROM conversations WHERE lead_id = ? ORDER BY started_at DESC'
    ).all(req.params.id);
    // And bookings
    lead.bookings = db.prepare(
      'SELECT * FROM bookings WHERE lead_id = ? ORDER BY created_at DESC'
    ).all(req.params.id);
    return reply.send(lead);
  });

  // Update lead status
  fastify.patch('/api/leads/:id', async (req, reply) => {
    const db = getDb();
    const { status, notes } = req.body || {};
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
    if (!lead) {
      return reply.code(404).send({ error: 'Lead not found' });
    }
    const updates = [];
    const params = [];
    if (status) { updates.push('status = ?'); params.push(status); }
    if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      params.push(req.params.id);
      db.prepare(`UPDATE leads SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }
    return reply.send(db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id));
  });
}