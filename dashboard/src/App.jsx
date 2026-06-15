import React, { useState, useEffect } from 'react';

const API = '';

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [business, setBusiness] = useState(null);
  const [stats, setStats] = useState(null);
  const [leads, setLeads] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API}/api/businesses`)
      .then(r => r.json())
      .then(bizes => {
        if (bizes.length > 0) {
          loadData(bizes[0].id);
        }
      })
      .catch(e => setError('Could not load businesses'));
  }, []);

  function loadData(businessId) {
    fetch(`${API}/api/businesses/${businessId}/stats`)
      .then(r => r.json())
      .then(d => {
        setBusiness(d.business);
        setStats(d.stats);
      })
      .catch(e => setError('Could not load stats'));

    fetch(`${API}/api/businesses/${businessId}/leads?limit=50`)
      .then(r => r.json())
      .then(d => setLeads(d))
      .catch(() => {});

    fetch(`${API}/api/businesses/${businessId}/bookings?limit=50`)
      .then(r => r.json())
      .then(d => setBookings(d))
      .catch(() => {});
  }

  function updateLeadStatus(id, status) {
    fetch(`${API}/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    }).then(() => {
      setLeads(leads.map(l => l.id === id ? { ...l, status } : l));
    });
  }

  return (
    <div style={styles.app}>
      <nav style={styles.nav}>
        <div style={styles.navBrand}>🤖 FrontDesk AI</div>
        <div style={styles.navLinks}>
          <button onClick={() => setPage('dashboard')} style={{...styles.navBtn, fontWeight: page === 'dashboard' ? 600 : 400}}>Dashboard</button>
          <button onClick={() => setPage('leads')} style={{...styles.navBtn, fontWeight: page === 'leads' ? 600 : 400}}>Leads</button>
          <button onClick={() => setPage('bookings')} style={{...styles.navBtn, fontWeight: page === 'bookings' ? 600 : 400}}>Bookings</button>
        </div>
      </nav>

      <main style={styles.main}>
        {error && <div style={styles.error}>{error}</div>}

        {page === 'dashboard' && (
          <>
            {business && <h1 style={styles.h1}>{business.name}</h1>}
            {stats && (
              <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                  <div style={styles.statNumber}>{stats.totalConversations}</div>
                  <div style={styles.statLabel}>Conversations</div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.statNumber}>{stats.activeConversations}</div>
                  <div style={styles.statLabel}>Active Now</div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.statNumber}>{stats.totalLeads}</div>
                  <div style={styles.statLabel}>Total Leads</div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.statNumber}>{stats.qualifiedLeads}</div>
                  <div style={styles.statLabel}>Qualified</div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.statNumber}>{stats.totalBookings}</div>
                  <div style={styles.statLabel}>Bookings</div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.statNumber}>{stats.conversionRate}%</div>
                  <div style={styles.statLabel}>Conversion</div>
                </div>
              </div>
            )}
            {business && (
              <div style={styles.embedSection}>
                <h2 style={styles.h2}>📋 Embed Widget</h2>
                <p>Add this script to your website:</p>
                <pre style={styles.codeBlock}>&lt;script src="{window.location.origin}/widget/widget.js"
  data-fdai-business-id="{business.id}"
  data-fdai-api-url="{window.location.origin}"
  data-fdai-color="#4F46E5"
  data-fdai-title="Chat with {business.name}"
  data-fdai-subtitle="We reply in minutes"&gt;&lt;/script&gt;</pre>
              </div>
            )}
            <div style={styles.previewSection}>
              <h2 style={styles.h2}>📱 Preview</h2>
              <p style={{ color: '#6b7280', marginBottom: 16 }}>
                Open your site with the widget to test it, or try the API directly.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={`${API}/api/health`} target="_blank" style={styles.apiBtn}>Health Check</a>
                <a href={`${API}/api/businesses`} target="_blank" style={styles.apiBtn}>API: Businesses</a>
              </div>
            </div>
          </>
        )}

        {page === 'leads' && (
          <>
            <h1 style={styles.h1}>📋 Leads</h1>
            {leads.length === 0 ? (
              <p style={{ color: '#6b7280' }}>No leads yet. Start a conversation to capture your first lead!</p>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Contact</th>
                    <th style={styles.th}>Service</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map(lead => (
                    <tr key={lead.id}>
                      <td style={styles.td}>{lead.name || '—'}</td>
                      <td style={styles.td}>{lead.phone || lead.email || '—'}</td>
                      <td style={styles.td}>{lead.service || '—'}</td>
                      <td style={styles.td}>
                        <span style={{...styles.statusBadge, backgroundColor: statusColors[lead.status] || '#e5e7eb'}}>
                          {lead.status}
                        </span>
                      </td>
                      <td style={styles.td}>{new Date(lead.created_at).toLocaleDateString()}</td>
                      <td style={styles.td}>
                        <select value={lead.status} onChange={e => updateLeadStatus(lead.id, e.target.value)} style={styles.select}>
                          <option value="new">new</option>
                          <option value="contacted">contacted</option>
                          <option value="qualified">qualified</option>
                          <option value="booked">booked</option>
                          <option value="converted">converted</option>
                          <option value="lost">lost</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {page === 'bookings' && (
          <>
            <h1 style={styles.h1}>📅 Bookings</h1>
            {bookings.length === 0 ? (
              <p style={{ color: '#6b7280' }}>No bookings yet.</p>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Lead</th>
                    <th style={styles.th}>Service</th>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(b => (
                    <tr key={b.id}>
                      <td style={styles.td}>{b.lead_name || '—'}</td>
                      <td style={styles.td}>{b.service}</td>
                      <td style={styles.td}>{b.preferred_date || new Date(b.created_at).toLocaleDateString()}</td>
                      <td style={styles.td}>
                        <span style={{...styles.statusBadge, backgroundColor: statusColors[b.status] || '#e5e7eb'}}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </main>
    </div>
  );
}

const statusColors = {
  new: '#dbeafe',
  contacted: '#fef3c7',
  qualified: '#d1fae5',
  booked: '#a7f3d0',
  converted: '#6ee7b7',
  lost: '#fee2e2',
  pending: '#fef3c7',
  confirmed: '#d1fae5',
  cancelled: '#fee2e2',
  completed: '#e5e7eb'
};

const styles = {
  app: { minHeight: '100vh', background: '#f3f4f6', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  nav: { background: '#1f2937', color: 'white', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 32 },
  navBrand: { fontSize: 20, fontWeight: 700 },
  navLinks: { display: 'flex', gap: 4 },
  navBtn: { background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '8px 16px', borderRadius: 6, fontSize: 14 },
  main: { maxWidth: 960, margin: '0 auto', padding: '24px 16px' },
  h1: { fontSize: 28, fontWeight: 700, marginBottom: 24, color: '#111827' },
  h2: { fontSize: 20, fontWeight: 600, marginBottom: 12, color: '#1f2937' },
  error: { background: '#fee2e2', color: '#dc2626', padding: '12px 16px', borderRadius: 8, marginBottom: 16 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginBottom: 32 },
  statCard: { background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  statNumber: { fontSize: 32, fontWeight: 700, color: '#4F46E5' },
  statLabel: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  table: { width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: 12, textTransform: 'uppercase', color: '#6b7280', borderBottom: '2px solid #e5e7eb' },
  td: { padding: '12px 16px', fontSize: 14, borderBottom: '1px solid #e5e7eb' },
  select: { padding: '4px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 },
  statusBadge: { display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600, textTransform: 'capitalize' },
  embedSection: { background: 'white', borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  previewSection: { background: 'white', borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  codeBlock: { background: '#1f2937', color: '#e5e7eb', padding: 16, borderRadius: 8, fontSize: 13, overflowX: 'auto', marginTop: 8 },
  apiBtn: { display: 'inline-block', padding: '8px 16px', background: '#4F46E5', color: 'white', borderRadius: 8, textDecoration: 'none', fontSize: 14 }
};