import { useState } from 'react';
import { RichTextEditor } from './RichTextEditor';
import type { EmailDraft, EmailTemplateRecord } from '@/lib/outreach/types';

interface Props {
  campaignName: string;
  draft: EmailDraft;
  draftSaveState: 'idle' | 'saving' | 'saved' | 'error';
  draftSaveError: string | null;
  onCampaignNameChange: (value: string) => void;
  onDraftChange: (patch: Partial<EmailDraft>) => void;
  templates: EmailTemplateRecord[];
  templatesLoading: boolean;
  templatesError: string | null;
  onApplyTemplate: (template: EmailTemplateRecord) => void;
  onSaveTemplate: (input: Partial<EmailTemplateRecord> & { name: string; description: string }) => Promise<void>;
  onUpdateTemplate: (id: string, input: Partial<EmailTemplateRecord> & { createVersion?: boolean }) => Promise<EmailTemplateRecord>;
  onArchiveTemplate: (template: EmailTemplateRecord) => Promise<void>;
  onSwitchTemplateVersion: (template: EmailTemplateRecord, version: number) => Promise<void>;
}

export function CampaignBuilder({ campaignName, draft, draftSaveState, draftSaveError, onCampaignNameChange, onDraftChange, templates, templatesLoading, templatesError, onApplyTemplate, onSaveTemplate, onUpdateTemplate, onArchiveTemplate, onSwitchTemplateVersion }: Props) {
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateLanguage, setTemplateLanguage] = useState('en');
  const [templatePurpose, setTemplatePurpose] = useState('');
  const [templateTags, setTemplateTags] = useState('');
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [versionHistory, setVersionHistory] = useState<Record<string, EmailTemplateRecord[]>>({});
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateMessage, setTemplateMessage] = useState<string | null>(null);

  async function saveTemplate() {
    if (!templateName.trim() || !draft.subject.trim() || !draft.bodyHtml.trim()) return;
    setSavingTemplate(true);
    setTemplateMessage(null);
    try {
      await onSaveTemplate({ name: templateName, description: templateDescription, language: templateLanguage, purpose: templatePurpose, tags: templateTags.split(',').map((tag) => tag.trim()).filter(Boolean) });
      setTemplateName('');
      setTemplateDescription('');
      setTemplateMessage('Template saved.');
    } catch (error) {
      setTemplateMessage(error instanceof Error ? error.message : 'Failed to save template.');
    } finally {
      setSavingTemplate(false);
    }
  }

  return (
    <section className="panel">
      <div className="panelHeader">
        <div>
          <h2 className="panelTitle">Campaign draft</h2>
          <span className={`draftSaveStatus draftSaveStatus-${draftSaveState}`} aria-live="polite">{draftSaveState === 'saving' ? 'Saving draft...' : draftSaveState === 'saved' ? 'Draft saved' : draftSaveState === 'error' ? (draftSaveError || 'Draft save failed') : 'Draft persistence ready'}</span>
          <p className="panelNote">
            Use tokens: <span className="kbd">{'{{salutation}}'}</span> <span className="kbd">{'{{company}}'}</span> <span className="kbd">{'{{mediaName}}'}</span>.
          </p>
        </div>
      </div>
      <div className="panelBody stack">
        <div className="templateLibrary">
          <div className="templateLibraryHeader">
            <div>
              <h3 className="templateTitle">Reusable templates</h3>
              <p className="panelNote">Apply a saved subject and body, or save the current draft for later campaigns.</p>
            </div>
          </div>
          {templatesError && <div className="errorText">{templatesError}</div>}
          {templatesLoading ? <div className="empty">Loading templates...</div> : templates.length === 0 ? <div className="empty">No saved templates yet.</div> : (
            <div className="templateList">
              {templates.map((template) => (
                <div className="templateItem" key={template.id}>
                  <div className="templateItemText">
                    <strong>{template.name} · v{template.version}</strong>
                    {template.description && <span>{template.description}</span>}
                    <small>{template.language} · {template.purpose || 'general'} · {template.status}</small>
                  </div>
                  <div className="rowWrap">
                    <button className="button buttonSmall" type="button" disabled={template.status !== 'active'} onClick={() => onApplyTemplate(template)}>Use</button>
                    <button className="button buttonSmall" type="button" onClick={() => setEditingTemplateId(editingTemplateId === template.id ? null : template.id)}>{editingTemplateId === template.id ? 'Close' : 'Edit'}</button>
                    <button className="button buttonSmall" type="button" onClick={() => onUpdateTemplate(template.id, { name: template.name, description: template.description, subject: template.subject, bodyHtml: template.bodyHtml, language: template.language, purpose: template.purpose, tags: template.tags, createVersion: true })}>New version</button>
                    <button className="button buttonSmall" type="button" onClick={async () => { const response = await fetch(`/api/templates/${template.id}/versions`); const payload = await response.json(); setVersionHistory((current) => ({ ...current, [template.templateKey]: payload.data ?? [] })); }}>Versions</button>
                    <button className="button buttonSmall" type="button" onClick={() => onArchiveTemplate(template)}>{template.status === 'archived' ? 'Restore' : 'Archive'}</button>
                  </div>
                  {editingTemplateId === template.id && <TemplateEditForm template={template} onSave={async (input) => { await onUpdateTemplate(template.id, input); setEditingTemplateId(null); }} />}
                  {versionHistory[template.templateKey] && <div className="templateVersions">{versionHistory[template.templateKey].map((version) => <div className="rowWrap" key={version.id}><span className="pill">v{version.version}{version.isCurrent ? ' current' : ''}</span><span>{version.subject}</span>{!version.isCurrent && <button className="button buttonSmall" type="button" onClick={() => onSwitchTemplateVersion(template, version.version)}>Switch</button>}</div>)}</div>}
                </div>
              ))}
            </div>
          )}
          <div className="rowWrap">
            <div className="field"><label htmlFor="template-name">Template name</label><input id="template-name" className="input" value={templateName} onChange={(event) => setTemplateName(event.target.value)} placeholder="e.g. Japan media intro" /></div>
            <div className="field"><label htmlFor="template-description">Description (optional)</label><input id="template-description" className="input" value={templateDescription} onChange={(event) => setTemplateDescription(event.target.value)} placeholder="When to use this template" /></div>
            <div className="field"><label htmlFor="template-language">Language</label><input id="template-language" className="input" value={templateLanguage} onChange={(event) => setTemplateLanguage(event.target.value)} /></div>
            <div className="field"><label htmlFor="template-purpose">Purpose</label><input id="template-purpose" className="input" value={templatePurpose} onChange={(event) => setTemplatePurpose(event.target.value)} placeholder="media outreach" /></div>
            <div className="field"><label htmlFor="template-tags">Tags</label><input id="template-tags" className="input" value={templateTags} onChange={(event) => setTemplateTags(event.target.value)} placeholder="media, japan" /></div>
            <button className="button buttonPrimary buttonSmall" type="button" onClick={saveTemplate} disabled={savingTemplate || !templateName.trim() || !draft.subject.trim() || !draft.bodyHtml.trim()}>{savingTemplate ? 'Saving...' : 'Save current as template'}</button>
          </div>
          {templateMessage && <div className="successText">{templateMessage}</div>}
        </div>
        <div className="field"><label htmlFor="campaign-name">Campaign name</label><input id="campaign-name" className="input" value={campaignName} onChange={(event) => onCampaignNameChange(event.target.value)} /></div>
        <div className="field"><label htmlFor="campaign-subject">Subject</label><input id="campaign-subject" className="input" value={draft.subject} onChange={(event) => onDraftChange({ subject: event.target.value, updatedAt: new Date().toISOString() })} /></div>
        <div className="field"><label>Rich body HTML</label><RichTextEditor value={draft.bodyHtml} onChange={(bodyHtml) => onDraftChange({ bodyHtml, updatedAt: new Date().toISOString() })} /></div>
      </div>
    </section>
  );
}

