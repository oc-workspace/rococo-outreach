import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { parseContactCsv, type ContactImportRow } from '@/lib/outreach/contactCsv';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { csv?: unknown; mode?: unknown } | null;
  if (!body || typeof body.csv !== 'string') return NextResponse.json({ error: 'CSV text is required.' }, { status: 400 });

  const mode = body.mode === 'commit' ? 'commit' : body.mode === 'preview' ? 'preview' : null;
  if (!mode) return NextResponse.json({ error: 'Import mode must be preview or commit.' }, { status: 400 });

  const preview = parseContactCsv(body.csv);
  if (mode === 'preview') return NextResponse.json({ data: preview });
  if (preview.issues.length > 0) return NextResponse.json({ error: 'Fix CSV validation issues before importing.', data: preview }, { status: 422 });

  const existingContacts = await prisma.emailContact.findMany({ where: { email: { not: '' } } });
  const existingByEmail = new Map(existingContacts.map((contact) => [contact.email.trim().toLowerCase(), contact]));
  let createdCount = 0;
  let updatedCount = 0;

  await prisma.$transaction(async (transaction) => {
    for (const row of preview.rows) {
      const existing = existingByEmail.get(row.email);
      if (existing) {
        await transaction.emailContact.update({ where: { id: existing.id }, data: toContactData(row) });
        updatedCount += 1;
      } else {
        const created = await transaction.emailContact.create({ data: toContactData(row) });
        existingByEmail.set(row.email, created);
        createdCount += 1;
      }
    }
  });

  return NextResponse.json({ data: { ...preview, createdCount, updatedCount } }, { status: 201 });
}

function toContactData(row: ContactImportRow) {
  return {
    email: row.email,
    displayName: row.displayName,
    salutation: row.salutation,
    language: row.language,
    company: row.company,
    mediaName: row.mediaName,
    role: row.role,
    country: row.country,
    tags: row.tags,
    notes: row.notes,
    status: row.status,
  };
}
