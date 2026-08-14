export interface DnsTxtRecord {
  name: string;
  type: 'TXT';
  value: string;
}

export function buildDnsTxtRecord(domain: string, token: string): DnsTxtRecord {
  return { name: `_rococo-outreach.${domain}`, type: 'TXT', value: token };
}

export function hasMatchingTxtRecord(records: string[][], expectedToken: string): boolean {
  return records.flat().some((record) => record.trim() === expectedToken);
}
