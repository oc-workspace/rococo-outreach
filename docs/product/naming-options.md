# Rococo Outreach Naming Options

## Recommendation

Use `Rococo Outreach`.

It is clear, professional, and accurately describes the goal: small-batch personalized outreach to media, companies, partners, or recruiting contacts. It avoids the negative connotation of “bulk email” or “mass mail.”

Suggested usage:

- Product/project name: `Rococo Outreach`
- Main module name: `Outreach`
- Contacts page: `Contacts`
- Campaign list: `Campaigns`
- Campaign detail: `Campaign Detail`
- Send history: `Campaign History`

Suggested internal paths:

- `/admin/outreach/contacts`
- `/admin/outreach/campaigns`
- `/admin/outreach/campaigns/new`
- `/admin/outreach/campaigns/[id]`

Suggested code/data naming:

- `outreach`
- `emailContacts`
- `emailCampaigns`
- `emailCampaignRecipients`
- `emailDrafts`

One-line positioning:

> Rococo Outreach is an internal tool for small-batch personalized email outreach, contact management, and campaign delivery tracking.

## Option 1: Rococo Outreach

Best default choice.

Pros:

- Professional.
- Easy to understand.
- Works for media outreach, company outreach, partnership outreach, and hiring-related outreach.
- Does not sound like spam or marketing automation.
- Can expand beyond email later.

Cons:

- Slightly broad; the UI should make clear that the first channel is email.

## Option 2: Rococo Mailroom

More playful and internal-tool friendly.

Pros:

- Memorable.
- Feels like a workspace utility.
- Good for an internal admin product.

Cons:

- Less professional if later exposed to external users.
- Does not strongly express campaign tracking or outreach.

## Option 3: Rococo Connect

Broadest expansion name.

Pros:

- Can cover email, LinkedIn, social, partnerships, and future channels.
- Friendly and non-technical.

Cons:

- Too vague for the first version.
- Users may not immediately know it is an email outreach tool.

## Option 4: Rococo Campaigns

Best if the tool becomes a marketing/email campaign system.

Pros:

- Directly maps to campaign records.
- Easy to understand for operations users.

Cons:

- Sounds more like marketing automation.
- Heavier than the current small-batch personalized outreach scope.

## Option 5: Rococo Dispatch

Engineering/operations flavored.

Pros:

- Captures the idea of sending individual deliveries from one task.
- Strong fit for one-by-one send mechanics.

Cons:

- Less friendly for non-technical users.
- Could imply logistics rather than email.

## Final Choice

Use `Rococo Outreach` as the project name.

Use `Campaigns`, `Contacts`, and `Recipients` as core product vocabulary.

Avoid naming it `Bulk Mail`, `Mass Mail`, or `群发邮件工具` in the product UI because those names make the tool sound less careful and increase the mental association with spam.
