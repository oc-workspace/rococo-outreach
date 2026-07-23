import type { EmailSender } from '@/lib/outreach/types';

interface Props {
  senders: EmailSender[];
  selectedSenderId: string;
  replyToEmail: string;
  onSenderChange: (senderId: string) => void;
  onReplyToEmailChange: (value: string) => void;
}

function senderLabel(sender: EmailSender) {
  return sender.displayName + ' <' + sender.email + '>';
}

export function SenderSettings({ senders, selectedSenderId, replyToEmail, onSenderChange, onReplyToEmailChange }: Props) {
  const selectedSender = senders.find((sender) => sender.id === selectedSenderId);
  const isVerified = Boolean(selectedSender?.domainVerified && selectedSender.senderVerified && selectedSender.status === 'active');

  return (
    <section className="panel">
      <div className="panelHeader">
        <div>
          <h2 className="panelTitle">Sender settings</h2>
          <p className="panelNote">Choose the sender shown to recipients. Reply-to defaults to the same mailbox.</p>
        </div>
        {selectedSender && <span className={isVerified ? 'pill statusActive' : 'pill statusBlocked'}>{isVerified ? 'Verified' : 'Not verified'}</span>}
      </div>
      <div className="panelBody stack">
        <div className="field">
          <label>Sender shown to recipients</label>
          <select className="select" value={selectedSenderId} onChange={(event) => onSenderChange(event.target.value)}>
            {senders.map((sender) => <option key={sender.id} value={sender.id}>{senderLabel(sender)}</option>)}
          </select>
        </div>
        <div className="field"><label>Reply-to email</label><input className="input" value={replyToEmail} onChange={(event) => onReplyToEmailChange(event.target.value)} /></div>
        {selectedSender && <div className="senderHint">Domain {selectedSender.domain}: {selectedSender.domainVerified ? 'verified' : 'not verified'} · Sender: {selectedSender.senderVerified ? 'verified' : 'not verified'}</div>}
      </div>
    </section>
  );
}
