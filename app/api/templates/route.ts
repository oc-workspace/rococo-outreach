import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import type { EmailTemplateRecord } from '@/lib/outreach/types';
import { sanitizeEmailHtml } from '@/lib/outreach/htmlSafety';
import { templateContent } from '@/lib/outreach/templates';

export const dynamic = 'force-dynamic';

type TemplateRow = {
  id: string; templateKey: string; version: number; isCurrent: boolean;
  name: string; description: string; subject: string; bodyHtml: string;
  language: string; purpose: string; tags: string[]; status: string;
  createdAt: Date; updatedAt: Date;
};

function toTemplate(template: TemplateRow): EmailTemplateRecord {
  return { ...template, bodyHtml: sanitizeEmailHtml(template.bodyHtml), createdAt: template.createdAt.toISOString(), updatedAt: template.updatedAt.toISOString() };
}

export async function GET(request: Request) {
  const includeArchived = new URL(request.url).searchParams.get('includeArchived') === 'true';
  const templates = await prisma.emailTemplate.findMany({
    where: { isCurrent: true, ...(includeArchived ? {} : { status: 'active' }) },
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
  });
  return privateJson({ data: templates.map(toTemplate) });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const parsed = templateContent(body);
  if (parsed.errors.length > 0) return privateJson({ error: parsed.errors[0], errors: parsed.errors }, { status: 400 });
  const templateKey = crypto.randomUUID();
  const template = await prisma.emailTemplate.create({ data: { ...parsed.data, templateKey, version: 1, isCurrent: true, status: 'active' } });
  return privateJson({ data: toTemplate(template) }, { status: 201 });
}

function privateJson(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'no-store, private');
  return NextResponse.json(body, { ...init, headers });
}
