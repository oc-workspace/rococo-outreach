import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import type { EmailContact } from '@/lib/outreach/types';

export const dynamic = 'force-dynamic';

const allowedStatuses = new Set(['active', 'inactive', 'blocked']);
const editableFields: Array<keyof EmailContact> = ['email', 'displayName', 'salutation', 'language', 'company', 'mediaName', 'role', 'country', 'tags', 'notes', 'status'];

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((tag) => String(tag).trim()).filter(Boolean);
}

function toContact(contact: {
  id: string;
  email: string;
  displayName: string;
  salutation: string;
  language: string;
  company: string;
  mediaName: string;
  role: string;
  country: string;
  tags: string[];
  notes: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): EmailContact {
  return {
    ...contact,
    status: allowedStatuses.has(contact.status) ? contact.status as EmailContact['status'] : 'active',
    createdAt: contact.createdAt.toISOString(),
    updatedAt: contact.updatedAt.toISOString(),
  };
}

function updateData(body: Partial<EmailContact>) {
  const data: Record<string, string | string[]> = {};

  for (const field of editableFields) {
    if (!(field in body)) continue;

    if (field === 'tags') {
      data.tags = normalizeTags(body.tags);
    } else if (field === 'status') {
      data.status = allowedStatuses.has(body.status ?? '') ? body.status! : 'active';
    } else if (field === 'language') {
      data.language = body.language?.trim() || 'en';
    } else {
      data[field] = String(body[field] ?? '').trim();
    }
  }

  return data;
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const contact = await prisma.emailContact.update({
    where: { id: params.id },
    data: updateData(body),
  });

  return NextResponse.json({ data: toContact(contact) });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  await prisma.emailContact.delete({
    where: { id: params.id },
  });

  return new NextResponse(null, { status: 204 });
}
