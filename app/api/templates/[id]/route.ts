import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import type { EmailTemplateRecord } from '@/lib/outreach/types';

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
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const data: Record<string, string> = {};
  for (const field of ['name', 'description', 'subject', 'bodyHtml'] as const) {
    if (field in body && typeof body[field] === 'string') data[field] = text(body[field]);
  }
  if (body.status === 'active' || body.status === 'archived') data.status = body.status;
  if ('name' in data && !data.name || 'subject' in data && !data.subject || 'bodyHtml' in data && !data.bodyHtml) {
    return NextResponse.json({ error: 'Template name, subject, and bodyHtml cannot be blank.' }, { status: 400 });
  }

  try {
    const template = await prisma.emailTemplate.update({ where: { id: params.id }, data });
    return NextResponse.json({ data: toTemplate(template) });
  } catch {
    return NextResponse.json({ error: 'Template not found.' }, { status: 404 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const template = await prisma.emailTemplate.update({ where: { id: params.id }, data: { status: 'archived' } });
    return NextResponse.json({ data: toTemplate(template) });
  } catch {
    return NextResponse.json({ error: 'Template not found.' }, { status: 404 });
  }
}
