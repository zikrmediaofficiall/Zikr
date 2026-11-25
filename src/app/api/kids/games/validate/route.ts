/**
 * Games validation API.
 * Checks the live runtime registry only and returns a minimal summary
 * (no game internals) so it is safe to leave reachable in production.
 */
import { NextResponse } from 'next/server';
import { GAME_REGISTRY } from '@/lib/games/registry';

export async function GET() {
  try {
    const games = Object.values(GAME_REGISTRY);
    const checks = {
      hasGames: games.length > 0,
      allHaveIcons: games.every(g => typeof g.icon === 'string' && g.icon.trim().length > 0),
      allHaveDescriptions: games.every(g => Boolean(g.descriptionAr?.trim() && g.descriptionEn?.trim())),
      allHaveAgeGroups: games.every(g => Array.isArray(g.supportedAgeGroups) && g.supportedAgeGroups.length > 0),
      allHaveDifficulties: games.every(g => Array.isArray(g.difficulties) && g.difficulties.length > 0),
      allHaveRuntimeKinds: games.every(g => typeof g.runtimeKind === 'string' && g.runtimeKind.trim().length > 0),
      allHaveValidScoringBounds: games.every(g =>
        Number.isFinite(g.maxScore) && g.maxScore > 0 &&
        Number.isFinite(g.maxCollectibles) && g.maxCollectibles >= 0 &&
        Number.isFinite(g.maxDistance) && g.maxDistance >= 0
      ),
    };
    const ok = Object.values(checks).every(Boolean);
    return NextResponse.json(
      { timestamp: new Date().toISOString(), status: ok ? 'success' : 'warning', total: games.length, checks },
      { status: ok ? 200 : 503 }
    );
  } catch {
    return NextResponse.json({ status: 'error', message: 'Validation failed' }, { status: 500 });
  }
}
