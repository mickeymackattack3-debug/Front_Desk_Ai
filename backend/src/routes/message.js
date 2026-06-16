import { getDb } from '../db.js';
import { v4 as uuid } from 'uuid';
import { getSystemPrompt, determineStageFromMessages, extractLeadInfo, calculateLeadScore } from '../services/conversation.js';
import { createBooking } from '../services/bookingFlow.js';

// Simple deterministic response generator (no external LLM dependency needed for MVP)
function generateResponse(conversation, business) {
  const messages = conversation.messages || [];
  const stage = determineStageFromMessages(messages);
  const visitorMsgs = messages.filter(m => m.role === 'visitor');
  const lastVisitorMsg = visitorMsgs.length > 0 ? visitorMsgs[visitorMsgs.length - 1]?.content : '';
  const leadInfo = extractLeadInfo(messages);

  // Build a contextual reply based on the stage
  const bizName = business.name || 'our team';
  const services = JSON.parse(business.service_categories || '[]');

  const greetings = [
    `Hi! Welcome to ${bizName}. 👋 How can I help you today?`,
    `Hello! Thanks for reaching out to ${bizName}. What can we do for you?`,
    `Hey there! ${bizName} here — how can we assist you today?`
  ];

  const serviceQs = [
    `Great, ${leadInfo.name || 'there'}! What service are you looking for? We offer: ${services.join(', ')}.`,
    `Awesome! Which service do you need? We handle ${services.join(', ')}.`,
    `Perfect! Are you looking for any of these: ${services.join(', ')}?`
  ];

  const timelineQs = [
    `When do you need this done? Are you looking for something ASAP or planning ahead?`,
    `Got it! What's your timeline — is this urgent or scheduled?`,
    `What timeframe are you thinking? This week or sometime in the future?`
  ];

  const locationQs = [
    `Where is the service needed? Please share your address or general location.`,
    `Great — and what's the location for the service?`,
    `What area or address is this for?`
  ];

  const contactQs = [
    `Almost done! What's the best phone number or email to confirm with you?`,
    `Could you share your contact info (phone or email) so we can confirm the booking?`,
    `Last thing — what's the best way to reach you? Phone or email?`
  ];

  const confirmMsgs = [
    `Perfect! Let me confirm: ${leadInfo.name ? `**Name:** ${leadInfo.name}` : ''} ${leadInfo.service ? `\n**Service:** ${leadInfo.service}` : ''} ${leadInfo.location ? `\n**Location:** ${leadInfo.location}` : ''} ${leadInfo.timeline ? `\n**Timeline:** ${leadInfo.timeline}` : ''} ${leadInfo.phone ? `\n**Contact:** ${leadInfo.phone}` : leadInfo.email ? `\n**Contact:** ${leadInfo.email}` : ''}\n\nDoes everything look good? I'll create the booking right away!`,
    `Let me summarize what we have:\n${leadInfo.name ? `• Name: ${leadInfo.name}\n` : ''}${leadInfo.service ? `• Service: ${leadInfo.service}\n` : ''}${leadInfo.location ? `• Location: ${leadInfo.location}\n` : ''}${leadInfo.timeline ? `• Timeline: ${leadInfo.timeline}\n` : ''}${leadInfo.phone ? `• Contact: ${leadInfo.phone}\n` : leadInfo.email ? `• Contact: ${leadInfo.email}\n` : ''}\nShall I go ahead and book this for you?`
  ];

  const bookedMsgs = [
    `🎉 **Booking confirmed!** We'll be in touch shortly to finalize the details. Feel free to reach out anytime if you need anything else.`,
    `Wonderful! Your booking is all set. ✅ Someone from ${bizName} will confirm with you soon!`,
    `Perfect, you're booked! 📅 Keep an eye out for a confirmation message. Thanks for choosing ${bizName}!`
  ];

  switch (stage) {
    case 'greeting':
      return greetings[Math.floor(Math.random() * greetings.length)];

    case 'collect_name':
      return `Nice to meet you! I'm the ${bizName} AI assistant. What's your name?`;

    case 'collect_service':
      if (leadInfo.service) {
        return `${leadInfo.service} — great choice! Tell me a bit more about what you need.`;
      }
      return serviceQs[Math.floor(Math.random() * serviceQs.length)];

    case 'collect_timeline': {
      // Detect if the last message mentions a service
      const servicesLower = services.map(s => s.toLowerCase());
      const mentionedService = servicesLower.find(s => lastVisitorMsg.toLowerCase().includes(s));
      if (mentionedService) {
        return timelineQs[Math.floor(Math.random() * timelineQs.length)];
      }
      return timelineQs[Math.floor(Math.random() * timelineQs.length)];
    }

    case 'collect_location':
      return locationQs[Math.floor(Math.random() * locationQs.length)];

    case 'collect_contact':
      return contactQs[Math.floor(Math.random() * contactQs.length)];

    case 'confirm_booking':
      return confirmMsgs[Math.floor(Math.random() * confirmMsgs.length)];

    case 'booked':
      return bookedMsgs[Math.floor(Math.random() * bookedMsgs.length)];

    default:
      return `Is there anything else you'd like help with?`;
  }
}

