import { getDb } from '../db.js';
import { v4 as uuid } from 'uuid';

export default async function businessesRoutes(fastify) {
  // Create a new business (onboarding)
  fastify.post('/api/businesses', async (req, reply) => {
    const { name, slug, email, phone, address, serviceCategories, settings } = req.body || {};

    if (!name || !slug) {
      return reply.code(400).send({ error: 'Business name and slug are required' });
    }

    const db = getDb();

    // Check slug uniqueness
    const existing = db.prepare('SELECT id FROM businesses WHERE slug = ?').get(slug);
    if (existing) {
      return reply.code(409).send({ error: 'A business with this slug already exists' });
    }

    const id = uuid();
    db.prepare(`
      INSERT INTO businesses (id, name, slug, email, phone, address, service_categories, settings)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      name,
      slug,
      email || null,
      phone || null,
      address || null,
      JSON.stringify(serviceCategories || []),
      JSON.stringify(settings || { booking_enabled: true, auto_response: true })
    );

    const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(id);
    return reply.code(201).send({
      id: business.id,
      name: business.name,
      slug: business.slug,
      email: business.email,
      phone: business.phone,
      address: business.address,
      serviceCategories: JSON.parse(business.service_categories || '[]'),
      settings: JSON.parse(business.settings || '{}'),
      createdAt: business.created_at
    });
  });

  // Get a single business by ID
  fastify.get('/api/businesses/:id', async (req, reply) => {
    const db = getDb();
    const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(req.params.id);
    if (!business) {
      return reply.code(404).send({ error: 'Business not found' });
    }
    return reply.send({
      id: business.id,
      name: business.name,
      slug: business.slug,
      email: business.email,
      phone: business.phone,
      address: business.address,
      serviceCategories: JSON.parse(business.service_categories || '[]'),
      settings: JSON.parse(business.settings || '{}'),
      businessHours: JSON.parse(business.business_hours || '{}'),
      createdAt: business.created_at
    });
  });

  // Update a business
  fastify.patch('/api/businesses/:id', async (req, reply) => {
    const db = getDb();
    const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(req.params.id);
    if (!business) {
      return reply.code(404).send({ error: 'Business not found' });
    }

    const { name, slug, email, phone, address, serviceCategories, settings, businessHours } = req.body || {};
    const updates = [];
    const params = [];

    if (name) { updates.push('name = ?'); params.push(name); }
    if (slug) { updates.push('slug = ?'); params.push(slug); }
    if (email !== undefined) { updates.push('email = ?'); params.push(email); }
    if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
    if (address !== undefined) { updates.push('address = ?'); params.push(address); }
    if (serviceCategories) { updates.push('service_categories = ?'); params.push(JSON.stringify(serviceCategories)); }
    if (settings) { updates.push('settings = ?'); params.push(JSON.stringify(settings)); }
    if (businessHours) { updates.push('business_hours = ?'); params.push(JSON.stringify(businessHours)); }

    if (updates.length > 0) {
      params.push(req.params.id);
      db.prepare(`UPDATE businesses SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    const updated = db.prepare('SELECT * FROM businesses WHERE id = ?').get(req.params.id);
    return reply.send({
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      email: updated.email,
      phone: updated.phone,
      address: updated.address,
      serviceCategories: JSON.parse(updated.service_categories || '[]'),
      settings: JSON.parse(updated.settings || '{}'),
      businessHours: JSON.parse(updated.business_hours || '{}'),
      createdAt: updated.created_at
    });
  });
}