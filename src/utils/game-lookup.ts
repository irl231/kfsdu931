/**
 * Game Lookup Utilities
 * Caches game lookups by domain for O(1) access instead of O(n)
 */

import { GAMES } from "@web/pages/launcher/constants";
import { parse as parseTLD } from "tldts";

interface GameDomainMap {
  [domain: string]: (typeof GAMES)[0];
}

let gameDomainCache: GameDomainMap | null = null;

/**
 * Build and cache game lookup map by domain
 */
function buildGameDomainMap(): GameDomainMap {
  if (gameDomainCache) return gameDomainCache;

  const map: GameDomainMap = {};

  for (const game of GAMES) {
    const homeUrl = new URL(game.url.home);
    const gameUrl = new URL(game.url.game);

    const homeDomain = parseTLD(homeUrl.hostname).domain;
    const gameDomain = parseTLD(gameUrl.hostname).domain;

    if (homeDomain) map[homeDomain] = game;
    if (gameDomain) map[gameDomain] = game;
  }

  gameDomainCache = map;
  return map;
}

/**
 * Find game by domain (O(1) lookup after first call)
 */
export function findGameByDomain(
  domain: string,
): (typeof GAMES)[0] | undefined {
  const map = buildGameDomainMap();
  return map[domain];
}

/**
 * Find game by URL
 */
export function findGameByUrl(url: string): (typeof GAMES)[0] | undefined {
  try {
    const parsed = new URL(url);
    const tld = parseTLD(parsed.hostname);
    return tld.domain ? findGameByDomain(tld.domain) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Clear cache (for testing or refresh)
 */
export function clearGameCache(): void {
  gameDomainCache = null;
}
