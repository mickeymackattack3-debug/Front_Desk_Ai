import React, { useState } from 'react';

const STEPS = ['Welcome', 'Business Info', 'Services', 'Settings', 'Embed'];

export default function SetupWizard({ onComplete }) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [createdBiz, setCreatedBiz] = useState(null);

  const [form, setForm] = useState({
    name: '',
    slug: '',
    email: '',
    phone: '',
    address: '',
    services: ['', ''],
    greeting: 'Hi! Welcome to {name}. 👋 How can I help you today?',
    autoResponse: true,
    bookingEnabled: true
  });

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }));
    // Auto-generate slug from name
    if (field === 'name') {
      setForm(f => ({ ...f, slug: value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }));
    }
  }

  function updateService(i, value) {
    const services = [...form.services];
    services[i] = value;
    setForm(f => ({ ...f, services }));
  }

  function addService() {
    setForm(f => ({ ...f, services: [...f.services, ''] }));
  }

  function removeService(i) {
    if (form.services.length <= 1) return;
    setForm(f => ({ ...f, services: f.services.filter((_, idx) => idx !== i) }));
  }

  async function handleCreate() {
    setError('');
    if (!form.name) { setError('Business name is required'); return; }
    if (!form.slug) { setError('Slug is required'); return; }

    const serviceCategories = form.services.filter(s => s.trim());
    if (serviceCategories.length === 0) { setError('Add at least one service'); return; }

    setSaving(true);
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
          serviceCategories,
          settings: {
            booking_enabled: form.bookingEnabled,
            auto_response: form.autoResponse
          }
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create business');
      }
      const biz = await res.json();
      setCreatedBiz(biz);
      setStep(4); // Jump to embed step
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (createdBiz && step === 4) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
            <h2 style={{ ...styles.h2, marginBottom: 4 }}>You're all set!</h2>
            <p style={{ color: '#6b7280' }}>Your AI assistant is ready to capture leads.</p>
          </div>

          <div style={styles.summaryBox}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{createdBiz.name}</div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>
              Services: {createdBiz.serviceCategories.join(', ')}
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>📋 Embed on Your Website</h3>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
              Add this script to your website to start capturing leads:
            </p>
            <pre style={styles.codeBlock}>
{`<script src="${window.location.origin}/widget/widget.js"
  data-fdai-business-id="${createdBiz.id}"
  data-fdai-api-url="${window.location.origin}"
  data-fdai-color="#4F46E5"
  data-fdai-title="Chat with ${createdBiz.name}"
  data-fdai-subtitle="We reply in minutes"
  data-fdai-position="right"></script>`}
            </pre>
            <button
              onClick={() => navigator.clipboard.writeText(
                `<script src="${window.location.origin}/widget/widget.js" data-fdai-business-id="${createdBiz.id}" data-fdai-api-url="${window.location.origin}" data-fdai-color="#4F46E5" data-fdai-title="Chat with ${createdBiz.name}" data-fdai-subtitle="We reply in minutes" data-fdai-position="right"></script>`
              )}
              style={styles.copyBtn}
            >
              📋 Copy Embed Code
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => onComplete && onComplete(createdBiz)} style={styles.primaryBtn}>
              Go to Dashboard →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Progress bar */}
        <div style={styles.progressContainer}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div style={{
                ...styles.stepDot,
                backgroundColor: i <= step ? '#4F46E5' : '#e5e7eb',
                color: i <= step ? 'white' : '#9ca3af'
              }}>
                {i + 1}
              </div>
              <span style={{
                fontSize: 11,
                color: i <= step ? '#4F46E5' : '#9ca3af',
                fontWeight: i === step ? 600 : 400,
                marginLeft: 6
              }}>{s}</span>
              {i < STEPS.length - 1 && (
                <div style={{
                  flex: 1, height: 2,
                  backgroundColor: i < step ? '#4F46E5' : '#e5e7eb',
                  margin: '0 8px'
                }} />
              )}
            </div>
          ))}
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {/* Step 0: Welcome */}
        {step === 0 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🤖</div>
              <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: '#111827' }}>
                Welcome to FrontDesk AI
              </h1>
              <p style={{ color: '#6b7280', maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>
                Set up your AI sales assistant in under 2 minutes.
                It'll capture leads, answer questions, and book appointments — 24/7.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              {[
                { icon: '💬', text: 'Chat widget for your website' },
                { icon: '📋', text: 'Auto-capture leads & contacts' },
                { icon: '📅', text: 'Book appointments instantly' },
                { icon: '📊', text: 'Dashboard with real-time stats' }
              ].map((f, i) => (
                <div key={i} style={styles.featureCard}>
                  <div style={{ fontSize: 28, marginBottom: 4 }}>{f.icon}</div>
                  <div style={{ fontSize: 13, color: '#374151' }}>{f.text}</div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <button onClick={() => setStep(1)} style={styles.primaryBtn}>
                Get Started →
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Business Info */}
        {step === 1 && (
          <div>
            <h2 style={styles.h2}>🏪 Business Info</h2>
            <p style={{ color: '#6b7280', marginBottom: 20, fontSize: 14 }}>
              Tell us about your business so we can customize your AI assistant.
            </p>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Business Name *</label>
              <input
                style={styles.input}
                value={form.name}
                onChange={e => update('name', e.target.value)}
                placeholder="e.g. Joe's Plumbing"
              />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>URL Slug *</label>
              <input
                style={styles.input}
                value={form.slug}
                onChange={e => update('slug', e.target.value)}
                placeholder="e.g. joes-plumbing"
              />
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                Used for your dashboard URL: /dashboard/businesses/{form.slug || 'your-slug'}
              </div>
            </div>
            <div style={styles.row}>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Email</label>
                <input
                  style={styles.input}
                  value={form.email}
                  onChange={e => update('email', e.target.value)}
                  placeholder="joe@example.com"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Phone</label>
                <input
                  style={styles.input}
                  value={form.phone}
                  onChange={e => update('phone', e.target.value)}
                  placeholder="555-0100"
                />
              </div>
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Address</label>
              <input
                style={styles.input}
                value={form.address}
                onChange={e => update('address', e.target.value)}
                placeholder="123 Main St, Springfield"
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
              <button onClick={() => setStep(0)} style={styles.secondaryBtn}>Back</button>
              <button onClick={() => setStep(2)} style={styles.primaryBtn}>Next: Services →</button>
            </div>
          </div>
        )}

        {/* Step 2: Services */}
        {step === 2 && (
          <div>
            <h2 style={styles.h2}>🔧 Your Services</h2>
            <p style={{ color: '#6b7280', marginBottom: 20, fontSize: 14 }}>
              What services do you offer? Your AI assistant will use these to answer customer questions.
            </p>
            {form.services.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  style={{ ...styles.input, flex: 1 }}
                  value={s}
                  onChange={e => updateService(i, e.target.value)}
                  placeholder={`Service ${i + 1} (e.g. Plumbing repair)`}
                />
                {form.services.length > 1 && (
                  <button onClick={() => removeService(i)} style={styles.iconBtn}>✕</button>
                )}
              </div>
            ))}
            <button onClick={addService} style={styles.addBtn}>
              + Add Another Service
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
              <button onClick={() => setStep(1)} style={styles.secondaryBtn}>Back</button>
              <button onClick={() => setStep(3)} style={styles.primaryBtn}>Next: Settings →</button>
            </div>
          </div>
        )}

        {/* Step 3: Settings */}
        {step === 3 && (
          <div>
            <h2 style={styles.h2}>⚙️ Assistant Settings</h2>
            <p style={{ color: '#6b7280', marginBottom: 20, fontSize: 14 }}>
              Configure how your AI assistant behaves.
            </p>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Greeting Message</label>
              <textarea
                style={{ ...styles.input, minHeight: 80, resize: 'vertical' }}
                value={form.greeting}
                onChange={e => update('greeting', e.target.value)}
              />
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                Use {'{name}'} to insert your business name automatically.
              </div>
            </div>
            <div style={styles.toggleGroup}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>Auto-respond to visitors</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Reply instantly to messages 24/7</div>
              </div>
              <label style={styles.toggle}>
                <input
                  type="checkbox"
                  checked={form.autoResponse}
                  onChange={e => update('autoResponse', e.target.checked)}
                />
                <span style={styles.toggleSlider}></span>
              </label>
            </div>
            <div style={styles.toggleGroup}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>Accept bookings via chat</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Let customers book appointments directly</div>
              </div>
              <label style={styles.toggle}>
                <input
                  type="checkbox"
                  checked={form.bookingEnabled}
                  onChange={e => update('bookingEnabled', e.target.checked)}
                />
                <span style={styles.toggleSlider}></span>
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
              <button onClick={() => setStep(2)} style={styles.secondaryBtn}>Back</button>
              <button onClick={handleCreate} disabled={saving} style={styles.primaryBtn}>
                {saving ? 'Creating...' : '🚀 Launch My Assistant'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    padding: '40px 16px',
    minHeight: 'calc(100vh - 56px)',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  card: {
    background: 'white',
    borderRadius: 16,
    padding: 32,
    width: '100%',
    maxWidth: 600,
    boxShadow: '0 4px 24px rgba(0,0,0,0.1)'
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: 32,
    paddingBottom: 24,
    borderBottom: '1px solid #e5e7eb'
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 600,
    flexShrink: 0
  },
  h2: {
    fontSize: 22,
    fontWeight: 700,
    color: '#111827',
    marginBottom: 4
  },
  error: {
    background: '#fee2e2',
    color: '#dc2626',
    padding: '12px 16px',
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 14
  },
  featureCard: {
    background: '#f9fafb',
    borderRadius: 12,
    padding: '16px 20px',
    textAlign: 'center',
    width: 140
  },
  fieldGroup: {
    marginBottom: 16
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: '#374151',
    marginBottom: 6
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit'
  },
  row: {
    display: 'flex',
    gap: 12,
    marginBottom: 16
  },
  primaryBtn: {
    background: '#4F46E5',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer'
  },
  secondaryBtn: {
    background: 'none',
    color: '#6b7280',
    border: '1px solid #d1d5db',
    padding: '12px 24px',
    borderRadius: 8,
    fontSize: 14,
    cursor: 'pointer'
  },
  addBtn: {
    background: 'none',
    color: '#4F46E5',
    border: '1px dashed #d1d5db',
    padding: '8px 16px',
    borderRadius: 8,
    fontSize: 13,
    cursor: 'pointer',
    width: '100%',
    marginTop: 4
  },
  iconBtn: {
    background: 'none',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    cursor: 'pointer',
    width: 40,
    color: '#9ca3af'
  },
  toggleGroup: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px 0',
    borderBottom: '1px solid #e5e7eb'
  },
  toggle: {
    position: 'relative',
    display: 'inline-block',
    width: 44,
    height: 24,
    cursor: 'pointer'
  },
  toggleSlider: {
    position: 'absolute',
    cursor: 'pointer',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#d1d5db',
    borderRadius: 12,
    transition: '0.2s'
  },
  summaryBox: {
    background: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24
  },
  codeBlock: {
    background: '#1f2937',
    color: '#e5e7eb',
    padding: 16,
    borderRadius: 8,
    fontSize: 12,
    overflowX: 'auto',
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all'
  },
  copyBtn: {
    background: '#374151',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: 8,
    fontSize: 14,
    cursor: 'pointer',
    marginTop: 12
  }
};
