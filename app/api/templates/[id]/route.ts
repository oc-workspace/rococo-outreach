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

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const existing = await prisma.emailTemplate.findUnique({ where: { id: params.id } });
  if (!existing) return privateJson({ error: 'Template not found.' }, { status: 404 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  if (Number.isInteger(body.switchToVersion)) {
    const target = await prisma.emailTemplate.findFirst({ where: { templateKey: existing.templateKey, version: body.switchToVersion as number } });
    if (!target) return privateJson({ error: 'Template version not found.' }, { status: 404 });
    const switched = await prisma.$transaction(async (transaction) => {
      await transaction.emailTemplate.updateMany({ where: { templateKey: existing.templateKey }, data: { isCurrent: false } });
      return transaction.emailTemplate.update({ where: { id: target.id }, data: { isCurrent: true, status: 'active' } });
    });
    return privateJson({ data: toTemplate(switched) });
  }
  const parsed = templateContent({
    name: body.name ?? existing.name, description: body.description ?? existing.description,
    subject: body.subject ?? existing.subject, bodyHtml: body.bodyHtml ?? existing.bodyHtml,
    language: body.language ?? existing.language, purpose: body.purpose ?? existing.purpose,
    tags: body.tags ?? existing.tags,
  });
  if (parsed.errors.length > 0) return privateJson({ error: parsed.errors[0], errors: parsed.errors }, { status: 400 });
  const status = body.status === 'archived' || body.status === 'active' ? body.status : existing.status;
  if (body.createVersion !== true) {
    const updated = await prisma.emailTemplate.update({ where: { id: existing.id }, data: { ...parsed.data, status } });
    return privateJson({ data: toTemplate(updated) });
  }
  const maxVersion = (await prisma.emailTemplate.aggregate({ where: { templateKey: existing.templateKey }, _max: { version: true } }))._max.version ?? existing.version;
  const versioned = await prisma.$transaction(async (transaction) => {
    await transaction.emailTemplate.updateMany({ where: { templateKey: existing.templateKey, isCurrent: true }, data: { isCurrent: false } });
    return transaction.emailTemplate.create({ data: { ...parsed.data, templateKey: existing.templateKey, version: maxVersion + 1, isCurrent: true, status } });
  });
  return privateJson({ data: toTemplate(versioned) }, { status: 201 });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const template = await prisma.emailTemplate.update({ where: { id: params.id }, data: { status: 'archived' } });
    return privateJson({ data: toTemplate(template) });
  } catch {
    return privateJson({ error: 'Template not found.' }, { status: 404 });
  }
}

function privateJson(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'no-store, private');
  return NextResponse.json(body, { ...init, headers });
}
