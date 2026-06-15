import { getDb } from '../db.js';
import { getBookingsByBusiness, updateBookingStatus } from '../services/bookingFlow.js';

export default async function bookingsRoutes(fastify) {
  // Get bookings for a business
  fastify.get('/api/businesses/:businessId/bookings', async (req, reply) => {
    const { status, limit = 50 } = req.query;
    const db = getDb();
    let query = `
      SELECT b.*, l.name as lead_name, l.phone as lead_phone, l.email as lead_email
      FROM bookings b
      LEFT JOIN leads l ON l.id = b.lead_id
      WHERE b.business_id = ?
    `;
    const params = [req.params.businessId];

    if (status) {
      query += ` AND b.status = ?`;
      params.push(status);
    }
    query += ` ORDER BY b.created_at DESC LIMIT ?`;
    params.push(parseInt(limit));

    const bookings = db.prepare(query).all(...params);
    return reply.send(bookings);
  });

  // Update booking status
  fastify.patch('/api/bookings/:id', async (req, reply) => {
    const { status } = req.body || {};
    if (!status || !['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
      return reply.code(400).send({ error: 'Valid status required (pending, confirmed, cancelled, completed)' });
    }
    const db = getDb();
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    if (!booking) {
      return reply.code(404).send({ error: 'Booking not found' });
    }
    const result = updateBookingStatus(req.params.id, status);
    return reply.send(result);
  });
}