function TemplateEditForm({ template, onSave }: { template: EmailTemplateRecord; onSave: (input: Partial<EmailTemplateRecord>) => Promise<void> }) {
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description);
  const [subject, setSubject] = useState(template.subject);
  const [language, setLanguage] = useState(template.language);
  const [purpose, setPurpose] = useState(template.purpose);
  const [tags, setTags] = useState(template.tags.join(', '));
  const [saving, setSaving] = useState(false);
  return <div className="templateEditForm">
    <input className="input" aria-label="Edit template name" value={name} onChange={(event) => setName(event.target.value)} />
    <input className="input" aria-label="Edit template description" value={description} onChange={(event) => setDescription(event.target.value)} />
    <input className="input" aria-label="Edit template subject" value={subject} onChange={(event) => setSubject(event.target.value)} />
    <input className="input" aria-label="Edit template language" value={language} onChange={(event) => setLanguage(event.target.value)} />
    <input className="input" aria-label="Edit template purpose" value={purpose} onChange={(event) => setPurpose(event.target.value)} />
    <input className="input" aria-label="Edit template tags" value={tags} onChange={(event) => setTags(event.target.value)} />
    <button className="button buttonPrimary buttonSmall" type="button" disabled={saving} onClick={async () => { setSaving(true); try { await onSave({ name, description, subject, language, purpose, tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean) }); } finally { setSaving(false); } }}>{saving ? 'Saving...' : 'Save edit'}</button>
  </div>;
}
