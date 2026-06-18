import React, { useState, useEffect } from 'react';

const STEPS = ['Business Info', 'Services', 'AI Settings', 'Confirmation', 'Done'];
const INDUSTRIES = [
  { value: 'plumbing', label: 'Plumbing', emoji: '🔧', services: ['Drain cleaning', 'Pipe repair', 'Water heater install', 'Leak detection', 'Fixture installation'] },
  { value: 'hvac', label: 'HVAC', emoji: '❄️', services: ['AC repair', 'Heating repair', 'Installation', 'Maintenance', 'Duct cleaning'] },
  { value: 'barbershop', label: 'Barbershop', emoji: '💈', services: ['Haircut', 'Beard trim', 'Hot towel shave', 'Hair styling', 'Kids haircut'] },
  { value: 'salon', label: 'Salon', emoji: '💇', services: ['Haircut & style', 'Color', 'Highlights', 'Blowout', 'Treatment'] },
  { value: 'cafe', label: 'Cafe / Restaurant', emoji: '☕', services: ['Dine-in', 'Takeout', 'Catering', 'Private events', 'Delivery'] },
  { value: 'gym', label: 'Gym / Fitness', emoji: '💪', services: ['Day pass', 'Membership', 'Personal training', 'Classes', 'Nutrition plan'] },
  { value: 'other', label: 'Other', emoji: '📋', services: ['Custom service'] }
];
const TONE_OPTIONS = [
  { value: 'friendly', label: '😊 Friendly & Casual', desc: 'Warm, conversational, uses emojis' },
  { value: 'professional', label: '💼 Professional & Polished', desc: 'Polite, formal, business-like' }
];
const LEAD_FIELDS = [
  { key: 'name', label: 'Name', default: true },
  { key: 'phone', label: 'Phone Number', default: true },
  { key: 'email', label: 'Email', default: false },
  { key: 'service', label: 'Service Needed', default: true },
  { key: 'location', label: 'Location / Address', default: false },
  { key: 'timeline', label: 'Timeline', default: false }
];
const SAVE_KEY = 'fdai_wizard_progress';

