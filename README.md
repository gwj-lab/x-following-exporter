# X 关注导出器

一个完全在本机运行的 Chrome 扩展，用自动滚动方式导出当前登录账号在 X（Twitter）上正在关注的用户。

扩展不使用 X API，不读取或上传 Cookie，不调用未公开的 GraphQL 接口。导出的 CSV 包含：

| 字段 | 内容 |
| --- | --- |
| `username` | 不带 `@` 的用户名 |
| `display_name` | 页面显示名称 |
| `profile_url` | `https://x.com/<username>` 主页链接 |

## 安装

### 使用构建结果

1. 安装 Node.js 20.19+。
2. 在项目目录运行：

   ```powershell
   npm install
   npm run build
   ```

3. 打开 Chrome 的 `chrome://extensions/`。
4. 开启右上角的“开发者模式”。
5. 点击“加载已解压的扩展程序”，选择 `.output/chrome-mv3`。

### 开发模式

```powershell
npm install
npm run dev
```

WXT 会在 `.output/chrome-mv3-dev` 生成开发版本。首次使用时仍需通过 `chrome://extensions/` 加载该目录。

## 使用

1. 在 Chrome 中登录 [x.com](https://x.com)。
2. 保持任意 X 标签页为当前活动标签页，点击扩展图标。
3. 点击“开始导出”。扩展会转到当前账号的“正在关注”页面并自动滚动。
4. 导出期间保持该 X 标签页打开，不要手动切换到其他 X 页面。
5. 完成后 Chrome 会自动下载 `x-following-YYYYMMDD-HHmmss.csv`。

可以随时暂停；进度保存在 `chrome.storage.local`，刷新页面或关闭弹窗后仍能继续。点击“停止并导出”会下载已有数据，文件名带有 `-partial`。

## 隐私与权限

- `storage`：仅保存当前账号的导出检查点。
- `downloads`：创建 CSV 下载。
- `https://x.com/*`、`https://twitter.com/*`：读取正在关注页面中已经展示的用户卡片。

项目没有服务端、遥测、远程代码或账号凭据配置。成功下载后会删除对应账号的任务检查点；不同账号使用相互隔离的存储键。

## 已知限制

- 只支持当前登录账号的“正在关注”列表，不支持粉丝或其他账号。
- 不导出数值型用户 ID、简介、粉丝数等页面卡片未稳定展示的字段。
- CSV 顺序是 X 页面提供的展示顺序，不代表关注时间。
- X 使用虚拟滚动和动态加载，约 2,000 个关注可能需要几十分钟；网络慢时不要关闭标签页。
- X 页面结构变化可能导致扩展暂停并显示“页面结构已变化”。此时不要把部分结果当成完整列表。

## 页面结构变化后的维护

采集器优先读取主内容区中的 `[data-testid="UserCell"]`，并提供 `main[role="main"]`、`[role="button"]`、`article` 和 `li` 的语义结构回退。若 X 同时改变两层结构：

1. 在开发者工具中检查关注账号卡片的新稳定语义。
2. 更新 `lib/parser.ts`，不要扩大到侧栏或全页面选择器。
3. 在 `tests/parser.test.ts` 添加脱敏 HTML fixture，先确认新测试失败，再修改解析器。
4. 运行完整验证：

   ```powershell
   npm test
   npm run typecheck
   npm run build
   ```

## 项目结构

- `entrypoints/x-collector.content.ts`：页面采集循环、暂停恢复和错误处理。
- `entrypoints/background.ts`：校验下载请求并创建 CSV 文件。
- `entrypoints/popup/`：中文操作界面。
- `lib/`：DOM 解析、任务状态、检查点、CSV 与消息协议等可测试逻辑。
- `tests/`：Vitest + jsdom 行为测试。

## 手工验收清单

- 小列表能够自动完成，CSV 数量和页面一致。
- 长列表能够持续滚动、去重并完成下载。
- 暂停、刷新 X 页面、重新打开弹窗后可以继续。
- 手动停止生成 `-partial.csv`。
- 未登录时显示操作指引，不创建空的“完整”导出。
- CSV 中含中文、逗号、引号和换行的显示名可被 Excel 正确打开。
