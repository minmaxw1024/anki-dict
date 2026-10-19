# 上架 Firefox（addons.mozilla.org）清单

提交入口：<https://addons.mozilla.org/developers/addon/submit/distribution>

## 0. 提交前

1. 把代码提交到 git（源码包只打包已提交的内容）。
2. 构建、检查、打包：

   ```bash
   bun run build:firefox
   bun run lint:firefox        # 应该是 0 errors
   bun run pack:firefox        # 生成 dist/anki-dict-firefox.zip，用来上传
   bun run pack:firefox-source # 生成 dist/anki-dict-firefox-source.zip，审核用的源码
   ```

3. 用 `bun run start:firefox` 在一个临时的 Firefox 配置里实测一遍（测试项见第 5 节）。

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

**Screenshots:** 建议 1280×800，可以复用 Chrome 商店的截图（弹窗查词、生词本、设置页）。

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

## 5. 实测清单（`bun run start:firefox`）

- [ ] 安装时提示的权限包括所有网站和数据传输（website content）。
- [ ] 在 Wikipedia 上 Alt+点击一个单词，弹窗显示释义。点 🔊 能放出声音。
- [ ] 在 CSP 很严格的站点（比如 github.com）上也能查词、放音。
- [ ] 工具栏弹窗里能看到这个词。选中后 Export CSV 能下载文件。
- [ ] Anki 开着并装了 AnkiConnect 时，Send to Anki 成功，卡片能离线放音。
- [ ] 在 `about:addons` → 插件 → 权限里关掉 "Access your data for all websites"，再打开工具栏弹窗，顶部会出现红色提示条。点 "Allow access" 后提示条消失。
- [ ] 设置页的字体正常（Nunito），开发者工具的 Network 面板里没有 fonts.googleapis.com 的请求。

## 6. 之后发新版本

- 每个版本都要先改 `src/manifest.json` 的 `version`（Chrome 和 Firefox 共用），再重新上传 zip 和源码包。
- `data_collection_permissions` 一旦声明，后续每个版本都必须保留。
