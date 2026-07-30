import { browser } from "wxt/browser";
import { isDownloadRequest } from "../lib/protocol";

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(async (message) => {
    if (!isDownloadRequest(message)) return undefined;

    try {
      const downloadId = await browser.downloads.download({
        url: `data:text/csv;charset=utf-8,${encodeURIComponent(message.csv)}`,
        filename: message.filename,
        saveAs: false
      });
      return { ok: true, downloadId };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "无法创建下载文件"
      };
    }
  });
});
