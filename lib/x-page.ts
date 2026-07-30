const USERNAME_PATTERN = /^[A-Za-z0-9_]{1,15}$/;

export function findOwnerUsername(root: ParentNode): string | null {
  const link = root.querySelector<HTMLAnchorElement>(
    'a[data-testid="AppTabBar_Profile_Link"][href]'
  );
  if (!link) return null;

  try {
    const url = new URL(link.getAttribute("href") ?? "", "https://x.com");
    const segments = url.pathname.split("/").filter(Boolean);
    const username = segments.length === 1 ? segments[0] : undefined;
    return username && USERNAME_PATTERN.test(username) ? username : null;
  } catch {
    return null;
  }
}

export function followingPageUrl(currentUrl: string, ownerUsername: string): string {
  if (!USERNAME_PATTERN.test(ownerUsername)) throw new Error("无效的 X 用户名");
  const url = new URL(currentUrl);
  if (url.hostname !== "x.com" && url.hostname !== "twitter.com") {
    throw new Error("当前页面不是 X");
  }
  return `${url.origin}/${ownerUsername}/following`;
}

export function isFollowingPage(currentUrl: string, ownerUsername: string): boolean {
  if (!USERNAME_PATTERN.test(ownerUsername)) return false;
  try {
    const url = new URL(currentUrl);
    const segments = url.pathname.split("/").filter(Boolean);
    return (
      (url.hostname === "x.com" || url.hostname === "twitter.com") &&
      segments.length === 2 &&
      segments[0]?.toLowerCase() === ownerUsername.toLowerCase() &&
      segments[1] === "following"
    );
  } catch {
    return false;
  }
}
