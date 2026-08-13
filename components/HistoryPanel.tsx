import type { CampaignQueueSnapshot, CampaignRecord } from '@/lib/outreach/types';

export function HistoryPanel({ campaigns, loading = false, error = null, queueSnapshot = null, onRetry, retryingCampaignId = null, onCancel, cancellingCampaignId = null }: { campaigns: CampaignRecord[]; loading?: boolean; error?: string | null; queueSnapshot?: CampaignQueueSnapshot | null; onRetry?: (campaignId: string) => void; retryingCampaignId?: string | null; onCancel?: (campaignId: string) => void; cancellingCampaignId?: string | null }) {
  return (
    <section className="panel">
      <div className="panelHeader">
        <div>
          <h2 className="panelTitle">Campaign history</h2>
          <p className="panelNote">Campaign totals and recipient-level delivery records.</p>
        </div>
      </div>
      {queueSnapshot && <div className="panelBody"><div className="rowWrap"><span className="pill">Queue {queueSnapshot.worker}</span><span className="pill">active campaigns {queueSnapshot.activeCampaigns}</span><span className="pill">pending {queueSnapshot.pendingDeliveries}</span><span className="pill">sending {queueSnapshot.sendingDeliveries}</span>{queueSnapshot.nextAllowedAt && <span className="pill">next slot {new Date(queueSnapshot.nextAllowedAt).toLocaleTimeString()}</span>}{queueSnapshot.lastError && <span className="pill statusBlocked">last error {queueSnapshot.lastError}</span>}</div></div>}
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
              {campaign.auditLogs.length > 0 && <details><summary>Audit trail ({campaign.auditLogs.length})</summary><div className="deliveryGrid">{campaign.auditLogs.slice(0, 8).map((log) => <><span key={`${log.id}-action`}>{log.action}</span><span key={`${log.id}-time`}>{new Date(log.createdAt).toLocaleString()} · {log.actor}</span></>)}</div></details>}
            </article>
          ))}
          {campaigns.length === 0 && <div className="empty">No campaigns sent yet.</div>}
        </div>
      </div>
    </section>
  );
}
