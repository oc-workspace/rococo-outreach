import { useEffect, useState } from 'react';
import type { ContactStatus, EmailContact } from '@/lib/outreach/types';
import { ContactCsvImport } from './ContactCsvImport';

interface Props {
  contacts: EmailContact[];
  query: string;
  onQueryChange: (value: string) => void;
  onAddContact: () => void;
  newlySavedContactId?: string | null;
  onUpdateContact: (id: string, patch: Partial<EmailContact>) => void;
  onRemoveContact: (id: string) => void;
  selectedContactIds: string[];
  onToggleContact: (id: string) => void;
  onToggleVisibleContacts: (ids: string[], selected: boolean) => void;
  onAddSelectedToCampaign: () => void;
  onImported: () => void;
  statusFilter: ContactStatus | 'all';
  tagFilter: string;
  availableTags: string[];
  onStatusFilterChange: (value: ContactStatus | 'all') => void;
  onTagFilterChange: (value: string) => void;
}

const statusOptions: ContactStatus[] = ['active', 'inactive', 'blocked'];

export function ContactPanel({ contacts, query, onQueryChange, onAddContact, newlySavedContactId, onUpdateContact, onRemoveContact, selectedContactIds, onToggleContact, onToggleVisibleContacts, onAddSelectedToCampaign, onImported, statusFilter, tagFilter, availableTags, onStatusFilterChange, onTagFilterChange }: Props) {
  const [expandedContactId, setExpandedContactId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    if (newlySavedContactId) {
      setExpandedContactId(newlySavedContactId);
    }
  }, [newlySavedContactId]);

  function toggleDetail(contactId: string) {
    setExpandedContactId((current) => (current === contactId ? null : contactId));
  }

  const selectableVisibleIds = contacts.filter((contact) => contact.email && contact.status !== 'blocked').map((contact) => contact.id);
  const allVisibleSelected = selectableVisibleIds.length > 0 && selectableVisibleIds.every((id) => selectedContactIds.includes(id));

  return (
    <section className="panel">
      <div className="panelHeader">
        <div>
          <h2 className="panelTitle">Contacts</h2>
          <p className="panelNote">Scan key contact fields first. Open detail only when editing is needed.</p>
        </div>
        <div className="rowWrap">
          <button className="button buttonSmall" type="button" onClick={() => setShowImport((current) => !current)}>{showImport ? 'Hide import' : 'Import CSV'}</button>
          <button className="button buttonSmall" type="button" onClick={onAddContact}>+</button>
        </div>
      </div>
      <div className="panelBody stack">
        {showImport && <ContactCsvImport onImported={onImported} />}
        <input className="input" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search email, company, media, tag" />
        <div className="row contactFilters">
          <div className="field"><label htmlFor="contact-status-filter">Status</label><select id="contact-status-filter" className="select" value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value as ContactStatus | 'all')}><option value="all">All statuses</option>{statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></div>
          <div className="field"><label htmlFor="contact-tag-filter">Tag</label><select id="contact-tag-filter" className="select" value={tagFilter} onChange={(event) => onTagFilterChange(event.target.value)}><option value="">All tags</option>{availableTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}</select></div>
        </div>
        <div className="rowWrap selectionToolbar">
          <label className="checkboxLabel"><input type="checkbox" checked={allVisibleSelected} disabled={selectableVisibleIds.length === 0} onChange={(event) => onToggleVisibleContacts(selectableVisibleIds, event.target.checked)} /> Select visible</label>
          <span className="pill">selected {selectedContactIds.length}</span>
          <button className="button buttonPrimary buttonSmall" type="button" onClick={onAddSelectedToCampaign} disabled={selectedContactIds.length === 0}>Add selected to Campaign</button>
        </div>
        <div className="contactList contactTable" role="table" aria-label="Contacts">
          <div className="contactTableHeader" role="row">
            <span aria-hidden="true" />
            <span>Name</span>
            <span>Email</span>
            <span>Company</span>
            <span>Status</span>
            <span>Lang</span>
            <span>Action</span>
          </div>
          {contacts.map((contact) => {
            const isExpanded = expandedContactId === contact.id;
            const isSelected = selectedContactIds.includes(contact.id);
            const selectionDisabled = !contact.email || contact.status === 'blocked';
            return (
              <article className="contactTableItem" key={contact.id}>
                <div className="contactSummaryRow" role="row">
                  <span className="contactSelectCell"><input type="checkbox" checked={isSelected} disabled={selectionDisabled} onChange={() => onToggleContact(contact.id)} aria-label={`Select ${contact.email || 'contact'}`} /></span>
                  <span className="contactName" title={contact.displayName || 'Unnamed contact'}>{contact.displayName || 'Unnamed contact'}</span>
                  <span className="contactEmail" title={contact.email}>{contact.email || '-'}</span>
                  <span className="contactEmail" title={contact.company}>{contact.company || '-'}</span>
                  <span className={`pill status${contact.status[0].toUpperCase()}${contact.status.slice(1)}`}>{contact.status}</span>
                  <span className="pill">{contact.language || '-'}</span>
                  <button className="button buttonSmall" onClick={() => toggleDetail(contact.id)} aria-expanded={isExpanded}>
                    {isExpanded ? 'Hide' : 'Detail'}
                  </button>
                </div>
                {isExpanded && (
                  <div className="contactDetailPanel">
                    {newlySavedContactId === contact.id && <div className="successBanner">已保存,请继续编辑信息</div>}
                    <div className="row">
                      <div className="field"><label>Email</label><input className="input" value={contact.email} onChange={(event) => onUpdateContact(contact.id, { email: event.target.value })} placeholder="email" /></div>
                      <div className="field"><label>Name</label><input className="input" value={contact.displayName} onChange={(event) => onUpdateContact(contact.id, { displayName: event.target.value })} placeholder="display name" /></div>
                    </div>
                    <div className="row">
                      <div className="field"><label>Company</label><input className="input" value={contact.company} onChange={(event) => onUpdateContact(contact.id, { company: event.target.value })} placeholder="company" /></div>
                      <div className="field"><label>Status</label><select className="select" value={contact.status} onChange={(event) => onUpdateContact(contact.id, { status: event.target.value as ContactStatus })}>{statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></div>
                    </div>
                    <div className="row">
                      <div className="field"><label>Salutation</label><input className="input" value={contact.salutation} onChange={(event) => onUpdateContact(contact.id, { salutation: event.target.value })} placeholder="salutation" /></div>
                      <div className="field"><label>Language</label><select className="select" value={contact.language} onChange={(event) => onUpdateContact(contact.id, { language: event.target.value })}><option value="en">en</option><option value="zh">zh</option><option value="ja">ja</option></select></div>
                    </div>
                    <div className="field"><label>Tags</label><input className="input" value={contact.tags.join(', ')} onChange={(event) => onUpdateContact(contact.id, { tags: event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) })} placeholder="tags" /></div>
                    <div className="rowWrap">
                      {contact.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}
                      <button className="button buttonDanger buttonSmall" onClick={() => onRemoveContact(contact.id)}>-</button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
          {contacts.length === 0 && <div className="empty">No matching contacts.</div>}
        </div>
      </div>
    </section>
  );
}
