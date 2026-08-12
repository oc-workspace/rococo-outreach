'use client';

import { useEffect, useMemo, useState } from 'react';
import { CampaignBuilder } from './CampaignBuilder';
import { ContactPanel } from './ContactPanel';
import { HistoryPanel } from './HistoryPanel';
import { PreviewPanel } from './PreviewPanel';
import { RecipientRows } from './RecipientRows';
import { SenderSettings } from './SenderSettings';
import { LogoutButton } from './LogoutButton';
import { initialDraft, initialRecipients } from '@/lib/outreach/seed';
import { hasDuplicateRecipients, renderRecipientEmail } from '@/lib/outreach/render';
import { validateCampaignSend } from '@/lib/outreach/validation';
import type { CampaignDraftRecord, CampaignRecord, ContactStatus, EmailContact, EmailDraft, EmailSender, EmailTemplateRecord, RecipientRow } from '@/lib/outreach/types';
import type { SendValidationError, SendValidationMode } from '@/lib/outreach/validation';

type WorkspaceTab = 'contacts' | 'campaign' | 'compose';

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function parseContactResponse(response: Response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error ?? 'Contact request failed');
  }
  return payload?.data as EmailContact;
}

export function OutreachApp() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('contacts');
  const [contacts, setContacts] = useState<EmailContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [contactQuery, setContactQuery] = useState('');
  const [contactStatusFilter, setContactStatusFilter] = useState<ContactStatus | 'all'>('all');
  const [contactTagFilter, setContactTagFilter] = useState('');
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [newlySavedContactId, setNewlySavedContactId] = useState<string | null>(null);
  const [campaignName, setCampaignName] = useState('July media outreach');
  const [senders, setSenders] = useState<EmailSender[]>([]);
  const [sendersLoading, setSendersLoading] = useState(true);
  const [sendersError, setSendersError] = useState<string | null>(null);
  const [selectedSenderId, setSelectedSenderId] = useState('');
  const [replyToEmail, setReplyToEmail] = useState('');
  const [draft, setDraft] = useState<EmailDraft>(initialDraft);
  const [rows, setRows] = useState<RecipientRow[]>(initialRecipients);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [draftSaveState, setDraftSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [draftSaveError, setDraftSaveError] = useState<string | null>(null);
  const [previewed, setPreviewed] = useState(false);
  const [testRecipientEmail, setTestRecipientEmail] = useState('');
  const [validationErrors, setValidationErrors] = useState<SendValidationError[]>([]);
  const [testSent, setTestSent] = useState(false);
  const [confirmArmed, setConfirmArmed] = useState(false);
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [campaignsError, setCampaignsError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<EmailTemplateRecord[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [campaignSending, setCampaignSending] = useState(false);
  const [campaignIdempotencyKey, setCampaignIdempotencyKey] = useState('');
  const [retryingCampaignId, setRetryingCampaignId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadContacts() {
      setContactsLoading(true);
      setContactsError(null);
      try {
        const response = await fetch('/api/contacts', { cache: 'no-store' });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error ?? 'Failed to load contacts');
        if (!cancelled) setContacts(payload?.data ?? []);
      } catch (error) {
        if (!cancelled) setContactsError(error instanceof Error ? error.message : 'Failed to load contacts');
      } finally {
        if (!cancelled) setContactsLoading(false);
      }
    }

    loadContacts();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadCampaignDraft() {
      try {
        const response = await fetch('/api/campaign-draft', { cache: 'no-store' });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error ?? 'Failed to load campaign draft');
        const saved = payload?.data as CampaignDraftRecord | null;
        if (!cancelled && saved) {
          setCampaignName(saved.campaignName);
          setDraft((current) => ({ ...current, id: saved.id, title: saved.draftTitle, subject: saved.subject, bodyHtml: saved.bodyHtml, updatedAt: saved.updatedAt }));
          setRows(saved.recipientRows);
          setSelectedSenderId(saved.senderId ?? '');
          setReplyToEmail(saved.replyToEmail);
        }
      } catch (error) {
        if (!cancelled) {
          setDraftSaveState('error');
          setDraftSaveError(error instanceof Error ? error.message : 'Failed to load campaign draft');
        }
      } finally {
        if (!cancelled) setDraftHydrated(true);
      }
    }
    loadCampaignDraft();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!draftHydrated) return;
    setDraftSaveState('saving');
    setDraftSaveError(null);
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/campaign-draft', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            campaignName,
            draftTitle: draft.title,
            subject: draft.subject,
            bodyHtml: draft.bodyHtml,
            senderId: selectedSenderId || null,
            replyToEmail,
            recipientRows: rows,
          }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error ?? 'Failed to save campaign draft');
        setDraftSaveState('saved');
      } catch (error) {
        setDraftSaveState('error');
        setDraftSaveError(error instanceof Error ? error.message : 'Failed to save campaign draft');
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [draftHydrated, campaignName, draft.title, draft.subject, draft.bodyHtml, selectedSenderId, replyToEmail, rows]);

  useEffect(() => {
    let cancelled = false;

    async function loadTemplates() {
      setTemplatesLoading(true);
      setTemplatesError(null);
      try {
        const response = await fetch('/api/templates?includeArchived=true', { cache: 'no-store' });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error ?? 'Failed to load templates');
        if (!cancelled) setTemplates(payload?.data ?? []);
      } catch (error) {
        if (!cancelled) setTemplatesError(error instanceof Error ? error.message : 'Failed to load templates');
      } finally {
        if (!cancelled) setTemplatesLoading(false);
      }
    }

    loadTemplates();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCampaigns() {
      setCampaignsLoading(true);
      setCampaignsError(null);
      try {
        const response = await fetch('/api/campaigns', { cache: 'no-store' });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error ?? 'Failed to load campaigns');
        if (!cancelled) setCampaigns(payload?.data ?? []);
      } catch (error) {
        if (!cancelled) setCampaignsError(error instanceof Error ? error.message : 'Failed to load campaigns');
      } finally {
        if (!cancelled) setCampaignsLoading(false);
      }
    }

    loadCampaigns();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSenders() {
      setSendersLoading(true);
      setSendersError(null);
      try {
        const response = await fetch('/api/senders', { cache: 'no-store' });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error ?? 'Failed to load senders');
        const nextSenders = payload?.data ?? [];
        if (!cancelled) {
          setSenders(nextSenders);
          setSelectedSenderId((current) => {
            if (nextSenders.some((sender: EmailSender) => sender.id === current)) return current;
            return nextSenders[0]?.id || '';
          });
          setReplyToEmail((current) => current || nextSenders[0]?.email || '');
        }
      } catch (error) {
        if (!cancelled) setSendersError(error instanceof Error ? error.message : 'Failed to load senders');
      } finally {
        if (!cancelled) setSendersLoading(false);
      }
    }

    loadSenders();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredContacts = useMemo(() => {
    const needle = contactQuery.trim().toLowerCase();
    return contacts.filter((contact) => {
      if (contactStatusFilter !== 'all' && contact.status !== contactStatusFilter) return false;
      if (contactTagFilter && !contact.tags.includes(contactTagFilter)) return false;
      if (!needle) return true;
      return [contact.email, contact.displayName, contact.company, contact.mediaName, contact.role, contact.country, ...contact.tags].join(' ').toLowerCase().includes(needle);
    });
  }, [contacts, contactQuery, contactStatusFilter, contactTagFilter]);

  const availableContactTags = useMemo(() => Array.from(new Set(contacts.flatMap((contact) => contact.tags))).sort((left, right) => left.localeCompare(right)), [contacts]);

  const renderedEmails = useMemo(() => rows.map((row) => renderRecipientEmail(draft, row, contacts)), [contacts, draft, rows]);
  const selectedSender = senders.find((sender) => sender.id === selectedSenderId);
  const senderEmail = selectedSender?.email || '';
  const senderName = selectedSender?.displayName || '';
  const duplicateRecipients = hasDuplicateRecipients(rows);

  function resetSendGuards() {
    setPreviewed(false);
    setTestSent(false);
    setConfirmArmed(false);
    setValidationErrors([]);
    setCampaignIdempotencyKey('');
  }

  function getSendValidationErrors(mode: SendValidationMode) {
    return validateCampaignSend({
      campaignName,
      draft,
      rows,
      contacts,
      senderEmail,
      senderName,
      replyToEmail,
      senderDomainVerified: Boolean(selectedSender?.domainVerified),
      senderVerified: Boolean(selectedSender?.senderVerified),
      senderActive: selectedSender?.status === 'active',
      previewed,
      testRecipientEmail,
      mode,
    });
  }

  async function addContact() {
    setContactsError(null);
    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: '', displayName: '', salutation: '', language: 'en', company: '', mediaName: '', role: '', country: '', tags: [], notes: '', status: 'active' }),
      });
      const contact = await parseContactResponse(response);
      setContacts((current) => [contact, ...current]);
      setNewlySavedContactId(contact.id);
      setContactQuery('');
    } catch (error) {
      setContactsError(error instanceof Error ? error.message : 'Failed to add contact');
    }
  }

  async function updateContact(id: string, patch: Partial<EmailContact>) {
    setContactsError(null);
    setNewlySavedContactId((current) => (current === id ? null : current));
    setContacts((current) => current.map((contact) => contact.id === id ? { ...contact, ...patch, updatedAt: new Date().toISOString() } : contact));
    resetSendGuards();

    try {
      const response = await fetch(`/api/contacts/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const contact = await parseContactResponse(response);
      setContacts((current) => current.map((item) => item.id === id ? contact : item));
    } catch (error) {
      setContactsError(error instanceof Error ? error.message : 'Failed to update contact');
    }
  }

  async function removeContact(id: string) {
    const previousContacts = contacts;
    setContactsError(null);
    setContacts((current) => current.filter((contact) => contact.id !== id));
    setSelectedContactIds((current) => current.filter((contactId) => contactId !== id));
    setRows((current) => current.map((row) => row.contactId === id ? { ...row, contactId: '' } : row));
    resetSendGuards();

    try {
      const response = await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to remove contact');
    } catch (error) {
      setContacts(previousContacts);
      setContactsError(error instanceof Error ? error.message : 'Failed to remove contact');
    }
  }

  async function refreshContacts() {
    setContactsLoading(true);
    setContactsError(null);
    try {
      const response = await fetch('/api/contacts', { cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? 'Failed to load contacts');
      setContacts(payload?.data ?? []);
    } catch (error) {
      setContactsError(error instanceof Error ? error.message : 'Failed to load contacts');
    } finally {
      setContactsLoading(false);
    }
  }

  function toggleContactSelection(contactId: string) {
    setSelectedContactIds((current) => current.includes(contactId) ? current.filter((id) => id !== contactId) : [...current, contactId]);
  }

  function toggleVisibleContactSelection(ids: string[], selected: boolean) {
    setSelectedContactIds((current) => selected ? Array.from(new Set([...current, ...ids])) : current.filter((id) => !ids.includes(id)));
  }

  function addSelectedContactsToCampaign() {
    const selected = contacts.filter((contact) => selectedContactIds.includes(contact.id) && contact.email && contact.status !== 'blocked');
    const existingEmails = new Set(rows.map((row) => row.email.trim().toLowerCase()).filter(Boolean));
    const additions = selected.filter((contact) => {
      const email = contact.email.trim().toLowerCase();
      if (existingEmails.has(email)) return false;
      existingEmails.add(email);
      return true;
    }).map((contact) => ({ id: newId('row'), contactId: contact.id, email: contact.email, language: contact.language || 'en', salutation: contact.salutation }));

    if (additions.length > 0) {
      setRows((current) => [...current, ...additions]);
      resetSendGuards();
      setActiveTab('compose');
    }
    setSelectedContactIds([]);
  }

  function updateDraft(patch: Partial<EmailDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    resetSendGuards();
  }

  function applyTemplate(template: EmailTemplateRecord) {
    setDraft((current) => ({ ...current, subject: template.subject, bodyHtml: template.bodyHtml, updatedAt: new Date().toISOString() }));
    resetSendGuards();
  }

  async function saveTemplate(input: Partial<EmailTemplateRecord> & { name: string; description: string }) {
    setTemplatesError(null);
    const response = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...input, subject: draft.subject, bodyHtml: draft.bodyHtml }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error ?? 'Failed to save template');
    const template = payload?.data as EmailTemplateRecord | undefined;
    if (!template) throw new Error('Template save returned no record');
    setTemplates((current) => [template, ...current.filter((item) => item.id !== template.id)]);
  }

  async function updateTemplate(id: string, input: Partial<EmailTemplateRecord> & { createVersion?: boolean }) {
    const response = await fetch(`/api/templates/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error ?? 'Failed to update template');
    const template = payload?.data as EmailTemplateRecord;
    setTemplates((current) => [template, ...current.filter((item) => item.templateKey !== template.templateKey)]);
    return template;
  }

  async function archiveTemplate(template: EmailTemplateRecord) {
    const response = await fetch(`/api/templates/${template.id}`, { method: template.status === 'archived' ? 'PATCH' : 'DELETE', headers: { 'content-type': 'application/json' }, body: template.status === 'archived' ? JSON.stringify({ status: 'active' }) : undefined });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error ?? 'Failed to change template status');
    const next = payload?.data as EmailTemplateRecord;
    setTemplates((current) => current.map((item) => item.id === next.id ? next : item));
  }

  async function switchTemplateVersion(template: EmailTemplateRecord, version: number) {
    const response = await fetch(`/api/templates/${template.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ switchToVersion: version }) });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error ?? 'Failed to switch template version');
    const refreshed = await fetch('/api/templates?includeArchived=true', { cache: 'no-store' });
    const refreshedPayload = await refreshed.json().catch(() => null);
    if (!refreshed.ok) throw new Error(refreshedPayload?.error ?? 'Failed to refresh templates');
    setTemplates(refreshedPayload?.data ?? []);
  }

  function addRow() {
    setRows((current) => [...current, { id: newId('row'), contactId: '', email: '', language: 'en', salutation: '' }]);
    resetSendGuards();
  }

  function updateRow(id: string, patch: Partial<RecipientRow>) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));
    resetSendGuards();
  }

  function removeRow(id: string) {
    setRows((current) => current.filter((row) => row.id !== id));
    resetSendGuards();
  }

  function previewCampaign() {
    setPreviewed(true);
    setValidationErrors([]);
    setConfirmArmed(false);
  }

  function testSend() {
    const errors = getSendValidationErrors('test');
    setValidationErrors(errors);
    if (errors.length > 0) return;
    setTestSent(true);
  }

  function armConfirm() {
    const errors = getSendValidationErrors('real');
    setValidationErrors(errors);
    if (errors.length > 0) return;
    setCampaignIdempotencyKey((current) => current || crypto.randomUUID());
    setConfirmArmed(true);
  }

  async function realSend() {
    const errors = getSendValidationErrors('real');
    setValidationErrors(errors);
    if (errors.length > 0) return;

    setCampaignSending(true);
    try {
      const response = await fetch('/api/campaigns/send', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': campaignIdempotencyKey || crypto.randomUUID(),
        },
        body: JSON.stringify({
          name: campaignName,
          subject: draft.subject,
          bodyHtml: draft.bodyHtml,
          senderId: selectedSenderId,
          senderEmail,
          senderName,
          replyToEmail,
          deliveries: renderedEmails,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? 'Campaign send failed');
      const campaign = payload?.data as CampaignRecord | undefined;
      if (!campaign) throw new Error('Campaign send returned no campaign record');
      setCampaigns((current) => [campaign, ...current.filter((item) => item.id !== campaign.id)]);
      setCampaignIdempotencyKey('');
      setConfirmArmed(false);
      setActiveTab('campaign');
    } catch (error) {
      setValidationErrors([{ section: 'Operator access', message: error instanceof Error ? error.message : 'Campaign send failed' }]);
    } finally {
      setCampaignSending(false);
    }
  }

  async function retryFailedCampaign(campaignId: string) {
    setRetryingCampaignId(campaignId);
    setCampaignsError(null);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/retry-failed`, {
        method: 'POST',
        headers: {
          'idempotency-key': crypto.randomUUID(),
        },
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? 'Campaign retry failed');
      const campaign = payload?.data as CampaignRecord | undefined;
      if (!campaign) throw new Error('Campaign retry returned no campaign record');
      setCampaigns((current) => current.map((item) => item.id === campaign.id ? campaign : item));
    } catch (error) {
      setCampaignsError(error instanceof Error ? error.message : 'Campaign retry failed');
    } finally {
      setRetryingCampaignId(null);
    }
  }

  function updateSender(senderId: string) {
    const nextSender = senders.find((sender) => sender.id === senderId);
    setSelectedSenderId(senderId);
    setReplyToEmail(nextSender?.email || '');
    resetSendGuards();
  }

  const tabs: Array<{ id: WorkspaceTab; label: string; meta: string }> = [
    { id: 'contacts', label: 'Contacts', meta: contactsLoading ? 'loading' : String(contacts.length) },
    { id: 'campaign', label: 'Campaign', meta: String(campaigns.length) },
    { id: 'compose', label: 'Compose', meta: `${rows.length} recipients` },
  ];

  return (
    <main className="appShell">
      <header className="topbar">
        <div className="topbarInner">
          <div>
            <h1 className="brandTitle">Rococo Outreach</h1>
            <p className="brandSub">Internal small-batch email outreach workspace</p>
          </div>
          <div className="statusStrip">
            <span className="pill pillStrong">{contactsLoading ? 'loading contacts' : `${contacts.length} contacts`}</span>
            <span className="pill pillStrong">{rows.length} recipients</span>
            <span className="pill pillStrong">{sendersLoading ? 'loading senders' : `${senders.length} senders`}</span>
            <span className="pill">one-by-one send only</span>
            <LogoutButton />
            {contactsError && <span className="pill statusBlocked">{contactsError}</span>}
            {sendersError && <span className="pill statusBlocked">{sendersError}</span>}
          </div>
        </div>
      </header>

      <div className="workspaceShell">
        <nav className="workspaceTabs" aria-label="Outreach workspace sections">
          {tabs.map((tab) => (
            <button
              className={`workspaceTab ${activeTab === tab.id ? 'workspaceTabActive' : ''}`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              <span>{tab.label}</span>
              <small>{tab.meta}</small>
            </button>
          ))}
        </nav>

        {activeTab === 'contacts' && (
          <section className="tabPane tabPaneWide">
            <ContactPanel contacts={filteredContacts} query={contactQuery} onQueryChange={setContactQuery} onAddContact={addContact} newlySavedContactId={newlySavedContactId} onUpdateContact={updateContact} onRemoveContact={removeContact} selectedContactIds={selectedContactIds} onToggleContact={toggleContactSelection} onToggleVisibleContacts={toggleVisibleContactSelection} onAddSelectedToCampaign={addSelectedContactsToCampaign} onImported={refreshContacts} statusFilter={contactStatusFilter} tagFilter={contactTagFilter} availableTags={availableContactTags} onStatusFilterChange={setContactStatusFilter} onTagFilterChange={setContactTagFilter} />
          </section>
        )}

        {activeTab === 'campaign' && (
          <section className="tabPane tabPaneWide">
            <HistoryPanel campaigns={campaigns} loading={campaignsLoading} error={campaignsError} onRetry={retryFailedCampaign} retryingCampaignId={retryingCampaignId} />
          </section>
        )}

        {activeTab === 'compose' && (
          <section className="tabPane composeGrid">
            <div className="composeLeft">
              <SenderSettings senders={senders} selectedSenderId={selectedSenderId} replyToEmail={replyToEmail} loading={sendersLoading} error={sendersError} onSenderChange={updateSender} onReplyToEmailChange={(value) => { setReplyToEmail(value); resetSendGuards(); }} />
              <CampaignBuilder campaignName={campaignName} draft={draft} draftSaveState={draftSaveState} draftSaveError={draftSaveError} onCampaignNameChange={(value) => { setCampaignName(value); resetSendGuards(); }} onDraftChange={updateDraft} templates={templates} templatesLoading={templatesLoading} templatesError={templatesError} onApplyTemplate={applyTemplate} onSaveTemplate={saveTemplate} onUpdateTemplate={updateTemplate} onArchiveTemplate={archiveTemplate} onSwitchTemplateVersion={switchTemplateVersion} />
              <RecipientRows rows={rows} contacts={contacts} hasDuplicate={duplicateRecipients} onAddRow={addRow} onRemoveRow={removeRow} onUpdateRow={updateRow} />
            </div>
            <div className="composeRight">
              <PreviewPanel renderedEmails={renderedEmails} previewed={previewed} testSent={testSent} confirmArmed={confirmArmed} validationErrors={validationErrors} testRecipientEmail={testRecipientEmail} senderName={senderName} senderEmail={senderEmail} replyToEmail={replyToEmail} campaignSending={campaignSending} onTestRecipientEmailChange={(value) => { setTestRecipientEmail(value); setValidationErrors([]); setTestSent(false); }} onPreview={previewCampaign} onTestSend={testSend} onArmConfirm={armConfirm} onRealSend={realSend} />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
