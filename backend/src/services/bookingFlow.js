import { getDb } from '../db.js';
import { v4 as uuid } from 'uuid';

export function createBooking({ businessId, leadId, conversationId, service, preferredDate, preferredTime, notes }) {
  const db = getDb();
  const id = uuid();
  db.prepare(`
    INSERT INTO bookings (id, business_id, lead_id, conversation_id, service, preferred_date, preferred_time, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, businessId, leadId, conversationId, service, preferredDate || null, preferredTime || null, notes || null);

  // Update lead status
  db.prepare('UPDATE leads SET status = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .run('booked', leadId);

  return { id, businessId, leadId, conversationId, service };
}

export function getBookingsByBusiness(businessId, limit = 50) {
  const db = getDb();
  return db.prepare(`
    SELECT b.*, l.name as lead_name, l.phone as lead_phone, l.email as lead_email
    FROM bookings b
    LEFT JOIN leads l ON l.id = b.lead_id
    WHERE b.business_id = ?
    ORDER BY b.created_at DESC
    LIMIT ?
  `).all(businessId, limit);
}

export function updateBookingStatus(id, status) {
  const db = getDb();
  db.prepare('UPDATE bookings SET status = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .run(status, id);
  return { id, status };
}