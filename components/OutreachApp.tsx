'use client';

import { useMemo, useState } from 'react';
import { CampaignBuilder } from './CampaignBuilder';
import { ContactPanel } from './ContactPanel';
import { HistoryPanel } from './HistoryPanel';
import { PreviewPanel } from './PreviewPanel';
import { RecipientRows } from './RecipientRows';
import { initialDraft, initialRecipients, seedContacts } from '@/lib/outreach/seed';
import { hasDuplicateRecipients, renderRecipientEmail } from '@/lib/outreach/render';
import { sendCampaignOneByOne } from '@/lib/outreach/send';
import type { CampaignRecord, EmailContact, EmailDraft, RecipientRow } from '@/lib/outreach/types';

const senderEmail = 'noreply@rococo.dev';
const senderName = 'Rococo';

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function OutreachApp() {
  const [contacts, setContacts] = useState(seedContacts);
  const [contactQuery, setContactQuery] = useState('');
  const [campaignName, setCampaignName] = useState('July media outreach');
  const [draft, setDraft] = useState<EmailDraft>(initialDraft);
  const [rows, setRows] = useState<RecipientRow[]>(initialRecipients);
  const [previewed, setPreviewed] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [confirmArmed, setConfirmArmed] = useState(false);
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);

  const filteredContacts = useMemo(() => {
    const needle = contactQuery.trim().toLowerCase();
    if (!needle) return contacts;
    return contacts.filter((contact) => [contact.email, contact.displayName, contact.company, contact.mediaName, contact.role, contact.country, ...contact.tags].join(' ').toLowerCase().includes(needle));
  }, [contacts, contactQuery]);

  const renderedEmails = useMemo(() => rows.map((row) => renderRecipientEmail(draft, row, contacts)), [contacts, draft, rows]);
  const duplicateRecipients = hasDuplicateRecipients(rows);
  const warningCount = renderedEmails.reduce((sum, email) => sum + email.warnings.length, 0);
  const canSend = previewed && !duplicateRecipients && warningCount === 0 && renderedEmails.length > 0;

  function resetSendGuards() {
    setPreviewed(false);
    setTestSent(false);
    setConfirmArmed(false);
  }

  function addContact() {
    const now = new Date().toISOString();
    setContacts((current) => [{ id: newId('contact'), email: '', displayName: '', salutation: '', language: 'en', company: '', mediaName: '', role: '', country: '', tags: [], notes: '', status: 'active', createdAt: now, updatedAt: now }, ...current]);
  }

  function updateContact(id: string, patch: Partial<EmailContact>) {
    setContacts((current) => current.map((contact) => contact.id === id ? { ...contact, ...patch, updatedAt: new Date().toISOString() } : contact));
    resetSendGuards();
  }

  function removeContact(id: string) {
    setContacts((current) => current.filter((contact) => contact.id !== id));
    setRows((current) => current.map((row) => row.contactId === id ? { ...row, contactId: '' } : row));
    resetSendGuards();
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
    setConfirmArmed(false);
  }

  function testSend() {
    if (!previewed) return;
    setTestSent(true);
  }

  function realSend() {
    if (!canSend) return;
    const campaign = sendCampaignOneByOne({ name: campaignName, draft, renderedEmails, senderEmail, senderName });
    setCampaigns((current) => [campaign, ...current]);
    setConfirmArmed(false);
  }

  return (
    <main className="appShell">
      <header className="topbar"><div className="topbarInner"><div><h1 className="brandTitle">Rococo Outreach</h1><p className="brandSub">Internal small-batch email outreach workspace</p></div><div className="statusStrip"><span className="pill pillStrong">{contacts.length} contacts</span><span className="pill pillStrong">{rows.length} recipients</span><span className="pill">one-by-one send only</span></div></div></header>
      <div className="mainGrid">
        <div className="leftColumn"><ContactPanel contacts={filteredContacts} query={contactQuery} onQueryChange={setContactQuery} onAddContact={addContact} onUpdateContact={updateContact} onRemoveContact={removeContact} /><HistoryPanel campaigns={campaigns} /></div>
        <div className="rightColumn"><div className="stack"><CampaignBuilder campaignName={campaignName} draft={draft} onCampaignNameChange={(value) => { setCampaignName(value); resetSendGuards(); }} onDraftChange={updateDraft} /><RecipientRows rows={rows} contacts={contacts} hasDuplicate={duplicateRecipients} onAddRow={addRow} onRemoveRow={removeRow} onUpdateRow={updateRow} /></div><PreviewPanel renderedEmails={renderedEmails} previewed={previewed} testSent={testSent} canSend={canSend} confirmArmed={confirmArmed} onPreview={previewCampaign} onTestSend={testSend} onArmConfirm={() => setConfirmArmed(true)} onRealSend={realSend} /></div>
      </div>
    </main>
  );
}
