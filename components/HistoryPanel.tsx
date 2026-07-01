import type { CampaignRecord } from '@/lib/outreach/types';

export function HistoryPanel({ campaigns }: { campaigns: CampaignRecord[] }) {
  return (
    <section className="panel">
      <div className="panelHeader">
        <div>
          <h2 className="panelTitle">Campaign history</h2>
          <p className="panelNote">Campaign totals and recipient-level delivery records.</p>
        </div>
      </div>
      <div className="panelBody">
        <div className="historyList">
          {campaigns.map((campaign) => (
            <article className="historyItem" key={campaign.id}>
              <div className="historyTitle"><span>{campaign.name}</span><span>{campaign.status}</span></div>
              <div className="rowWrap"><span className="pill">total {campaign.totalCount}</span><span className="pill">sent {campaign.successCount}</span><span className="pill">failed {campaign.failedCount}</span></div>
              <div className="deliveryGrid">
                {campaign.deliveries.map((delivery) => <><span key={`${delivery.id}-email`}>{delivery.to}</span><span key={`${delivery.id}-status`}>{delivery.sendStatus}</span></>)}
              </div>
            </article>
          ))}
          {campaigns.length === 0 && <div className="empty">No campaigns sent yet.</div>}
        </div>
      </div>
    </section>
  );
}
