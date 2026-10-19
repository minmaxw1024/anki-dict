"""End-to-end check of the Firefox build in a real Firefox, driven by Selenium.

Usage: python scripts/firefox/e2e.py dist/firefox <output dir>
Runs a fake AnkiConnect on 127.0.0.1:8765 so nothing touches a real Anki.
"""
import json
import os
import re
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.actions.action_builder import ActionBuilder
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

EXT_DIR, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
ADDON_ID = "@anki-dictionary-helper"
UUID = "0f5e3c3a-1111-4222-8333-444455556666"
BASE = f"moz-extension://{UUID}"

results = []


def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))
    print(("PASS " if ok else "FAIL ") + name + (f" -- {detail}" if detail else ""), flush=True)


# ---- fake AnkiConnect -------------------------------------------------------
anki_calls = []


class FakeAnki(BaseHTTPRequestHandler):
    def _send(self, payload):
        body = json.dumps(payload).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", self.headers.get("Origin") or "*")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self._send({})

    def do_POST(self):
        req = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        req["_origin"] = self.headers.get("Origin")
        anki_calls.append(req)
        notes = req.get("params", {}).get("notes", [])
        result = {
            "version": 6,
            "createDeck": 1,
            "modelNames": ["Basic"],
            "createModel": {},
            "canAddNotes": [True] * len(notes),
            "addNotes": list(range(1, len(notes) + 1)),
            "deckNames": ["Default", "Anki Dict"],
        }.get(req["action"])
        self._send({"result": result, "error": None})

    def log_message(self, *args):
        pass


server = ThreadingHTTPServer(("127.0.0.1", 8765), FakeAnki)
threading.Thread(target=server.serve_forever, daemon=True).start()

# ---- Firefox ----------------------------------------------------------------
opts = Options()
# Set FIREFOX_BIN if Firefox isn't installed in the default location.
firefox_bin = os.environ.get("FIREFOX_BIN", r"C:\Program Files\Mozilla Firefox\firefox.exe")
if os.path.exists(firefox_bin):
    opts.binary_location = firefox_bin
opts.set_preference("extensions.webextensions.uuids", json.dumps({ADDON_ID: UUID}))
opts.set_preference("browser.download.folderList", 2)
opts.set_preference("browser.download.dir", os.path.abspath(OUT))
opts.set_preference("browser.download.useDownloadDir", True)
opts.set_preference("browser.download.always_ask_before_handling_new_types", False)
opts.set_preference("media.autoplay.default", 0)

# System access lets us open moz-extension:// pages, which WebDriver can't navigate to.
driver = webdriver.Firefox(options=opts, service=Service(service_args=["--allow-system-access"]))
wait = WebDriverWait(driver, 20)


def set_viewport(width, height):
    driver.set_window_size(width, height)
    inner = driver.execute_script("return [window.innerWidth, window.innerHeight]")
    driver.set_window_size(width + (width - inner[0]), height + (height - inner[1]))


def open_ext(path):
    """Open an extension page in a fresh tab, like the toolbar popup/options would."""
    url = BASE + path
    before = set(driver.window_handles)
    with driver.context(driver.CONTEXT_CHROME):
        driver.execute_script(
            "gBrowser.selectedTab = gBrowser.addTab(arguments[0],"
            " {triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal()});",
            url,
        )
    WebDriverWait(driver, 10).until(lambda d: len(set(d.window_handles) - before) == 1)
    driver.switch_to.window((set(driver.window_handles) - before).pop())
    WebDriverWait(driver, 10).until(lambda d: d.current_url.startswith(url))
    wait_loaded()


def wait_loaded():
    WebDriverWait(driver, 20).until(lambda d: d.execute_script("return document.readyState") == "complete")
    time.sleep(1.5)  # content scripts are injected at document_idle


def ext_script(script):
    """Run async JS in an extension page; `done(value)` returns the value."""
    return driver.execute_async_script(
        "const done = arguments[arguments.length - 1];" + script
    )