function generateSlug(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function SetupWizard({ onComplete }) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [createdBiz, setCreatedBiz] = useState(null);
  const [savedToast, setSavedToast] = useState(false);

  const [form, setForm] = useState(() => {
    // Try to restore from localStorage
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      name: '',
      slug: '',
      email: '',
      phone: '',
      address: '',
      industry: '',
      hours: DAYS.reduce((acc, d) => ({ ...acc, [d]: { open: '09:00', close: '17:00', closed: false } }), {}),
      services: [{ name: '', price: '' }],
      greeting: 'Hi! Welcome to {name}. 👋 How can I help you today?',
      tone: 'friendly',
      leadFields: LEAD_FIELDS.filter(f => f.default).map(f => f.key),
      autoResponse: true,
      bookingEnabled: true
    };
  });

  // Save progress to localStorage
  useEffect(() => {
    if (createdBiz) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(form));
    } catch {}
  }, [form, createdBiz]);

  function update(field, value) {
    setForm(f => {
      const next = { ...f, [field]: value };
      if (field === 'name') {
        next.slug = generateSlug(value);
      }
      if (field === 'industry') {
        const ind = INDUSTRIES.find(i => i.value === value);
        if (ind && f.services.length === 1 && !f.services[0].name) {
          next.services = ind.services.map(s => ({ name: s, price: '' }));
        }
      }
      return next;
    });
    setError('');
  }

  function updateService(i, field, value) {
    setForm(f => {
      const services = [...f.services];
      services[i] = { ...services[i], [field]: value };
      return { ...f, services };
    });
  }

  function addService() {
    setForm(f => ({ ...f, services: [...f.services, { name: '', price: '' }] }));
  }

  function removeService(i) {
    if (form.services.length <= 1) return;
    setForm(f => ({ ...f, services: f.services.filter((_, idx) => idx !== i) }));
  }

  function updateHour(day, field, value) {
    setForm(f => ({ ...f, hours: { ...f.hours, [day]: { ...f.hours[day], [field]: value } } }));
  }

  function toggleLeadField(key) {
    setForm(f => {
      const fields = f.leadFields.includes(key)
        ? f.leadFields.filter(k => k !== key)
        : [...f.leadFields, key];
      return { ...f, leadFields: fields };
    });
  }

  function clearProgress() {
    try { localStorage.removeItem(SAVE_KEY); } catch {}
  }

  function validateStep(s) {
    switch (s) {
      case 0: // Business Info
        if (!form.name) return 'Business name is required';
        if (!form.slug) return 'URL slug is required';
        if (!form.industry) return 'Please select an industry';
        return null;
      case 1: // Services
        const valid = form.services.filter(s => s.name.trim());
        if (valid.length === 0) return 'Add at least one service';
        return null;
      default:
        return null;
    }
  }

  function handleNext() {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError('');
    setStep(step + 1);
  }

  function handleBack() {
    setError('');
    setStep(step - 1);
  }

  async function handleCreate() {
    const err = validateStep(0) || validateStep(1);
    if (err) { setError(err); return; }

    const serviceCategories = form.services.filter(s => s.name.trim()).map(s => s.name.trim());
    const servicePricing = form.services.filter(s => s.name.trim()).reduce((acc, s) => {
      acc[s.name.trim()] = s.price || null;
      return acc;
    }, {});

    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          email: form.email || null,
          phone: form.phone || null,
          address: form.address || null,
          industry: form.industry,
          serviceCategories,
          settings: {
            booking_enabled: form.bookingEnabled,
            auto_response: form.autoResponse,
            greeting: form.greeting,
            tone: form.tone,
            lead_fields: form.leadFields,
            business_hours: form.hours
          }
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create business');
      }
      const biz = await res.json();
      setCreatedBiz(biz);
      clearProgress();
      setStep(4);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function handleSave() {
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  }

  // Done step
  if (createdBiz) {
    const origin = window.location.origin;
    const embedCode = `<script src="${origin}/widget/widget.js"
  data-fdai-business-id="${createdBiz.id}"
  data-fdai-api-url="${origin}"
  data-fdai-color="#4F46E5"
  data-fdai-title="Chat with ${createdBiz.name}"
  data-fdai-subtitle="We reply in minutes"
  data-fdai-position="right"></script>`;

    const inlineEmbed = embedCode.replace(/\n\s{2}/g, ' ');

    return (
      <div style={pageStyles.container}>
        <div style={pageStyles.card}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 56, marginBottom: 8 }}>🎉</div>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4, color: '#111827' }}>Your AI Assistant is Live!</h2>
            <p style={{ color: '#6b7280' }}>{createdBiz.name} is ready to capture leads 24/7.</p>
          </div>

          <div style={pageStyles.summaryBox}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 14 }}>
              <div><strong>Business:</strong> {createdBiz.name}</div>
              <div><strong>Industry:</strong> {INDUSTRIES.find(i => i.value === form.industry)?.label || form.industry}</div>
              <div><strong>Services:</strong> {createdBiz.serviceCategories.length}</div>
              <div><strong>Assistant Tone:</strong> {TONE_OPTIONS.find(t => t.value === form.tone)?.label?.split(' ').slice(1).join(' ') || form.tone}</div>
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>📋 Step 1: Add to Your Website</h3>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>Copy this script and paste it just before the closing <code>{'</body>'}</code> tag on your website:</p>
            <pre style={pageStyles.codeBlock}>{embedCode}</pre>
            <button onClick={() => navigator.clipboard.writeText(inlineEmbed)} style={pageStyles.copyBtn}>
              📋 Copy Embed Code
            </button>
          </div>

          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>📱 Step 2: Preview</h3>
            <p style={{ fontSize: 13, color: '#6b7280' }}>Open your website to see the chat widget in action, or visit the dashboard to view captured leads.</p>
          </div>

          <button onClick={() => onComplete && onComplete(createdBiz)} style={pageStyles.primaryBtn}>
            Go to Dashboard →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyles.container}>
      <div style={pageStyles.card}>
        {/* Progress bar */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 14,
                  backgroundColor: i <= step ? '#4F46E5' : '#e5e7eb',
                  color: i <= step ? 'white' : '#9ca3af',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 600,
                  cursor: i < step ? 'pointer' : 'default'
                }} onClick={() => i < step && setStep(i)}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: 11, color: i <= step ? '#4F46E5' : '#9ca3af', fontWeight: i === step ? 600 : 400, display: 'none' }}>
                  {s}
                </span>
              </div>
            ))}
          </div>
          <div style={{
            height: 4, background: '#e5e7eb', borderRadius: 2, position: 'relative'
          }}>
            <div style={{
              height: 4, background: '#4F46E5', borderRadius: 2, width: `${((step) / (STEPS.length - 1)) * 100}%`,
              transition: 'width 0.3s'
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            {STEPS.map((s, i) => (
              <span key={i} style={{
                fontSize: 11, color: i <= step ? '#4F46E5' : '#9ca3af',
                fontWeight: i === step ? 600 : 400
              }}>{s}</span>
            ))}
          </div>
        </div>

        {savedToast && (
          <div style={{ background: '#d1fae5', color: '#065f46', padding: '8px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13, textAlign: 'center' }}>
            ✅ Progress saved
          </div>
        )}

        {error && <div style={pageStyles.error}>{error}</div>}

        {/* Step 0: Business Info */}
        {step === 0 && (
          <div>
            <h2 style={pageStyles.h2}>🏪 Business Info</h2>
            <p style={{ color: '#6b7280', marginBottom: 20, fontSize: 14 }}>Tell us about your business so we can customize your AI assistant.</p>

            <div style={pageStyles.fieldGroup}>
              <label style={pageStyles.label}>Business Name *</label>
              <input style={pageStyles.input} value={form.name} onChange={e => update('name', e.target.value)} placeholder="e.g. Joe's Plumbing" />
            </div>

            <div style={pageStyles.fieldGroup}>
              <label style={pageStyles.label}>Industry *</label>
              <select style={pageStyles.input} value={form.industry} onChange={e => update('industry', e.target.value)}>
                <option value="">Select your industry...</option>
                {INDUSTRIES.map(ind => (
                  <option key={ind.value} value={ind.value}>{ind.emoji} {ind.label}</option>
                ))}
              </select>
            </div>

            <div style={pageStyles.row}>
              <div style={{ flex: 1 }}>
                <label style={pageStyles.label}>Email</label>
                <input style={pageStyles.input} value={form.email} onChange={e => update('email', e.target.value)} placeholder="joe@example.com" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={pageStyles.label}>Phone</label>
                <input style={pageStyles.input} value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="555-0100" />
              </div>
            </div>

            <div style={pageStyles.fieldGroup}>
              <label style={pageStyles.label}>Address</label>
              <input style={pageStyles.input} value={form.address} onChange={e => update('address', e.target.value)} placeholder="123 Main St, Springfield" />
            </div>

            <div style={pageStyles.fieldGroup}>
              <label style={pageStyles.label}>Business Hours</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {DAYS.map(day => (
                  <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 32, fontSize: 13, fontWeight: 500 }}>{day}</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
                      <input type="checkbox" checked={form.hours[day]?.closed || false}
                        onChange={e => updateHour(day, 'closed', e.target.checked)} />
                      Closed
                    </label>
                    {!form.hours[day]?.closed && (
                      <>
                        <input type="time" value={form.hours[day]?.open || '09:00'}
                          onChange={e => updateHour(day, 'open', e.target.value)}
                          style={{ ...pageStyles.input, width: 100, padding: '4px 8px' }} />
                        <span style={{ fontSize: 12, color: '#9ca3af' }}>to</span>
                        <input type="time" value={form.hours[day]?.close || '17:00'}
                          onChange={e => updateHour(day, 'close', e.target.value)}
                          style={{ ...pageStyles.input, width: 100, padding: '4px 8px' }} />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={pageStyles.fieldGroup}>
              <label style={pageStyles.label}>URL Slug</label>
              <input style={pageStyles.input} value={form.slug} onChange={e => update('slug', e.target.value)} />
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Your dashboard URL: /dashboard/businesses/{form.slug || 'your-slug'}</div>
            </div>

            <div style={pageStyles.actions}>
              <span />
              <button onClick={handleNext} style={pageStyles.primaryBtn}>Next: Services →</button>
            </div>
          </div>
        )}

        {/* Step 1: Services */}
        {step === 1 && (
          <div>
            <h2 style={pageStyles.h2}>🔧 Your Services</h2>
            <p style={{ color: '#6b7280', marginBottom: 20, fontSize: 14 }}>
              {form.industry ? `We pre-filled common services for ${INDUSTRIES.find(i => i.value === form.industry)?.label}. ` : ''}
              Add, edit, or remove services and optionally set pricing.
            </p>
            {form.services.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#9ca3af', width: 20 }}>{i + 1}.</span>
                <input style={{ ...pageStyles.input, flex: 2 }} value={s.name}
                  onChange={e => updateService(i, 'name', e.target.value)} placeholder="Service name" />
                <input style={{ ...pageStyles.input, width: 120 }} value={s.price}
                  onChange={e => updateService(i, 'price', e.target.value)} placeholder="Price (optional)" />
                {form.services.length > 1 && (
                  <button onClick={() => removeService(i)} style={pageStyles.iconBtn}>✕</button>
                )}
              </div>
            ))}
            <button onClick={addService} style={pageStyles.addBtn}>+ Add Service</button>
            <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>Prices are for display only. Your AI assistant will use service names to qualify leads.</p>
            <div style={pageStyles.actions}>
              <button onClick={handleBack} style={pageStyles.secondaryBtn}>Back</button>
              <button onClick={handleNext} style={pageStyles.primaryBtn}>Next: AI Settings →</button>
            </div>
          </div>
        )}

        {/* Step 2: AI Settings */}
        {step === 2 && (
          <div>
            <h2 style={pageStyles.h2}>🤖 AI Settings</h2>
            <p style={{ color: '#6b7280', marginBottom: 20, fontSize: 14 }}>Configure how your AI assistant talks to visitors.</p>

            <div style={pageStyles.fieldGroup}>
              <label style={pageStyles.label}>Response Tone</label>
              <div style={{ display: 'flex', gap: 12 }}>
                {TONE_OPTIONS.map(t => (
                  <label key={t.value} style={{
                    flex: 1, padding: 12, borderRadius: 8, border: `2px solid ${form.tone === t.value ? '#4F46E5' : '#e5e7eb'}`,
                    cursor: 'pointer', textAlign: 'center'
                  }}>
                    <input type="radio" name="tone" value={t.value} checked={form.tone === t.value}
                      onChange={e => update('tone', e.target.value)} style={{ display: 'none' }} />
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{t.label}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{t.desc}</div>
                  </label>
                ))}
              </div>
            </div>

            <div style={pageStyles.fieldGroup}>
              <label style={pageStyles.label}>Greeting Message</label>
              <textarea style={{ ...pageStyles.input, minHeight: 70, resize: 'vertical' }}
                value={form.greeting} onChange={e => update('greeting', e.target.value)} />
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Use {'{name}'} to insert your business name.</div>
            </div>

            <div style={pageStyles.fieldGroup}>
              <label style={pageStyles.label}>Lead Capture Fields</label>
              <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>Select which info the AI should ask visitors for:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {LEAD_FIELDS.map(f => (
                  <label key={f.key} style={{
                    padding: '6px 12px', borderRadius: 20, border: `1px solid ${form.leadFields.includes(f.key) ? '#4F46E5' : '#d1d5db'}`,
                    background: form.leadFields.includes(f.key) ? '#eef2ff' : 'white',
                    cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6
                  }}>
                    <input type="checkbox" checked={form.leadFields.includes(f.key)}
                      onChange={() => toggleLeadField(f.key)} style={{ accentColor: '#4F46E5' }} />
                    {f.label}
                  </label>
                ))}
              </div>
            </div>

            <div style={pageStyles.toggleGroup}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>Auto-respond to visitors</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Reply instantly 24/7</div>
              </div>
              <label style={pageStyles.toggle}>
                <input type="checkbox" checked={form.autoResponse} onChange={e => update('autoResponse', e.target.checked)} />
                <span style={pageStyles.toggleSlider}></span>
              </label>
            </div>
            <div style={pageStyles.toggleGroup}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>Accept bookings via chat</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Let customers book directly</div>
              </div>
              <label style={pageStyles.toggle}>
                <input type="checkbox" checked={form.bookingEnabled} onChange={e => update('bookingEnabled', e.target.checked)} />
                <span style={pageStyles.toggleSlider}></span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={handleSave} style={pageStyles.saveBtn}>💾 Save Progress</button>
            </div>

            <div style={pageStyles.actions}>
              <button onClick={handleBack} style={pageStyles.secondaryBtn}>Back</button>
              <button onClick={handleNext} style={pageStyles.primaryBtn}>Next: Review →</button>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <div>
            <h2 style={pageStyles.h2}>✅ Confirm & Launch</h2>
            <p style={{ color: '#6b7280', marginBottom: 20, fontSize: 14 }}>Review your settings before launching.</p>

            <div style={pageStyles.summaryBox}>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>{form.name}</div>
              <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
                <tbody>
                  <tr><td style={{ padding: '4px 8px', color: '#6b7280', width: 120 }}>Industry</td><td style={{ padding: '4px 8px' }}>{INDUSTRIES.find(i => i.value === form.industry)?.emoji} {INDUSTRIES.find(i => i.value === form.industry)?.label}</td></tr>
                  <tr><td style={{ padding: '4px 8px', color: '#6b7280' }}>Contact</td><td style={{ padding: '4px 8px' }}>{form.email || '—'} / {form.phone || '—'}</td></tr>
                  <tr><td style={{ padding: '4px 8px', color: '#6b7280' }}>Services</td><td style={{ padding: '4px 8px' }}>{form.services.filter(s => s.name.trim()).length} services</td></tr>
                  <tr><td style={{ padding: '4px 8px', color: '#6b7280' }}>Tone</td><td style={{ padding: '4px 8px' }}>{TONE_OPTIONS.find(t => t.value === form.tone)?.label}</td></tr>
                  <tr><td style={{ padding: '4px 8px', color: '#6b7280' }}>Lead Fields</td><td style={{ padding: '4px 8px' }}>{form.leadFields.length} fields</td></tr>
                  <tr><td style={{ padding: '4px 8px', color: '#6b7280' }}>Hours</td><td style={{ padding: '4px 8px' }}>{DAYS.filter(d => !form.hours[d].closed).length} days open</td></tr>
                </tbody>
              </table>
            </div>

            <div style={pageStyles.actions}>
              <button onClick={handleBack} style={pageStyles.secondaryBtn}>Back</button>
              <button onClick={handleCreate} disabled={saving} style={pageStyles.primaryBtn}>
                {saving ? 'Creating...' : '🚀 Generate Embed Code'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const pageStyles = {
  container: {
    display: 'flex', justifyContent: 'center', padding: '40px 16px',
    minHeight: 'calc(100vh - 56px)',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  card: {
    background: 'white', borderRadius: 16, padding: 32,
    width: '100%', maxWidth: 620,
    boxShadow: '0 4px 24px rgba(0,0,0,0.1)'
  },
  h2: { fontSize: 22, fontWeight: 700, color: '#111827', marginBottom: 4 },
  error: {
    background: '#fee2e2', color: '#dc2626', padding: '12px 16px',
    borderRadius: 8, marginBottom: 16, fontSize: 14
  },
  fieldGroup: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 },
  input: {
    width: '100%', padding: '10px 14px', border: '1px solid #d1d5db',
    borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit'
  },
  row: { display: 'flex', gap: 12, marginBottom: 16 },
  actions: { display: 'flex', justifyContent: 'space-between', marginTop: 24 },
  primaryBtn: {
    background: '#4F46E5', color: 'white', border: 'none',
    padding: '12px 24px', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer'
  },
  secondaryBtn: {
    background: 'none', color: '#6b7280', border: '1px solid #d1d5db',
    padding: '12px 24px', borderRadius: 8, fontSize: 14, cursor: 'pointer'
  },
  addBtn: {
    background: 'none', color: '#4F46E5', border: '1px dashed #d1d5db',
    padding: '8px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer', width: '100%', marginTop: 4
  },
  iconBtn: {
    background: 'none', border: '1px solid #d1d5db', borderRadius: 8,
    cursor: 'pointer', width: 40, color: '#9ca3af', flexShrink: 0
  },
  toggleGroup: {
    display: 'flex', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid #e5e7eb'
  },
  toggle: { position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' },
  toggleSlider: {
    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#d1d5db', borderRadius: 12, transition: '0.2s'
  },
  summaryBox: {
    background: '#f9fafb', borderRadius: 12, padding: 20, marginBottom: 24
  },
  codeBlock: {
    background: '#1f2937', color: '#e5e7eb', padding: 16, borderRadius: 8,
    fontSize: 12, overflowX: 'auto', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-all'
  },
  copyBtn: {
    background: '#374151', color: 'white', border: 'none',
    padding: '10px 20px', borderRadius: 8, fontSize: 14, cursor: 'pointer', marginTop: 12
  },
  saveBtn: {
    background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db',
    padding: '10px 20px', borderRadius: 8, fontSize: 14, cursor: 'pointer'
  }
};