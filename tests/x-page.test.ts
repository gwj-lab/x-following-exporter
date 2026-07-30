import { describe, expect, test } from "vitest";
import { findOwnerUsername, followingPageUrl, isFollowingPage } from "../lib/x-page";

describe("X page helpers", () => {
  test("finds the logged-in owner from the profile navigation link", () => {
    document.body.innerHTML = `
      <nav><a data-testid="AppTabBar_Profile_Link" href="/My_Account">Profile</a></nav>`;
    expect(findOwnerUsername(document)).toBe("My_Account");
  });

  test("rejects missing or non-profile navigation links", () => {
    document.body.innerHTML = `<a data-testid="AppTabBar_Profile_Link" href="/settings/profile">Profile</a>`;
    expect(findOwnerUsername(document)).toBeNull();
  });

  test("builds and recognizes only the owner's following page", () => {
    expect(followingPageUrl("https://twitter.com/home", "Owner")).toBe(
      "https://twitter.com/Owner/following"
    );
    expect(isFollowingPage("https://x.com/owner/following", "Owner")).toBe(true);
    expect(isFollowingPage("https://x.com/other/following", "Owner")).toBe(false);
  });
});
