import type { CampaignRecord } from '@/lib/outreach/types';

export function HistoryPanel({ campaigns, loading = false, error = null, onRetry, retryingCampaignId = null, onCancel, cancellingCampaignId = null }: { campaigns: CampaignRecord[]; loading?: boolean; error?: string | null; onRetry?: (campaignId: string) => void; retryingCampaignId?: string | null; onCancel?: (campaignId: string) => void; cancellingCampaignId?: string | null }) {
  return (
    <section className="panel">
      <div className="panelHeader">
        <div>
          <h2 className="panelTitle">Campaign history</h2>
          <p className="panelNote">Campaign totals and recipient-level delivery records.</p>
        </div>
      </div>
      <div className="panelBody">
        {loading && <div className="empty">Loading campaign history...</div>}
        {error && <div className="warning">{error}</div>}
        <div className="historyList">
          {campaigns.map((campaign) => (
            <article className="historyItem" key={campaign.id}>
              <div className="historyTitle"><span>{campaign.name}</span><span>{campaign.status}</span></div>
              <div className="rowWrap"><span className="pill">From {campaign.senderName} &lt;{campaign.senderEmail}&gt;</span><span className="pill">Reply-to {campaign.replyToEmail}</span><span className="pill">total {campaign.totalCount}</span><span className="pill">sent {campaign.successCount}</span><span className="pill">failed {campaign.failedCount}</span><span className="pill">cancelled {campaign.cancelledCount}</span>{campaign.failedCount > 0 && onRetry && <button className="button" type="button" onClick={() => onRetry(campaign.id)} disabled={retryingCampaignId === campaign.id}>{retryingCampaignId === campaign.id ? 'Retrying...' : 'Retry failed recipients'}</button>}{(campaign.status === 'queued' || campaign.status === 'sending') && onCancel && <button className="button" type="button" onClick={() => onCancel(campaign.id)} disabled={cancellingCampaignId === campaign.id}>{cancellingCampaignId === campaign.id ? 'Stopping...' : 'Stop unsent deliveries'}</button>}</div>
              <div className="deliveryGrid">
                {campaign.deliveries.map((delivery) => <><span key={`${delivery.id}-email`}>{delivery.to}</span><span key={`${delivery.id}-status`}>{delivery.sendStatus} · attempts {delivery.attemptCount}</span></>)}
              </div>
            </article>
          ))}
          {campaigns.length === 0 && <div className="empty">No campaigns sent yet.</div>}
        </div>
      </div>
    </section>
  );
}
