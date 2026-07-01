import type { EmailContact, RecipientRow } from '@/lib/outreach/types';

interface Props {
  rows: RecipientRow[];
  contacts: EmailContact[];
  hasDuplicate: boolean;
  onAddRow: () => void;
  onRemoveRow: (id: string) => void;
  onUpdateRow: (id: string, patch: Partial<RecipientRow>) => void;
}

export function RecipientRows({ rows, contacts, hasDuplicate, onAddRow, onRemoveRow, onUpdateRow }: Props) {
  function selectContact(rowId: string, contactId: string) {
    const contact = contacts.find((item) => item.id === contactId);
    onUpdateRow(rowId, { contactId, email: contact?.email || '', language: contact?.language || 'en', salutation: contact?.salutation || '' });
  }

  return (
    <section className="panel">
      <div className="panelHeader">
        <div>
          <h2 className="panelTitle">Recipients</h2>
          <p className="panelNote">Each row becomes one independent email with exactly one To address.</p>
        </div>
        <button className="button buttonSmall" onClick={onAddRow}>+</button>
      </div>
      <div className="panelBody stack">
        {hasDuplicate && <div className="warning">Duplicate recipient email detected. Real send is blocked until each row is unique.</div>}
        <div className="recipientList">
          {rows.map((row) => (
            <div className="recipientRow" key={row.id}>
              <div className="field"><label>Target email</label><select className="select" value={row.contactId} onChange={(event) => selectContact(row.id, event.target.value)}><option value="">Manual email</option>{contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.email}</option>)}</select><input className="input" value={row.email} onChange={(event) => onUpdateRow(row.id, { email: event.target.value, contactId: '' })} /></div>
              <div className="field"><label>Language</label><select className="select" value={row.language} onChange={(event) => onUpdateRow(row.id, { language: event.target.value })}><option value="en">en</option><option value="zh">zh</option><option value="ja">ja</option></select></div>
              <div className="field"><label>Salutation</label><input className="input" value={row.salutation} onChange={(event) => onUpdateRow(row.id, { salutation: event.target.value })} /></div>
              <button className="button buttonDanger" onClick={() => onRemoveRow(row.id)} disabled={rows.length === 1}>-</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
