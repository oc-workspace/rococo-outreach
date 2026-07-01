# Rococo Outreach Product Plan

## 1. Project Summary

Rococo Outreach is a small-batch, personalized email outreach tool. It combines contact management, rich email editing, per-recipient personalization, safe one-by-one sending, and campaign history tracking.

The product should not behave like a raw bulk email sender. A user may create one campaign with 50 target recipients, but the system must send 50 independent emails. Each recipient sees only their own address in the `To` field and cannot see other recipients.

## 2. MVP Delivery Slice

The first usable version should support:

- Email contact management.
- Creating an outreach email draft.
- Adding/removing recipient rows with `+` and `-` controls.
- Selecting one target email per row.
- Selecting or overriding language per row.
- Selecting or overriding salutation per row.
- Editing email subject and rich-text body.
- Adding links, images, video links, and attachments within controlled limits.
- Previewing the final rendered email for each recipient.
- Sending a test email to the operator.
- Sending the campaign after a second confirmation.
- Recording one campaign plus one delivery record per recipient.

The first version should focus on manual, intentional, low-volume outreach rather than marketing automation.

## 3. End-to-End User Flow

1. User opens `Contacts`.
2. User creates or edits contact records with email, company/media, language, salutation, tags, and notes.
3. User opens `New Campaign`.
4. User enters campaign name, subject, and rich-text email body.
5. User adds recipient rows:
   - Select target email.
   - Select language.
   - Confirm or override salutation.
   - Remove rows if needed.
6. User opens `Preview`.
7. System renders one final email per recipient.
8. User sends a test email to self.
9. User confirms real send.
10. System creates one campaign record.
11. System sends one independent email per recipient.
12. System records per-recipient status.
13. User reviews campaign details and failures.

## 4. Critical Sending Rule

A campaign may contain many recipients, but the delivery layer must send one email per recipient.

Incorrect design:

```text
To: a@example.com, b@example.com, c@example.com
```

Also not recommended as the primary design:

```text
BCC: a@example.com, b@example.com, c@example.com
```

Correct design:

```text
Email 1:
To: a@example.com

Email 2:
To: b@example.com

Email 3:
To: c@example.com
```

This protects recipient privacy, enables per-recipient personalization, and allows independent send status tracking.

## 5. Core Data Model

### EmailContact

```ts
{
  id: string
  email: string
  displayName?: string
  salutation?: string
  language?: 'zh' | 'en' | 'ja' | string
  company?: string
  mediaName?: string
  role?: string
  country?: string
  tags?: string[]
  notes?: string
  status: 'active' | 'inactive' | 'blocked'
  createdAt: Date
  updatedAt: Date
}
```

### EmailDraft

```ts
{
  id: string
  title: string
  subject: string
  bodyHtml: string
  bodyText?: string
  attachments?: Attachment[]
  status: 'draft' | 'ready'
  createdBy: string
  createdAt: Date
  updatedAt: Date
}
```

### EmailCampaign

```ts
{
  id: string
  name: string
  subject: string
  bodyHtml: string
  bodyText?: string
  senderEmail: string
  senderName: string
  totalCount: number
  successCount: number
  failedCount: number
  repliedCount: number
  status: 'draft' | 'previewed' | 'sending' | 'sent' | 'partial_failed' | 'cancelled'
  scheduledAt?: Date
  sentAt?: Date
  createdBy: string
  createdAt: Date
  updatedAt: Date
}
```

### EmailCampaignRecipient

```ts
{
  id: string
  campaignId: string
  contactId?: string
  email: string
  language?: string
  salutation?: string
  renderedSubject: string
  renderedBodyHtml: string
  renderedBodyText?: string
  sendStatus: 'pending' | 'sending' | 'sent' | 'failed' | 'bounced' | 'replied'
  providerMessageId?: string
  errorMessage?: string
  sentAt?: Date
  bouncedAt?: Date
  repliedAt?: Date
}
```

