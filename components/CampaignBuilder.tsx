import { RichTextEditor } from './RichTextEditor';
import type { EmailDraft } from '@/lib/outreach/types';

interface Props {
  campaignName: string;
  draft: EmailDraft;
  onCampaignNameChange: (value: string) => void;
  onDraftChange: (patch: Partial<EmailDraft>) => void;
}

export function CampaignBuilder({ campaignName, draft, onCampaignNameChange, onDraftChange }: Props) {
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
        <div className="field"><label>Campaign name</label><input className="input" value={campaignName} onChange={(event) => onCampaignNameChange(event.target.value)} /></div>
        <div className="field"><label>Subject</label><input className="input" value={draft.subject} onChange={(event) => onDraftChange({ subject: event.target.value, updatedAt: new Date().toISOString() })} /></div>
        <div className="field"><label>Rich body HTML</label><RichTextEditor value={draft.bodyHtml} onChange={(bodyHtml) => onDraftChange({ bodyHtml, updatedAt: new Date().toISOString() })} /></div>
      </div>
    </section>
  );
}
