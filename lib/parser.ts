import type { FollowingRecord } from "./types";

const USERNAME_PATTERN = /^[A-Za-z0-9_]{1,15}$/;
const RESERVED_PATHS = new Set([
  "compose",
  "explore",
  "home",
  "i",
  "messages",
  "notifications",
  "search",
  "settings"
]);

function usernameFromHref(href: string): string | null {
  try {
    const url = new URL(href, "https://x.com");
    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length !== 1) return null;

    const username = segments[0];
    if (!username || !USERNAME_PATTERN.test(username)) return null;
    if (RESERVED_PATHS.has(username.toLowerCase())) return null;
    return username;
  } catch {
    return null;
  }
}

function getDisplayName(card: Element, username: string): string {
  const matchingAnchors = Array.from(card.querySelectorAll<HTMLAnchorElement>("a[href]"))
    .filter((anchor) => usernameFromHref(anchor.getAttribute("href") ?? "")?.toLowerCase() === username.toLowerCase());

  for (const anchor of matchingAnchors) {
    const text = anchor.textContent?.trim() ?? "";
    if (text && text.toLowerCase() !== `@${username.toLowerCase()}`) return text;
  }

  return username;
}

export function parseFollowingRecords(root: ParentNode): FollowingRecord[] {
  const primaryColumn =
    root.querySelector('[data-testid="primaryColumn"]') ?? root.querySelector('main[role="main"]');
  if (!primaryColumn) return [];

  const records: FollowingRecord[] = [];
  const seen = new Set<string>();
  const testedCards = Array.from(primaryColumn.querySelectorAll('[data-testid="UserCell"]'));
  const semanticCards = testedCards.length
    ? []
    : Array.from(primaryColumn.querySelectorAll<HTMLAnchorElement>("a[href]")).flatMap(
        (anchor) => {
          const username = usernameFromHref(anchor.getAttribute("href") ?? "");
          const card = anchor.closest('[role="button"], article, li');
          return username && card?.textContent?.includes(`@${username}`) ? [card] : [];
        }
      );
  const cards = Array.from(new Set([...testedCards, ...semanticCards]));

  for (const card of cards) {
    const usernames = Array.from(card.querySelectorAll<HTMLAnchorElement>("a[href]"))
      .map((anchor) => usernameFromHref(anchor.getAttribute("href") ?? ""))
      .filter((value): value is string => value !== null);
    const handleMatch = card.textContent?.match(/@([A-Za-z0-9_]{1,15})(?:\b|$)/);
    const username = handleMatch?.[1]
      ? usernames.find((value) => value.toLowerCase() === handleMatch[1]?.toLowerCase())
      : usernames[0];

    if (!username || seen.has(username.toLowerCase())) continue;
    seen.add(username.toLowerCase());
    records.push({
      username,
      displayName: getDisplayName(card, username),
      profileUrl: `https://x.com/${username}`
    });
  }

  return records;
}
