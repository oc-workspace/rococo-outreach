import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import type { EmailContact } from '@/lib/outreach/types';

export const dynamic = 'force-dynamic';

const allowedStatuses = new Set(['active', 'inactive', 'blocked']);

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

function createData(body: Partial<EmailContact>) {
  return {
    email: body.email?.trim() ?? '',
    displayName: body.displayName?.trim() ?? '',
    salutation: body.salutation?.trim() ?? '',
    language: body.language?.trim() || 'en',
    company: body.company?.trim() ?? '',
    mediaName: body.mediaName?.trim() ?? '',
    role: body.role?.trim() ?? '',
    country: body.country?.trim() ?? '',
    tags: normalizeTags(body.tags),
    notes: body.notes?.trim() ?? '',
    status: allowedStatuses.has(body.status ?? '') ? body.status! : 'active',
  };
}

export async function GET() {
  const contacts = await prisma.emailContact.findMany({
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
  });

  return NextResponse.json({ data: contacts.map(toContact) });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const contact = await prisma.emailContact.create({
    data: createData(body),
  });

  return NextResponse.json({ data: toContact(contact) }, { status: 201 });
}
