import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
    name: "X 关注导出器",
    description: "在本地批量导出自己正在关注的 X 账号。",
    version: "0.1.0",
    permissions: ["storage", "downloads"],
    host_permissions: ["https://x.com/*", "https://twitter.com/*"]
  }
});
