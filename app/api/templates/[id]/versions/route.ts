import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import type { EmailTemplateRecord } from '@/lib/outreach/types';
import { sanitizeEmailHtml } from '@/lib/outreach/htmlSafety';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const template = await prisma.emailTemplate.findUnique({ where: { id: params.id } });
  if (!template) return privateJson({ error: 'Template not found.' }, { status: 404 });
  const versions = await prisma.emailTemplate.findMany({ where: { templateKey: template.templateKey }, orderBy: { version: 'desc' } });
  return privateJson({ data: versions.map((item): EmailTemplateRecord => ({ ...item, bodyHtml: sanitizeEmailHtml(item.bodyHtml), createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() })) });
}

function privateJson(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'no-store, private');
  return NextResponse.json(body, { ...init, headers });
}
