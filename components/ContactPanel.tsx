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
  return (
    <section className="panel">
      <div className="panelHeader">
        <div>
          <h2 className="panelTitle">Contacts</h2>
          <p className="panelNote">Manage email, media, language, salutation, tags, and send status.</p>
        </div>
        <button className="button buttonSmall" onClick={onAddContact}>+</button>
      </div>
      <div className="panelBody stack">
        <input className="input" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search email, company, media, tag" />
        <div className="contactList">
          {contacts.map((contact) => (
            <article className="contactCard" key={contact.id}>
              <div className="contactTop">
                <div>
                  <p className="contactName">{contact.displayName || 'Unnamed contact'}</p>
                  <p className="contactEmail">{contact.email}</p>
                </div>
                <span className={`pill status${contact.status[0].toUpperCase()}${contact.status.slice(1)}`}>{contact.status}</span>
              </div>
              <div className="stack">
                <input className="input" value={contact.email} onChange={(event) => onUpdateContact(contact.id, { email: event.target.value })} placeholder="email" />
                <input className="input" value={contact.displayName} onChange={(event) => onUpdateContact(contact.id, { displayName: event.target.value })} placeholder="display name" />
                <div className="row">
                  <input className="input" value={contact.company} onChange={(event) => onUpdateContact(contact.id, { company: event.target.value })} placeholder="company" />
                  <select className="select" value={contact.status} onChange={(event) => onUpdateContact(contact.id, { status: event.target.value as ContactStatus })}>
                    {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </div>
                <div className="row">
                  <input className="input" value={contact.salutation} onChange={(event) => onUpdateContact(contact.id, { salutation: event.target.value })} placeholder="salutation" />
                  <select className="select" value={contact.language} onChange={(event) => onUpdateContact(contact.id, { language: event.target.value })}>
                    <option value="en">en</option><option value="zh">zh</option><option value="ja">ja</option>
                  </select>
                </div>
                <input className="input" value={contact.tags.join(', ')} onChange={(event) => onUpdateContact(contact.id, { tags: event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) })} placeholder="tags" />
                <div className="rowWrap">
                  {contact.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}
                  <button className="button buttonDanger buttonSmall" onClick={() => onRemoveContact(contact.id)}>-</button>
                </div>
              </div>
            </article>
          ))}
          {contacts.length === 0 && <div className="empty">No matching contacts.</div>}
        </div>
      </div>
    </section>
  );
}