export default async function messageRoutes(fastify) {
  // Send a message in a conversation
  fastify.post('/api/message', async (req, reply) => {
    const { conversationId, businessId, content } = req.body || {};

    if (!businessId || !content) {
      return reply.code(400).send({ error: 'businessId and content are required' });
    }

    const db = getDb();

    // Look up the business
    const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(businessId);
    if (!business) {
      return reply.code(404).send({ error: 'Business not found' });
    }

    // Find or create conversation
    let convId = conversationId;
    let conversation;

    if (convId) {
      conversation = db.prepare('SELECT * FROM conversations WHERE id = ?').get(convId);
    }

    if (!conversation) {
      convId = uuid();
      db.prepare(`
        INSERT INTO conversations (id, business_id, status, channel)
        VALUES (?, ?, 'active', 'web')
      `).run(convId, businessId);
      conversation = db.prepare('SELECT * FROM conversations WHERE id = ?').get(convId);
    }

    // Save the visitor message
    db.prepare(`
      INSERT INTO messages (id, conversation_id, role, content)
      VALUES (?, ?, 'visitor', ?)
    `).run(uuid(), convId, content);

    // Update conversation timestamp
    db.prepare('UPDATE conversations SET updated_at = datetime(\'now\') WHERE id = ?').run(convId);

    // Get all messages for context
    const messages = db.prepare(
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC'
    ).all(convId);

    // Generate response
    const assistantContent = generateResponse({ id: convId, messages }, business);

    // Save assistant response
    const assistantMsgId = uuid();
    db.prepare(`
      INSERT INTO messages (id, conversation_id, role, content)
      VALUES (?, ?, 'assistant', ?)
    `).run(assistantMsgId, convId, assistantContent);

    // Extract lead info from conversation
    const leadInfo = extractLeadInfo(messages);
    if (leadInfo.name || leadInfo.phone || leadInfo.email) {
      // Check if a lead already exists for this conversation
      const existingLead = db.prepare(
        'SELECT * FROM leads WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1'
      ).get(convId);

      if (existingLead) {
        // Update existing lead
        const updates = [];
        const params = [];
        if (leadInfo.name) { updates.push('name = ?'); params.push(leadInfo.name); }
        if (leadInfo.phone) { updates.push('phone = ?'); params.push(leadInfo.phone); }
        if (leadInfo.email) { updates.push('email = ?'); params.push(leadInfo.email); }
        if (leadInfo.service) { updates.push('service = ?'); params.push(leadInfo.service); }
        if (updates.length > 0) {
          updates.push('updated_at = datetime(\'now\')');
          const score = calculateLeadScore({ ...existingLead, ...leadInfo });
          updates.push('status = CASE WHEN ? > 50 THEN \'qualified\' ELSE status END');
          params.push(score);
          params.push(existingLead.id);
          db.prepare(`UPDATE leads SET ${updates.join(', ')} WHERE id = ?`).run(...params);
        }
      } else if (leadInfo.name) {
        const leadId = uuid();
        db.prepare(`
          INSERT INTO leads (id, business_id, conversation_id, name, phone, email, service, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(leadId, businessId, convId, leadInfo.name || null, leadInfo.phone || null,
          leadInfo.email || null, leadInfo.service || null, 'new');

        // Auto-qualify if we have enough info
        const score = calculateLeadScore(leadInfo);
        if (score > 50) {
          db.prepare("UPDATE leads SET status = 'qualified', updated_at = datetime('now') WHERE id = ?")
            .run(leadId);
        }

        db.prepare('UPDATE conversations SET lead_id = ? WHERE id = ?').run(leadId, convId);

        // Check if we should create a booking (if we have enough info)
        if (leadInfo.name && leadInfo.phone && leadInfo.service) {
          // Only when visitor confirms at booking stage
          const stage = determineStageFromMessages(messages);
          if (stage === 'booked' || content.toLowerCase().includes('yes') || content.toLowerCase().includes('confirm')) {
            try {
              const booking = createBooking({
                businessId,
                leadId,
                conversationId: convId,
                service: leadInfo.service,
                notes: `Auto-created from chat: ${leadInfo.location || ''} ${leadInfo.timeline || ''}`
              });
              db.prepare('UPDATE conversations SET status = ? WHERE id = ?').run('completed', convId);
            } catch (e) {
              // Booking creation failed silently — lead capture still works
            }
          }
        }
      }
    }

    return reply.send({
      id: assistantMsgId,
      conversationId: convId,
      content: assistantContent,
      role: 'assistant',
      createdAt: new Date().toISOString()
    });
  });

  // Get conversation history
  fastify.get('/api/conversations/:id/messages', async (req, reply) => {
    const db = getDb();
    const messages = db.prepare(
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC'
    ).all(req.params.id);
    return reply.send(messages);
  });

  // Create a new conversation (initialize)
  fastify.post('/api/conversations', async (req, reply) => {
    const { businessId } = req.body || {};
    if (!businessId) {
      return reply.code(400).send({ error: 'businessId is required' });
    }
    const db = getDb();
    const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(businessId);
    if (!business) {
      return reply.code(404).send({ error: 'Business not found' });
    }

    const convId = uuid();
    db.prepare(`
      INSERT INTO conversations (id, business_id, status, channel)
      VALUES (?, ?, 'active', 'web')
    `).run(convId, businessId);

    // Generate greeting
    const greeting = generateResponse({ id: convId, messages: [] }, business);
    const msgId = uuid();
    db.prepare(`
      INSERT INTO messages (id, conversation_id, role, content)
      VALUES (?, ?, 'assistant', ?)
    `).run(msgId, convId, greeting);

    return reply.send({
      conversationId: convId,
      greeting,
      business: { name: business.name, services: JSON.parse(business.service_categories || '[]') }
    });
  });
}