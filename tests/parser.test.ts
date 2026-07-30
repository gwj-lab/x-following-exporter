import { describe, expect, test } from "vitest";
import { parseFollowingRecords } from "../lib/parser";

describe("parseFollowingRecords", () => {
  test("extracts basic fields from user cards in the primary column", () => {
    document.body.innerHTML = `
      <main data-testid="primaryColumn">
        <button data-testid="UserCell">
          <a href="/OpenAI"><span>OpenAI</span></a>
          <a href="/OpenAI"><span>@OpenAI</span></a>
        </button>
      </main>`;

    expect(parseFollowingRecords(document)).toEqual([
      {
        username: "OpenAI",
        displayName: "OpenAI",
        profileUrl: "https://x.com/OpenAI"
      }
    ]);
  });

  test("ignores sidebar recommendations and non-user links", () => {
    document.body.innerHTML = `
      <aside><div data-testid="UserCell"><a href="/SideUser">@SideUser</a></div></aside>
      <main data-testid="primaryColumn">
        <div data-testid="UserCell">
          <a href="/home">Home</a>
          <a href="/Real_User">真实用户</a>
          <a href="/Real_User">@Real_User</a>
        </div>
      </main>`;

    expect(parseFollowingRecords(document)).toEqual([
      {
        username: "Real_User",
        displayName: "真实用户",
        profileUrl: "https://x.com/Real_User"
      }
    ]);
  });

  test("deduplicates virtualized cards case-insensitively while keeping order", () => {
    document.body.innerHTML = `
      <main data-testid="primaryColumn">
        <div data-testid="UserCell"><a href="/Alpha">甲</a><span>@Alpha</span></div>
        <div data-testid="UserCell"><a href="/alpha">甲重复</a><span>@alpha</span></div>
        <div data-testid="UserCell"><a href="/Beta">乙</a><span>@Beta</span></div>
      </main>`;

    expect(parseFollowingRecords(document).map((record) => record.username)).toEqual([
      "Alpha",
      "Beta"
    ]);
  });

  test("falls back to semantic main and button structure when test IDs change", () => {
    document.body.innerHTML = `
      <main role="main">
        <section>
          <div role="button"><a href="/FallbackUser">回退用户</a><span>@FallbackUser</span></div>
        </section>
      </main>`;

    expect(parseFollowingRecords(document)).toEqual([
      {
        username: "FallbackUser",
        displayName: "回退用户",
        profileUrl: "https://x.com/FallbackUser"
      }
    ]);
  });
});