def alt_click_word(css, pattern=r"^[A-Za-z]{4,12}$", skip=0):
    candidates = [
        el for el in driver.find_elements(By.CSS_SELECTOR, css)
        if el.is_displayed() and re.match(pattern, el.text.strip())
    ]
    # Use the first candidate that is actually on top at its centre once
    # scrolled into view (sticky headers and late layout shifts get in the way).
    el = None
    for candidate in candidates[skip:]:
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'})", candidate)
        time.sleep(1.0)
        on_top = driver.execute_script(
            "const r = arguments[0].getClientRects()[0];"
            "const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);"
            "return !!hit && (hit === arguments[0] || arguments[0].contains(hit));",
            candidate,
        )
        if on_top:
            el = candidate
            break
    word = el.text.strip().lower()
    driver.execute_script("""
      window.__clicks = [];
      window.addEventListener('click', e => window.__clicks.push(e.target.tagName + ':' + (e.target.textContent || '').trim().slice(0, 40)), true);
    """)
    # Click the middle of the word's first line box; an inline element's
    # bounding-box centre can land on its parent instead.
    dx, dy = driver.execute_script(
        "const b = arguments[0].getBoundingClientRect(), r = arguments[0].getClientRects()[0];"
        "return [r.left + r.width / 2 - (b.left + b.width / 2), r.top + r.height / 2 - (b.top + b.height / 2)]",
        el,
    )
    ActionChains(driver).key_down(Keys.ALT).move_to_element_with_offset(el, int(dx), int(dy)).click().key_up(Keys.ALT).perform()
    return word


def wait_for_modal(word):
    try:
        WebDriverWait(driver, 20).until(
            lambda d: d.execute_script(
                "const h = document.querySelector('#anki-dict-modal .anki-dict-word h2');"
                "return h && h.textContent.trim();"
            ) == word
        )
        return driver.execute_script(
            "return document.querySelectorAll('#anki-dict-modal .anki-dict-definition').length"
        )
    except TimeoutException:
        print("  click targets:", driver.execute_script("return window.__clicks"))
        return driver.execute_script(
            "const m = document.querySelector('#anki-dict-modal'); return m ? 'TIMEOUT: ' + m.innerText : 'TIMEOUT: no modal'"
        )


