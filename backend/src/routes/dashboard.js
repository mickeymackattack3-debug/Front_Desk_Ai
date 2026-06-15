import { getDb } from '../db.js';

export default async function dashboardRoutes(fastify) {
  // Get dashboard stats for a business
  fastify.get('/api/businesses/:businessId/stats', async (req, reply) => {
    const db = getDb();
    const { businessId } = req.params;

    const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(businessId);
    if (!business) {
      return reply.code(404).send({ error: 'Business not found' });
    }

    const totalConversations = db.prepare(
      'SELECT COUNT(*) as count FROM conversations WHERE business_id = ?'
    ).get(businessId);

    const activeConversations = db.prepare(
      "SELECT COUNT(*) as count FROM conversations WHERE business_id = ? AND status = 'active'"
    ).get(businessId);

    const totalLeads = db.prepare(
      'SELECT COUNT(*) as count FROM leads WHERE business_id = ?'
    ).get(businessId);

    const qualifiedLeads = db.prepare(
      "SELECT COUNT(*) as count FROM leads WHERE business_id = ? AND status IN ('qualified', 'booked', 'converted')"
    ).get(businessId);

    const totalBookings = db.prepare(
      'SELECT COUNT(*) as count FROM bookings WHERE business_id = ?'
    ).get(businessId);

    const recentConversations = db.prepare(
      'SELECT c.*, (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message FROM conversations c WHERE c.business_id = ? ORDER BY c.updated_at DESC LIMIT 10'
    ).all(businessId);

    const recentLeads = db.prepare(
      'SELECT * FROM leads WHERE business_id = ? ORDER BY created_at DESC LIMIT 10'
    ).all(businessId);

    // Lead score distribution
    const leadScores = db.prepare(`
      SELECT 
        CASE 
          WHEN name IS NOT NULL AND (phone IS NOT NULL OR email IS NOT NULL) AND service IS NOT NULL THEN 'high'
          WHEN name IS NOT NULL AND (phone IS NOT NULL OR email IS NOT NULL) THEN 'medium'
          ELSE 'low'
        END as tier,
        COUNT(*) as count
      FROM leads 
      WHERE business_id = ?
      GROUP BY tier
    `).all(businessId);

    return reply.send({
      business: {
        id: business.id,
        name: business.name,
        slug: business.slug,
        serviceCategories: JSON.parse(business.service_categories || '[]'),
        settings: JSON.parse(business.settings || '{}')
      },
      stats: {
        totalConversations: totalConversations.count,
        activeConversations: activeConversations.count,
        totalLeads: totalLeads.count,
        qualifiedLeads: qualifiedLeads.count,
        totalBookings: totalBookings.count,
        conversionRate: totalConversations.count > 0
          ? Math.round((totalBookings.count / totalConversations.count) * 100)
          : 0
      },
      leadScores,
      recentConversations,
      recentLeads
    });
  });

  // Get all businesses (for dashboard landing)
  fastify.get('/api/businesses', async (req, reply) => {
    const db = getDb();
    const businesses = db.prepare('SELECT id, name, slug, email, phone, created_at FROM businesses ORDER BY name ASC').all();
    return reply.send(businesses);
  });
}