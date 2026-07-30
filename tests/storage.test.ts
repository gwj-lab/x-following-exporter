import { describe, expect, test } from "vitest";
import { ExportJobStore, jobStorageKey } from "../lib/storage";
import { createJob } from "../lib/job";

class MemoryStorage {
  readonly values = new Map<string, unknown>();

  async get(key: string): Promise<Record<string, unknown>> {
    return this.values.has(key) ? { [key]: this.values.get(key) } : {};
  }

  async set(items: Record<string, unknown>): Promise<void> {
    for (const [key, value] of Object.entries(items)) this.values.set(key, value);
  }

  async remove(key: string): Promise<void> {
    this.values.delete(key);
  }
}

describe("ExportJobStore", () => {
  test("isolates checkpoints by normalized owner username", async () => {
    const storage = new MemoryStorage();
    const store = new ExportJobStore(storage);
    await store.save(createJob("Alice", 100, 1));
    await store.save(createJob("Bob", 200, 2));

    expect((await store.load("alice"))?.ownerUsername).toBe("Alice");
    expect((await store.load("BOB"))?.ownerUsername).toBe("Bob");
    expect(storage.values.size).toBe(2);
  });

  test("rejects malformed objects read from extension storage", async () => {
    const storage = new MemoryStorage();
    storage.values.set(jobStorageKey("alice"), {
      ownerUsername: "alice",
      status: "running",
      records: [{ username: "<script>", displayName: "bad", profileUrl: "javascript:alert(1)" }]
    });

    expect(await new ExportJobStore(storage).load("alice")).toBeNull();
  });

  test("clears only the requested account checkpoint", async () => {
    const storage = new MemoryStorage();
    const store = new ExportJobStore(storage);
    await store.save(createJob("Alice", 100, 1));
    await store.save(createJob("Bob", 200, 2));
    await store.clear("alice");

    expect(await store.load("alice")).toBeNull();
    expect(await store.load("bob")).not.toBeNull();
  });
});
