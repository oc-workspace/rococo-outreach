import { useState } from 'react';
import { RichTextEditor } from './RichTextEditor';
import type { EmailDraft, EmailTemplateRecord } from '@/lib/outreach/types';

interface Props {
  campaignName: string;
  draft: EmailDraft;
  onCampaignNameChange: (value: string) => void;
  onDraftChange: (patch: Partial<EmailDraft>) => void;
  templates: EmailTemplateRecord[];
  templatesLoading: boolean;
  templatesError: string | null;
  onApplyTemplate: (template: EmailTemplateRecord) => void;
  onSaveTemplate: (name: string, description: string) => Promise<void>;
}

export function CampaignBuilder({ campaignName, draft, onCampaignNameChange, onDraftChange, templates, templatesLoading, templatesError, onApplyTemplate, onSaveTemplate }: Props) {
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateMessage, setTemplateMessage] = useState<string | null>(null);

  async function saveTemplate() {
    if (!templateName.trim() || !draft.subject.trim() || !draft.bodyHtml.trim()) return;
    setSavingTemplate(true);
    setTemplateMessage(null);
    try {
      await onSaveTemplate(templateName, templateDescription);
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
                    <strong>{template.name}</strong>
                    {template.description && <span>{template.description}</span>}
                    <small>{template.subject}</small>
                  </div>
                  <button className="button buttonSmall" type="button" onClick={() => onApplyTemplate(template)}>Use</button>
                </div>
              ))}
            </div>
          )}
          <div className="rowWrap">
            <div className="field"><label htmlFor="template-name">Template name</label><input id="template-name" className="input" value={templateName} onChange={(event) => setTemplateName(event.target.value)} placeholder="e.g. Japan media intro" /></div>
            <div className="field"><label htmlFor="template-description">Description (optional)</label><input id="template-description" className="input" value={templateDescription} onChange={(event) => setTemplateDescription(event.target.value)} placeholder="When to use this template" /></div>
            <button className="button buttonPrimary buttonSmall" type="button" onClick={saveTemplate} disabled={savingTemplate || !templateName.trim() || !draft.subject.trim() || !draft.bodyHtml.trim()}>{savingTemplate ? 'Saving...' : 'Save current as template'}</button>
          </div>
          {templateMessage && <div className="successText">{templateMessage}</div>}
        </div>
        <div className="field"><label>Campaign name</label><input className="input" value={campaignName} onChange={(event) => onCampaignNameChange(event.target.value)} /></div>
        <div className="field"><label>Subject</label><input className="input" value={draft.subject} onChange={(event) => onDraftChange({ subject: event.target.value, updatedAt: new Date().toISOString() })} /></div>
        <div className="field"><label>Rich body HTML</label><RichTextEditor value={draft.bodyHtml} onChange={(bodyHtml) => onDraftChange({ bodyHtml, updatedAt: new Date().toISOString() })} /></div>
      </div>
    </section>
  );
}
