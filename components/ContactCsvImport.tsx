'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import type { ContactImportPreview } from '@/lib/outreach/contactCsv';

interface Props {
  onImported: () => void;
}

export function ContactCsvImport({ onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [csvText, setCsvText] = useState('');
  const [preview, setPreview] = useState<ContactImportPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function previewCsv(text: string) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/contacts/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode: 'preview', csv: text }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? 'CSV preview failed');
      setPreview(payload?.data ?? null);
    } catch (requestError) {
      setPreview(null);
      setError(requestError instanceof Error ? requestError.message : 'CSV preview failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please choose a .csv file.');
      setPreview(null);
      return;
    }
    if (file.size > 1024 * 1024) {
      setError('CSV file is larger than 1 MB.');
      setPreview(null);
      return;
    }

    const text = await file.text();
    setCsvText(text);
    await previewCsv(text);
  }

  async function commitImport() {
    if (!csvText || !preview || preview.issues.length > 0) return;
    setCommitting(true);
    setError(null);
    try {
      const response = await fetch('/api/contacts/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode: 'commit', csv: csvText }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? 'CSV import failed');
      onImported();
      setCsvText('');
      setPreview(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'CSV import failed');
    } finally {
      setCommitting(false);
    }
  }

  return (
    <div className="csvImportBox">
      <div className="rowWrap">
        <div className="field">
          <label htmlFor="contact-csv-file">CSV file</label>
          <input ref={inputRef} id="contact-csv-file" className="input" type="file" accept=".csv,text/csv" onChange={handleFileChange} />
        </div>
        <button className="button buttonPrimary buttonSmall" type="button" onClick={commitImport} disabled={!preview || preview.issues.length > 0 || committing || loading}>
          {committing ? 'Importing...' : 'Import valid rows'}
        </button>
      </div>
      <p className="panelNote">Required column: <span className="kbd">email</span>. Optional columns: displayName, salutation, language, company, mediaName, role, country, tags, notes, status. Separate tags with <span className="kbd">;</span>.</p>
      {loading && <div className="empty">Reading and validating CSV...</div>}
      {error && <div className="warning">{error}</div>}
      {preview && (
        <div className="csvPreview">
          <div className="rowWrap"><span className="pill">rows {preview.totalRows}</span><span className="pill">valid {preview.validRows}</span><span className="pill">issues {preview.issues.length}</span></div>
          {preview.issues.length > 0 && <div className="validationList"><strong>Fix these rows before importing:</strong><ul>{preview.issues.slice(0, 8).map((issue) => <li key={`${issue.row}-${issue.message}`}>{issue.row ? `Row ${issue.row}: ` : ''}{issue.message}</li>)}{preview.issues.length > 8 && <li>...and {preview.issues.length - 8} more.</li>}</ul></div>}
          {preview.rows.length > 0 && <div className="csvPreviewTable"><div className="csvPreviewHeader"><span>Email</span><span>Name</span><span>Company</span><span>Status</span></div>{preview.rows.slice(0, 8).map((row) => <div className="csvPreviewRow" key={row.email}><span>{row.email}</span><span>{row.displayName || '-'}</span><span>{row.company || '-'}</span><span>{row.status}</span></div>)}{preview.rows.length > 8 && <div className="panelNote">Showing the first 8 valid rows.</div>}</div>}
        </div>
      )}
    </div>
  );
}
