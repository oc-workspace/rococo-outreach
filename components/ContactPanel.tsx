import { useState } from 'react';
import type { ContactStatus, EmailContact } from '@/lib/outreach/types';

interface Props {
  contacts: EmailContact[];
  query: string;
  onQueryChange: (value: string) => void;
  onAddContact: () => void;
  onUpdateContact: (id: string, patch: Partial<EmailContact>) => void;
  onRemoveContact: (id: string) => void;
}

const statusOptions: ContactStatus[] = ['active', 'inactive', 'blocked'];

export function ContactPanel({ contacts, query, onQueryChange, onAddContact, onUpdateContact, onRemoveContact }: Props) {
  const [expandedContactId, setExpandedContactId] = useState<string | null>(null);

  function toggleDetail(contactId: string) {
    setExpandedContactId((current) => (current === contactId ? null : contactId));
  }

  return (
    <section className="panel">
      <div className="panelHeader">
        <div>
          <h2 className="panelTitle">Contacts</h2>
          <p className="panelNote">Scan key contact fields first. Open detail only when editing is needed.</p>
        </div>
        <button className="button buttonSmall" onClick={onAddContact}>+</button>
      </div>
      <div className="panelBody stack">
        <input className="input" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search email, company, media, tag" />
        <div className="contactList contactTable" role="table" aria-label="Contacts">
          <div className="contactTableHeader" role="row">
            <span>Name</span>
            <span>Email</span>
            <span>Company</span>
            <span>Status</span>
            <span>Lang</span>
            <span>Action</span>
          </div>
          {contacts.map((contact) => {
            const isExpanded = expandedContactId === contact.id;
            return (
              <article className="contactTableItem" key={contact.id}>
                <div className="contactSummaryRow" role="row">
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