try:
    driver.install_addon(os.path.abspath(EXT_DIR), temporary=True)
    set_viewport(1280, 800)

    # 1. Lookup on Wikipedia
    driver.get("https://en.wikipedia.org/wiki/Serendipity")
    wait_loaded()
    word1 = alt_click_word("#mw-content-text p a")
    defs = wait_for_modal(word1)
    check(f"Wikipedia: Alt+click '{word1}' shows definitions", isinstance(defs, int) and defs > 0, str(defs))
    check("Wikipedia: Alt+click doesn't follow the link", "Serendipity" in driver.current_url)
    has_audio = driver.execute_script("return document.querySelectorAll('#anki-dict-modal .anki-dict-audio-btn').length")
    check("Modal shows audio buttons", has_audio > 0, str(has_audio))
    driver.save_screenshot(os.path.join(OUT, "01-lookup-wikipedia.png"))
    if has_audio:
        driver.find_element(By.CSS_SELECTOR, "#anki-dict-modal .anki-dict-audio-btn").click()
    driver.find_element(By.TAG_NAME, "body").send_keys(Keys.ESCAPE)
    hidden = driver.execute_script("return getComputedStyle(document.getElementById('anki-dict-modal')).display")
    check("Escape closes the modal", hidden == "none", hidden)

    # 2. Lookup on a site with a strict CSP
    driver.get("https://github.com/mozilla/web-ext")
    wait_loaded()
    word2 = alt_click_word("article p a, article li a, article h2", skip=0)
    defs2 = wait_for_modal(word2)
    check(f"GitHub (strict CSP): Alt+click '{word2}' shows definitions", isinstance(defs2, int) and defs2 > 0, str(defs2))
    driver.save_screenshot(os.path.join(OUT, "02-lookup-github.png"))

    # 3. Popup page
    open_ext("/popup/popup.html")
    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, ".word-item")))
    words = driver.execute_script(
        "return [...document.querySelectorAll('.word-title')].map(e => e.textContent)"
    )
    check("Popup lists looked-up words", word1 in words and word2 in words, str(words))
    banner_hidden = driver.execute_script("return document.getElementById('permission-banner').hidden")
    check("Permission banner hidden while access is granted", banner_hidden is True)
    font_ok = ext_script("document.fonts.ready.then(() => done(document.fonts.check('700 16px Nunito')))")
    check("Popup uses bundled Nunito", font_ok)
    remote = driver.execute_script(
        "return performance.getEntriesByType('resource').map(r => r.name).filter(n => !n.startsWith('moz-extension://'))"
    )
    check("Popup loads no remote resources", remote == [], str(remote))

    # 4. play-audio from the background page (Firefox path)
    uk_audio = ext_script(
        f"browser.storage.local.get('word:{word1}').then(d => done(d['word:{word1}']?.pronunciations?.uk?.audioUrl || null))"
    )
    if uk_audio:
        played = ext_script(
            f"browser.runtime.sendMessage({{action: 'play-audio', url: {json.dumps(uk_audio)}}}).then(done, e => done({{success: false, error: String(e)}}))"
        )
        check("Background page plays audio (play-audio)", played.get("success"), str(played))
    else:
        check("Background page plays audio (play-audio)", False, "no UK audio for " + word1)

    # 5. Export CSV
    driver.find_element(By.CSS_SELECTOR, f".word-checkbox[data-word='{word1}']").click()
    driver.find_element(By.ID, "export-btn").click()
    alert = WebDriverWait(driver, 10).until(EC.alert_is_present())
    alert_text = alert.text
    alert.accept()
    time.sleep(1.5)
    csvs = [f for f in os.listdir(OUT) if f.endswith(".csv")]
    check("Export CSV downloads a file", csvs and "Successfully exported" in alert_text, f"{csvs} / {alert_text}")

    # 6. Send to Anki (fake AnkiConnect)
    driver.find_element(By.ID, "send-to-anki").click()
    try:
        alert = WebDriverWait(driver, 30).until(EC.alert_is_present())
    except TimeoutException:
        print("  anki calls:", [c["action"] for c in anki_calls])
        print("  button:", driver.find_element(By.ID, "send-to-anki").text)
        with driver.context(driver.CONTEXT_CHROME):
            driver.save_screenshot(os.path.join(OUT, "debug-send-to-anki.png"))
        raise
    alert_text = alert.text
    alert.accept()
    add = next((c for c in anki_calls if c["action"] == "addNotes"), None)
    check("Send to Anki reports success", alert_text.startswith("Added 1 word"), alert_text)
    if add:
        note = add["params"]["notes"][0]
        audio = note.get("audio", [])
        check("AnkiConnect request comes from moz-extension://", (add["_origin"] or "").startswith("moz-extension://"), add["_origin"])
        check(
            "Note carries downloaded audio as media",
            audio and all(len(a["data"]) > 1000 and a["filename"].endswith(".mp3") for a in audio),
            str([(a["filename"], len(a["data"])) for a in audio]),
        )
        created = next((c for c in anki_calls if c["action"] == "createModel"), None)
        check("Note type created with media-aware template", created and 'class="ad-audio"' in created["params"]["cardTemplates"][0]["Back"])
    else:
        check("AnkiConnect addNotes called", False, str([c["action"] for c in anki_calls]))
    open_ext("/popup/popup.html")
    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, ".word-item")))
    set_viewport(400, 600)
    driver.save_screenshot(os.path.join(OUT, "03-popup-raw.png"))
    set_viewport(1280, 800)

    # 7. Options page
    open_ext("/options/options.html")
    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, ".theme-card")))
    font_ok = ext_script("document.fonts.ready.then(() => done(document.fonts.check('800 16px Nunito')))")
    remote = driver.execute_script(
        "return performance.getEntriesByType('resource').map(r => r.name).filter(n => !n.startsWith('moz-extension://'))"
    )
    check("Options page: bundled font, no remote resources", font_ok and remote == [], f"{font_ok} {remote}")
    driver.save_screenshot(os.path.join(OUT, "04-options.png"))

    # 8. Revoked website access shows the banner
    open_ext("/popup/popup.html")
    wait.until(EC.presence_of_element_located((By.ID, "permission-banner")))
    removed = ext_script(
        "browser.permissions.remove({origins: ['http://*/*', 'https://*/*']}).then(done, e => done(String(e)))"
    )
    open_ext("/popup/popup.html")
    banner_hidden = driver.execute_script("return document.getElementById('permission-banner').hidden")
    check("Banner appears after website access is revoked", removed is True and banner_hidden is False, f"removed={removed}")
finally:
    failed = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(failed)}/{len(results)} checks passed")
    driver.quit()
    server.shutdown()
