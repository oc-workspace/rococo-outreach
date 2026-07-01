import type { RenderedEmail } from '@/lib/outreach/types';

interface Props {
  renderedEmails: RenderedEmail[];
  previewed: boolean;
  testSent: boolean;
  canSend: boolean;
  confirmArmed: boolean;
  onPreview: () => void;
  onTestSend: () => void;
  onArmConfirm: () => void;
  onRealSend: () => void;
}

export function PreviewPanel({ renderedEmails, previewed, testSent, canSend, confirmArmed, onPreview, onTestSend, onArmConfirm, onRealSend }: Props) {
  const warningCount = renderedEmails.reduce((sum, email) => sum + email.warnings.length, 0);
  return (
    <section className="panel">
      <div className="panelHeader">
        <div>
          <h2 className="panelTitle">Preview and send</h2>
          <p className="panelNote">Preview renders one final email per recipient before any send action.</p>
        </div>
      </div>
      <div className="panelBody stack">
        <div className="rowWrap">
          <button className="button" onClick={onPreview}>Preview</button>
          <button className="button" onClick={onTestSend} disabled={!previewed}>Send test</button>
          {!confirmArmed && <button className="button buttonPrimary" onClick={onArmConfirm} disabled={!canSend}>Confirm real send</button>}
          {confirmArmed && <button className="button buttonPrimary" onClick={onRealSend} disabled={!canSend}>Send {renderedEmails.length} independent emails</button>}
          {testSent && <span className="successText">Test send simulated</span>}
        </div>
        {!previewed && <div className="empty">Run preview before sending. Real send stays disabled until preview passes.</div>}
        {warningCount > 0 && <div className="warning">{warningCount} warning(s) found. Fix blocked, invalid, duplicate, or missing fields before sending.</div>}
        <div className="previewList">
          {renderedEmails.map((email) => (
            <article className="previewCard" key={email.rowId}>
              <div className="previewMeta"><b>To</b><span>{email.to}</span><b>Subject</b><span>{email.subject}</span><b>Greeting</b><span>{email.salutation || 'Missing'}</span></div>
              {email.warnings.map((warning) => <div className="warning" key={warning}>{warning}</div>)}
              <div className="emailBody" dangerouslySetInnerHTML={{ __html: email.bodyHtml }} />
              <pre className="plainText">{email.bodyText}</pre>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
