// Conversation state machine — qualifies leads and guides toward booking
// States: greeting -> collect_name -> collect_service -> collect_timeline ->
//         collect_location -> collect_contact -> confirm_booking -> booked

const CONVERSATION_FLOW = [
  'greeting',
  'collect_name',
  'collect_service',
  'collect_timeline',
  'collect_location',
  'collect_contact',
  'confirm_booking',
  'booked'
];

export function getInitialState() {
  return 'greeting';
}

export function getNextState(currentState) {
  const idx = CONVERSATION_FLOW.indexOf(currentState);
  if (idx === -1 || idx >= CONVERSATION_FLOW.length - 1) return null;
  return CONVERSATION_FLOW[idx + 1];
}

export function getSystemPrompt(business, conversationState) {
  const categories = JSON.parse(business.service_categories || '[]');
  const services = categories.length > 0
    ? categories.join(', ')
    : 'various services';

  return `You are a friendly AI sales assistant for ${business.name}. Your goal is to qualify leads and convert them into bookings.

Available services: ${services}

Conversation flow:
1. Greet warmly and ask how you can help
2. Ask for their name
3. Ask which service they need
4. Ask when they need it (timeline)
5. Ask where the service is needed (location)
6. Ask for their phone/email to confirm
7. Confirm the booking details
8. Thank them and confirm the booking

ALWAYS be conversational and natural. Don't sound like a robot. Keep responses concise.
Ask ONE question at a time. Don't overwhelm the visitor.

Current conversation stage: ${conversationState || 'greeting'}`;
}

export function extractLeadInfo(messages) {
  // Only look at visitor messages to extract lead info
  const fullText = messages.filter(m => m.role === 'visitor').map(m => m.content).join('\n');
  const lead = {};

  // Simple regex-based extraction
  const nameMatch = fullText.match(/my name is ([A-Za-z ]+)/i) ||
                    fullText.match(/i['']m ([A-Za-z ]+)/i) ||
                    fullText.match(/name['']s ([A-Za-z ]+)/i);
  if (nameMatch) lead.name = nameMatch[1].trim();

  const phoneMatch = fullText.match(/(\+?1?[\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4})/);
  if (phoneMatch) lead.phone = phoneMatch[1].trim();

  const emailMatch = fullText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) lead.email = emailMatch[0].trim();

  // Service extraction - look for known service keywords
  const serviceKeywords = ['plumbing', 'plumber', 'drain', 'water heater', 'pipe', 'leak',
    'hvac', 'heating', 'cooling', 'ac', 'electrical', 'electrician', 'roofing', 'roof',
    'cleaning', 'haircut', 'barber', 'salon', 'massage', 'fitness', 'gym', 'repair']; // extendable
  for (const kw of serviceKeywords) {
    if (fullText.toLowerCase().includes(kw)) {
      lead.service = kw.charAt(0).toUpperCase() + kw.slice(1);
      break;
    }
  }

  return lead;
}

export function determineStageFromMessages(messages) {
  const assistantMessages = messages.filter(m => m.role === 'assistant');
  const visitorMessages = messages.filter(m => m.role === 'visitor');

  // Simple heuristic: track how many exchanges have happened
  const visitorCount = visitorMessages.length;

  if (visitorCount === 0) return 'greeting';
  if (visitorCount === 1) return 'collect_name';
  if (visitorCount === 2) return 'collect_service';
  if (visitorCount === 3) return 'collect_timeline';
  if (visitorCount === 4) return 'collect_location';
  if (visitorCount === 5) return 'collect_contact';
  if (visitorCount >= 6) return 'confirm_booking';

  return 'greeting';
}

// Lead qualification score (0-100)
export function calculateLeadScore(lead) {
  let score = 0;
  if (lead.name) score += 20;
  if (lead.phone) score += 25;
  if (lead.email) score += 20;
  if (lead.service) score += 20;
  if (lead.timeline) score += 15;
  if (lead.location) score += 10;
  // Bonus for having both name AND contact
  if (lead.name && (lead.phone || lead.email)) score += 10;
  return Math.min(score, 100);
}