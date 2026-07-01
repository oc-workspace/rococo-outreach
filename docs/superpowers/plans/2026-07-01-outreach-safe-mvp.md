# Rococo Outreach Safe MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build and deploy the first safe internal MVP for Rococo Outreach from `docs/product/product-plan.md`.

**Architecture:** Implement a standalone Next.js internal tool with local React state and an explicit service layer for contacts, drafts, previews, test-send simulation, and one-by-one campaign sending simulation. The first phase prioritizes correct UI state modeling, per-recipient privacy, preview-before-send safeguards, and deployment readiness; real provider/database integration remains behind clear boundaries.

**Tech Stack:** Next.js 14, React 18, TypeScript, CSS modules/global CSS, Docker multi-stage build, docker compose.

## Global Constraints

- A campaign with many recipients must send one independent email per recipient.
- Never put multiple campaign recipients in one `To` or `CC` field.
- MVP is admin/internal only.
- Preview is required before real send.
- Second confirmation is required before real send.
- The first version focuses on manual, intentional, low-volume outreach.

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.js`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`
- Create: `.gitignore`

**Interfaces:**
- Produces a Next.js app runnable with `yarn build` and `yarn start`.

- [x] Create package/config files with Next.js standalone output.
- [x] Create root layout and page entry.
- [x] Run `yarn install` and `yarn build`.

### Task 2: Outreach Domain Model

**Files:**
- Create: `lib/outreach/types.ts`
- Create: `lib/outreach/seed.ts`
- Create: `lib/outreach/render.ts`
- Create: `lib/outreach/send.ts`

**Interfaces:**
- `renderRecipientEmail(input): RenderedEmail`
- `sendCampaignOneByOne(campaign): CampaignSendResult`

- [x] Define contact, draft, campaign, recipient, preview, and send status types.
- [x] Seed internal sample contacts.
- [x] Implement salutation/body rendering and plain-text fallback.
- [x] Implement one-by-one simulated send with one address per delivery record.

### Task 3: Safe MVP UI

**Files:**
- Create: `components/OutreachApp.tsx`
- Create: `components/ContactPanel.tsx`
- Create: `components/CampaignBuilder.tsx`
- Create: `components/RecipientRows.tsx`
- Create: `components/PreviewPanel.tsx`
- Create: `components/HistoryPanel.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- `OutreachApp` owns app state and passes focused props to panels.

- [x] Implement Contacts CRUD/search UI.
- [x] Implement campaign editor with subject/body.
- [x] Implement `+` and `-` recipient rows, one selected email per row, language/salutation override.
- [x] Prevent duplicate recipient emails.
- [x] Implement per-recipient preview with warnings.
- [x] Implement test-send and second-confirm real-send simulation.
- [x] Record campaign history and per-recipient statuses.

### Task 4: Deployment Configuration

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `.env.example`
- Create: `docs/deploy/outreach-dev.md`

**Interfaces:**
- Compose service exposes internal app port `3000` and host port configured by env.

- [x] Mirror main-app-dev Docker multi-stage style.
- [x] Add compose config for `rococo-outreach-dev`.
- [x] Document domain binding expectations for `outreach-dev.rococo.dev`.
- [x] Build Docker image and start container on server.
- [x] Verify HTTP 200 through local port, then domain.

### Task 5: Finish

**Files:**
- Modify: plan checkboxes as completed.

- [x] Run `yarn build`.
- [x] Run Docker compose build/up.
- [x] Verify endpoint returns 200.
- [x] Commit and push to `https://github.com/oc-workspace/rococo-outreach`.
- [x] Report commit, deployment URL, and remaining product gaps.
