'use client';

import { useEffect, useState, type FormEvent } from 'react';
import type { EmailSender, SenderStatus } from '@/lib/outreach/types';

const statuses: SenderStatus[] = ['active', 'inactive', 'disabled'];

export function SenderManagement() {
  const [senders, setSenders] = useState<EmailSender[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');

  async function load() {
    setLoading(true);
    try {
      const response = await fetch('/api/senders?management=true', { cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? 'Failed to load sender records');
      setSenders(payload?.data ?? []);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load sender records');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving('new'); setError(null); setNotice(null);
    try {
      const response = await fetch('/api/senders', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ displayName, email }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? 'Failed to create sender');
      setDisplayName(''); setEmail(''); setNotice('Sender created as inactive pending verification.'); await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create sender');
    } finally { setSaving(null); }
  }

  async function update(sender: EmailSender, disable = false) {
    setSaving(sender.id); setError(null); setNotice(null);
    try {
      const response = await fetch(`/api/senders/${encodeURIComponent(sender.id)}`, { method: disable ? 'DELETE' : 'PATCH', headers: { 'content-type': 'application/json' }, body: disable ? undefined : JSON.stringify({ displayName: sender.displayName, status: sender.status }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? 'Failed to update sender');
      setSenders((current) => current.map((item) => item.id === sender.id ? payload.data : item));
      setNotice(disable ? 'Sender disabled; campaign history is preserved.' : 'Sender updated.');
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update sender');
      await load();
    } finally { setSaving(null); }
  }

  return <section className="panel tabPaneWide">
    <div className="panelHeader"><div><h2 className="panelTitle">Sender management</h2><p className="panelNote">Current scope: workspace <code>default</code> · team <code>outreach</code>. Only the configured internal domain is accepted.</p></div><span className="pill pillStrong">operator access</span></div>
    <div className="panelBody stack">
      <form className="senderManagementForm" onSubmit={create}>
        <div className="field"><label htmlFor="new-sender-display-name">Display name</label><input id="new-sender-display-name" className="input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={120} placeholder="e.g. Winnie" /></div>
        <div className="field"><label htmlFor="new-sender-email">Sender email</label><input id="new-sender-email" className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@next2p.com" required /></div>
        <button className="button buttonPrimary" type="submit" disabled={saving === 'new'}>{saving === 'new' ? 'Adding...' : 'Add sender'}</button>
      </form>
      <div className="senderHint">New records start inactive. Activation requires server-side domain, sender, and exact mailbox verification.</div>
      {error && <div className="warning">{error}</div>}{notice && <div className="successBanner">{notice}</div>}
      {loading && <div className="empty">Loading sender records...</div>}
      {!loading && senders.length === 0 && <div className="empty">No sender records in this workspace.</div>}
      {!loading && senders.length > 0 && <div className="senderManagementList">{senders.map((sender) => <article className="senderManagementItem" key={sender.id}>
        <div className="senderManagementHeader"><div><strong>{sender.email}</strong> <span className={sender.status === 'active' ? 'pill statusActive' : 'pill statusInactive'}>{sender.status}</span></div><span className="senderManagementScope">{sender.workspaceKey ?? 'default'} / {sender.teamKey ?? 'outreach'}</span></div>
        <div className="senderManagementControls"><div className="field"><label htmlFor={`sender-name-${sender.id}`}>Display name</label><input id={`sender-name-${sender.id}`} aria-label={`Display name for ${sender.email}`} className="input" value={sender.displayName} onChange={(event) => setSenders((current) => current.map((item) => item.id === sender.id ? { ...item, displayName: event.target.value } : item))} /></div><div className="field"><label htmlFor={`sender-status-${sender.id}`}>Status</label><select id={`sender-status-${sender.id}`} aria-label={`Status for ${sender.email}`} className="select" value={sender.status} onChange={(event) => setSenders((current) => current.map((item) => item.id === sender.id ? { ...item, status: event.target.value as SenderStatus } : item))}>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></div><button className="button buttonSmall" type="button" disabled={saving === sender.id} onClick={() => void update(sender)}>Save</button>{sender.status !== 'disabled' && <button className="button buttonSmall buttonDanger" type="button" disabled={saving === sender.id} onClick={() => void update(sender, true)}>Disable</button>}</div>
        <div className="senderHint">Domain: {sender.domainVerified ? 'verified' : 'not verified'} · Sender: {sender.senderVerified ? 'verified' : 'not verified'} · Mailbox: {sender.mailboxAccount?.mailboxEmail ?? 'not linked'} ({sender.mailboxAccount?.verificationStatus ?? 'unverified'})</div>
      </article>)}</div>}
    </div>
  </section>;
}
