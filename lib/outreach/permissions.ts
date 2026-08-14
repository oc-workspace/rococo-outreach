import { NextResponse } from 'next/server';
import { authorizeDevOutreachToken } from './apiAuth';
import { getOutreachActorKey, getOutreachTeamKey, getOutreachWorkspaceKey } from './workspaceScope';

export type OutreachPermission = 'sender:read' | 'sender:write' | 'domain:verify';
export type OutreachRole = 'owner' | 'admin' | 'editor' | 'viewer' | string;

export interface OutreachPrincipal {
  actorKey: string;
  workspaceKey: string;
  teamKey: string;
  role: OutreachRole;
}

const rolePermissions: Record<string, OutreachPermission[]> = {
  owner: ['sender:read', 'sender:write', 'domain:verify'],
  admin: ['sender:read', 'sender:write', 'domain:verify'],
  editor: ['sender:read'],
  viewer: ['sender:read'],
};

export async function requireOutreachPermission(request: Request, permission: OutreachPermission): Promise<OutreachPrincipal | NextResponse> {
  const accessFailure = await authorizeDevOutreachToken(request);
  if (accessFailure) return accessFailure;

  const actorKey = getOutreachActorKey();
  const workspaceKey = getOutreachWorkspaceKey();
  const teamKey = getOutreachTeamKey();
  const { prisma } = await import('@/lib/db/prisma');
  const member = await prisma.outreachMember.findFirst({ where: { actorKey, workspaceKey, teamKey, status: 'active' } });
  if (!member) return privateJson({ error: 'No active workspace membership.' }, { status: 403 });
  if (!hasOutreachPermission(member.role, permission)) return privateJson({ error: 'Insufficient workspace permission.' }, { status: 403 });
  return { actorKey, workspaceKey, teamKey, role: member.role };
}

export function hasOutreachPermission(role: string, permission: OutreachPermission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function isOutreachPrincipal(value: OutreachPrincipal | NextResponse): value is OutreachPrincipal {
  return !(value instanceof NextResponse);
}

function privateJson(body: unknown, init?: ResponseInit): NextResponse {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'no-store, private');
  return NextResponse.json(body, { ...init, headers });
}