Campaign-level records answer “what was sent as a batch.” Recipient-level records answer “what happened to this one email.”

## 6. MVP Functional Scope

### Contacts

- Create, read, update, delete contacts.
- Search by email, company, media, name, or tag.
- Store salutation as a first-class field.
- Mark contacts as active, inactive, or blocked.

### Campaign Builder

- Create campaign draft.
- Edit subject and rich-text body.
- Add/remove recipient rows.
- Select one contact per row.
- Select language per row.
- Override salutation per row.
- Prevent duplicate recipient emails within one campaign unless explicitly allowed later.

### Rich Text Editor

Support:

- Headings.
- Bold/italic.
- Lists.
- Links.
- Images.
- Video links as URLs or thumbnails linking out.
- Attachments with size and type limits.

Do not allow arbitrary unsafe HTML. Generate a plain-text fallback from the HTML body.

### Preview

- Show the final email for each recipient.
- Show `To`, `Subject`, salutation, HTML preview, text fallback, and attachments.
- Show warnings for missing salutation, invalid email, blocked contact, or missing language.

### Sending

- Support test-send to the operator.
- Require second confirmation for real send.
- Create one campaign record.
- Create one recipient record per target.
- Send one independent email per recipient.
- Store provider message ID and error messages.

### History

- List campaigns.
- Show campaign totals.
- Show recipient-level statuses.
- Allow retry only for failed recipients in a later version.

## 7. Recommended Implementation Phases

### Phase 1: Safe MVP

- Contacts CRUD.
- Campaign draft editor.
- Recipient row UI.
- Per-recipient preview.
- Test send.
- One-by-one sending through Resend.
- Campaign and recipient status records.

### Phase 2: Efficiency

- Bulk select contacts from filters/tags.
- Email templates.
- Variable replacement:
  - `{{salutation}}`
  - `{{displayName}}`
  - `{{company}}`
  - `{{mediaName}}`
  - `{{language}}`
- Failure retry.
- Attachment management.
- Duplicate campaign.

### Phase 3: Operations

- Reply tracking.
- Bounce webhooks.
- Unsubscribe handling.
- Open/click tracking if needed.
- Scheduled sending.
- Rate limits and send queue.
- Audit log.

## 8. Sending Provider Recommendation

Use Resend for the first version.

Sending rule:

```ts
for (const recipient of recipients) {
  await resend.emails.send({
    from: 'Rococo <noreply@rococo.dev>',
    to: [recipient.email],
    subject: recipient.renderedSubject,
    html: recipient.renderedBodyHtml,
    text: recipient.renderedBodyText,
    attachments: recipient.attachments,
  })
}
```

The `to` array should contain only one email address per send call.

## 9. Safety, Rollback, and Operational Rules

Email cannot be recalled after being sent, so prevention matters more than rollback.

Required safeguards:

- Draft state by default.
- Preview required before sending.
- Test-send required or strongly encouraged.
- Show recipient count before sending.
- Show sample rendered emails before sending.
- Require second confirmation.
- Rate limit initial sending, for example 10 emails per minute.
- Allow stopping unsent queued emails.
- Do not retry failures indefinitely.
- Log provider errors.

Rollback behavior:

- Sent emails cannot be unsent.
- Stop remaining pending recipients.
- Mark campaign as `cancelled` or `partial_failed`.
- Retry failed recipients manually later.

## 10. Risks

- Privacy leak if multiple recipients are placed in one `To` or `CC` field.
- Accidental send to wrong recipients.
- Spam/abuse risk if sending volume grows too fast.
- Domain reputation damage without SPF/DKIM/DMARC.
- Email HTML rendering inconsistency across clients.
- Attachment size/type failures.
- Reply tracking requires inbound email or mailbox integration and should not block MVP.

## 11. First Product Boundary Decision

Recommended first boundary: admin/internal tool only.

Do not make this available to general users until permissions, abuse prevention, unsubscribe handling, and account-level sending limits are designed.
