# 上架 Firefox（addons.mozilla.org）清单

提交入口：<https://addons.mozilla.org/developers/addon/submit/distribution>

## 0. 提交前

1. 把代码提交到 git。源码包只打包已提交的内容；工作区有未提交的改动时，脚本会直接报错退出。
2. 构建、检查、打包：

   ```bash
   bun run build:firefox
   bun run lint:firefox        # 应该是 0 errors（会有 innerHTML 和 Android 版本的 warning，见第 4 节）
   bun run pack:firefox        # 生成 dist/anki-dict-firefox.zip，用来上传
   bun run pack:firefox-source # 生成 dist/anki-dict-firefox-source.zip，审核用的源码
   ```

3. 在真实 Firefox 里跑端到端测试：

   ```bash
   pip install -r scripts/firefox/requirements.txt
   python scripts/firefox/e2e.py dist/firefox dist/e2e
   ```

   它会用临时配置启动 Firefox，在 Wikipedia 和 GitHub（严格 CSP）上用 Alt+点击查词，然后检查以下各项：弹窗生词本、后台播放发音、CSV 导出、通过一个假的 AnkiConnect 同步（含音频媒体文件）、设置页、关闭网站权限后的提示条。不会动你真实的 Anki。

## 1. 分发方式

选 **On this site**，也就是上架到 AMO 公开列表。

## 2. 上传

- 上传 `dist/anki-dict-firefox.zip`。
- 兼容平台只勾 **Firefox**，不勾 Android：Alt+点击在手机上用不了。
- 问到 "Do you need to submit source code?" 时选 **Yes**，上传 `dist/anki-dict-firefox-source.zip`。
- 扩展 ID 是 `@anki-dictionary-helper`。**发布后就不能再改了。**

## 3. 商店信息（英文，可以直接粘贴）

**Name:** Anki Dictionary Helper

**Summary**（250 字符以内）:

> Alt+click any English word to see its Cambridge Dictionary definition, pronunciation and examples, then send your words to Anki as flashcards with one click.

**Description:**

> Look up English words without leaving the page, and turn them into Anki flashcards.
>
> • Alt+click any word to see UK and US pronunciations (with audio), CEFR levels, definitions and example sentences from Cambridge Dictionary
> • Falls back to the Free Dictionary API when Cambridge has no entry
> • Every word you look up is saved to a word list in the toolbar popup
> • Send words straight to Anki through the AnkiConnect add-on, including pronunciation audio that plays offline
> • Or export a CSV for Anki's import, with a ready-made card template in Settings
> • Two themes, no account, no tracking: your word list stays in your browser
>
> Sending to Anki requires the desktop Anki app with the AnkiConnect add-on (code 2055492159).

**Categories:** Language Support

**Support site:** https://github.com/minmaxw1024/anki-dict/issues

**License:** MIT

**Privacy policy:** 粘贴 `PRIVACY.md` 的内容。扩展会把用户选中的单词发给词典网站，按 AMO 的规定属于数据传输，所以必须提供隐私政策。

**Screenshots:** 上传 `docs/amo-screenshots/` 里的 4 张图（都是 1280×800，用 Firefox 实拍），按顺序配下面的说明：

| 文件 | 说明（Caption） |
|---|---|
| `01-lookup.png` | Alt+click a word to see its pronunciation, definition and examples |
| `02-word-list.png` | Every word you look up is saved; send the ones you pick to Anki or export a CSV |
| `03-settings.png` | Pick a theme and connect to Anki through AnkiConnect |
| `04-lookup-british-theme.png` | The British Classic theme |

想重拍的话，运行 `python scripts/firefox/screenshots.py dist/firefox docs/amo-screenshots`。

## 4. 给审核员的说明（Notes to Reviewer，英文，可以直接粘贴）

> **Build:** The extension is bundled with Vite (not minified). The source archive contains a README section "Building the Firefox package"; `npm run build-for-amo` reproduces `dist/firefox/` exactly (Node 18+, Bun is fetched via npx and pinned to 1.4.3 with a frozen lockfile).
>
> **How to test:** Open any English page (e.g. https://en.wikipedia.org/wiki/Serendipity) and Alt+click a word. A popup shows the definition; the word then appears in the toolbar popup. "Send to Anki" needs the Anki desktop app with the AnkiConnect add-on and can be skipped.
>
> **Permissions:** The content script runs on all http/https pages because a lookup can start on any page; it only reacts to Alt+click and makes no requests on its own. Host permissions cover the two dictionary sources (dictionary.cambridge.org, api.dictionaryapi.dev) and AnkiConnect on 127.0.0.1:8765, a local app on the user's own computer.
>
> **Data:** The word the user Alt+clicks is sent to the dictionary sources, declared as `websiteContent` in `data_collection_permissions`. There is no developer server or analytics, and no remote code, fonts or other resources are loaded.
>
> **innerHTML warnings:** Every dynamic value inserted with innerHTML goes through `escapeHtml` in `src/lib/utils.ts` first. The remaining interpolations are constants from the extension itself (theme colors, template text).

## 5. 测试状态

在 Firefox 158 里用 `scripts/firefox/e2e.py` 自动跑过，17 项全部通过：
- Wikipedia 和 GitHub（严格 CSP）上 Alt+点击都能查词；
- 查词时不会顺带打开链接；Esc 能关闭释义框；
- 发音由后台页播放；
- 弹窗和设置页用的是本地打包的字体，不加载任何远程资源；
- CSV 能正常导出；
- 同步到 AnkiConnect 时，请求的来源是 `moz-extension://`，发音作为媒体文件一起发送，笔记类型用的是新模板；
- 收回网站权限后，弹窗顶部会出现提示条。

自动测试覆盖不到、需要手动确认的：

- [ ] 从 AMO 正式安装时（不是临时加载），安装提示里列出了“所有网站”权限和 website content 数据传输。
- [ ] 连真实的 Anki + AnkiConnect 同步一次，卡片能离线放音；旧版本建的笔记类型会自动升级。
- [ ] 点工具栏上真实的弹出面板（不是在标签页里打开的 popup.html）里的 "Allow access" 按钮，会弹出权限请求。

## 6. 之后发新版本

- 每个版本都要先改 `src/manifest.json` 的 `version`（Chrome 和 Firefox 共用），再重新上传 zip 和源码包。
- `data_collection_permissions` 一旦声明，后续每个版本都必须保留。
