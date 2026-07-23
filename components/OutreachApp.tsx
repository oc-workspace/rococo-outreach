'use client';

import { useEffect, useMemo, useState } from 'react';
import { CampaignBuilder } from './CampaignBuilder';
import { ContactPanel } from './ContactPanel';
import { HistoryPanel } from './HistoryPanel';
import { PreviewPanel } from './PreviewPanel';
import { RecipientRows } from './RecipientRows';
import { initialDraft, initialRecipients } from '@/lib/outreach/seed';
import { hasDuplicateRecipients, renderRecipientEmail } from '@/lib/outreach/render';
import { sendCampaignOneByOne } from '@/lib/outreach/send';
import { validateCampaignSend } from '@/lib/outreach/validation';
import type { CampaignRecord, EmailContact, EmailDraft, RecipientRow } from '@/lib/outreach/types';
import type { SendValidationError, SendValidationMode } from '@/lib/outreach/validation';

const senderEmail = 'noreply@rococo.dev';
const senderName = 'Rococo';
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
  const [newlySavedContactId, setNewlySavedContactId] = useState<string | null>(null);
  const [campaignName, setCampaignName] = useState('July media outreach');
  const [draft, setDraft] = useState<EmailDraft>(initialDraft);
  const [rows, setRows] = useState<RecipientRow[]>(initialRecipients);
  const [previewed, setPreviewed] = useState(false);
  const [testRecipientEmail, setTestRecipientEmail] = useState('');
  const [validationErrors, setValidationErrors] = useState<SendValidationError[]>([]);
  const [testSent, setTestSent] = useState(false);
  const [confirmArmed, setConfirmArmed] = useState(false);
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);

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

  const filteredContacts = useMemo(() => {
    const needle = contactQuery.trim().toLowerCase();
    if (!needle) return contacts;
    return contacts.filter((contact) => [contact.email, contact.displayName, contact.company, contact.mediaName, contact.role, contact.country, ...contact.tags].join(' ').toLowerCase().includes(needle));
  }, [contacts, contactQuery]);

  const renderedEmails = useMemo(() => rows.map((row) => renderRecipientEmail(draft, row, contacts)), [contacts, draft, rows]);
  const duplicateRecipients = hasDuplicateRecipients(rows);

  function resetSendGuards() {
    setPreviewed(false);
    setTestSent(false);
    setConfirmArmed(false);
    setValidationErrors([]);
  }

  function getSendValidationErrors(mode: SendValidationMode) {
    return validateCampaignSend({
      campaignName,
      draft,
      rows,
      contacts,
      senderEmail,
      senderName,
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

  function updateDraft(patch: Partial<EmailDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    resetSendGuards();
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
    setConfirmArmed(true);
  }

  function realSend() {
    const errors = getSendValidationErrors('real');
    setValidationErrors(errors);
    if (errors.length > 0) return;
    const campaign = sendCampaignOneByOne({ name: campaignName, draft, renderedEmails, senderEmail, senderName });
    setCampaigns((current) => [campaign, ...current]);
    setConfirmArmed(false);
    setActiveTab('campaign');
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
            <span className="pill">one-by-one send only</span>
            {contactsError && <span className="pill statusBlocked">{contactsError}</span>}
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
            <ContactPanel contacts={filteredContacts} query={contactQuery} onQueryChange={setContactQuery} onAddContact={addContact} newlySavedContactId={newlySavedContactId} onUpdateContact={updateContact} onRemoveContact={removeContact} />
          </section>
        )}

        {activeTab === 'campaign' && (
          <section className="tabPane tabPaneWide">
            <HistoryPanel campaigns={campaigns} />
          </section>
        )}

        {activeTab === 'compose' && (
          <section className="tabPane composeGrid">
            <div className="composeLeft">
              <CampaignBuilder campaignName={campaignName} draft={draft} onCampaignNameChange={(value) => { setCampaignName(value); resetSendGuards(); }} onDraftChange={updateDraft} />
              <RecipientRows rows={rows} contacts={contacts} hasDuplicate={duplicateRecipients} onAddRow={addRow} onRemoveRow={removeRow} onUpdateRow={updateRow} />
            </div>
            <div className="composeRight">
              <PreviewPanel renderedEmails={renderedEmails} previewed={previewed} testSent={testSent} confirmArmed={confirmArmed} validationErrors={validationErrors} testRecipientEmail={testRecipientEmail} onTestRecipientEmailChange={(value) => { setTestRecipientEmail(value); setValidationErrors([]); setTestSent(false); }} onPreview={previewCampaign} onTestSend={testSend} onArmConfirm={armConfirm} onRealSend={realSend} />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
