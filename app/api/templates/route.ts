import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import type { EmailTemplateRecord } from '@/lib/outreach/types';
import { sanitizeEmailHtml } from '@/lib/outreach/htmlSafety';

export const dynamic = 'force-dynamic';

function text(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function toTemplate(template: {
  id: string;
  name: string;
  description: string;
  subject: string;
  bodyHtml: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): EmailTemplateRecord {
  return {
    ...template,
    bodyHtml: sanitizeEmailHtml(template.bodyHtml),
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}

function templateData(body: Record<string, unknown>) {
  return {
    name: text(body.name),
    description: text(body.description),
    subject: text(body.subject),
    bodyHtml: sanitizeEmailHtml(text(body.bodyHtml)),
    status: body.status === 'archived' ? 'archived' : 'active',
  };
}

export async function GET() {
  const templates = await prisma.emailTemplate.findMany({
    where: { status: 'active' },
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
  });

  return NextResponse.json({ data: templates.map(toTemplate) });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const data = templateData(body as Record<string, unknown>);
  if (!data.name || !data.subject || !data.bodyHtml) {
    return NextResponse.json({ error: 'Template name, subject, and bodyHtml are required.' }, { status: 400 });
  }

  const template = await prisma.emailTemplate.create({ data });
  return NextResponse.json({ data: toTemplate(template) }, { status: 201 });
}
