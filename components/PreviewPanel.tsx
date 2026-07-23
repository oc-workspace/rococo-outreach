import type { RenderedEmail } from '@/lib/outreach/types';
import type { SendValidationError } from '@/lib/outreach/validation';

interface Props {
  renderedEmails: RenderedEmail[];
  previewed: boolean;
  testSent: boolean;
  confirmArmed: boolean;
  validationErrors: SendValidationError[];
  testRecipientEmail: string;
  senderName: string;
  senderEmail: string;
  replyToEmail: string;
  onTestRecipientEmailChange: (value: string) => void;
  onPreview: () => void;
  onTestSend: () => void;
  onArmConfirm: () => void;
  onRealSend: () => void;
}

export function PreviewPanel({ renderedEmails, previewed, testSent, confirmArmed, validationErrors, testRecipientEmail, senderName, senderEmail, replyToEmail, onTestRecipientEmailChange, onPreview, onTestSend, onArmConfirm, onRealSend }: Props) {
  const warningCount = renderedEmails.reduce((sum, email) => sum + email.warnings.length, 0);
  const groupedErrors = validationErrors.reduce<Record<string, string[]>>((groups, error) => {
    groups[error.section] = [...(groups[error.section] || []), error.message];
    return groups;
  }, {});
  return (
    <section className="panel">
      <div className="panelHeader">
        <div>
          <h2 className="panelTitle">Preview and send</h2>
          <p className="panelNote">Preview renders one final email per recipient before any send action.</p>
        </div>
      </div>
      <div className="panelBody stack">
        <div className="senderPreview"><b>From</b><span>{senderName} &lt;{senderEmail}&gt;</span><b>Reply-to</b><span>{replyToEmail}</span></div>
        <div className="field"><label>Test recipient email</label><input className="input" value={testRecipientEmail} onChange={(event) => onTestRecipientEmailChange(event.target.value)} placeholder="internal-test@rococo.dev" /></div>
        <div className="rowWrap">
          <button className="button" onClick={onPreview}>Preview</button>
          <button className="button" onClick={onTestSend}>Send test</button>
          {!confirmArmed && <button className="button buttonPrimary" onClick={onArmConfirm}>Confirm real send</button>}
          {confirmArmed && <button className="button buttonPrimary" onClick={onRealSend}>Send {renderedEmails.length} independent emails</button>}
          {testSent && <span className="successText">Simulated test complete. No real email sent.</span>}
        </div>
        {!previewed && <div className="empty">Run preview before sending. Send actions will show required-field errors until preview is ready.</div>}
        {validationErrors.length > 0 && (
          <div className="validationList" role="alert">
            {Object.entries(groupedErrors).map(([section, messages]) => (
              <div className="validationGroup" key={section}>
                <b>{section}</b>
                <ul>{messages.map((message) => <li key={message}>{message}</li>)}</ul>
              </div>
            ))}
          </div>
        )}
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
