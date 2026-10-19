"""Capture 1280x800 listing screenshots of the Firefox build.

Usage: python scripts/firefox/screenshots.py dist/firefox docs/amo-screenshots
"""
import io
import json
import os
import sys
import time

from PIL import Image
from selenium import webdriver
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.support.ui import WebDriverWait

EXT_DIR, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
UUID = "0f5e3c3a-1111-4222-8333-444455556666"
BASE = f"moz-extension://{UUID}"
W, H = 1280, 800

opts = Options()
# Set FIREFOX_BIN if Firefox isn't installed in the default location.
firefox_bin = os.environ.get("FIREFOX_BIN", r"C:\Program Files\Mozilla Firefox\firefox.exe")
if os.path.exists(firefox_bin):
    opts.binary_location = firefox_bin
opts.set_preference("extensions.webextensions.uuids", json.dumps({"@anki-dictionary-helper": UUID}))
opts.set_preference("layout.css.devPixelsPerPx", "1.0")
driver = webdriver.Firefox(options=opts, service=Service(service_args=["--allow-system-access"]))
wait = WebDriverWait(driver, 20)


def set_viewport(width, height):
    driver.set_window_size(width, height)
    inner = driver.execute_script("return [window.innerWidth, window.innerHeight]")
    driver.set_window_size(width + (width - inner[0]), height + (height - inner[1]))


def loaded():
    wait.until(lambda d: d.execute_script("return document.readyState") == "complete")
    time.sleep(1.5)


def open_ext(path):
    before = set(driver.window_handles)
    with driver.context(driver.CONTEXT_CHROME):
        driver.execute_script(
            "gBrowser.selectedTab = gBrowser.addTab(arguments[0],"
            " {triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal()});",
            BASE + path,
        )
    wait.until(lambda d: len(set(d.window_handles) - before) == 1)
    driver.switch_to.window((set(driver.window_handles) - before).pop())
    loaded()


def lookup_plain_word(candidates, exclude=()):
    """Select a visible plain-text word (not a link) and Alt+click it.

    Tries each candidate in turn; returns the word whose definition appeared.
    """
    for w in candidates:
        if w in exclude:
            continue
        driver.execute_script("const t = document.getElementById('__target'); if (t) t.removeAttribute('id');")
        found = driver.execute_script(
            """
            const w = arguments[0];
            const walker = document.createTreeWalker(document.querySelector('#mw-content-text'), NodeFilter.SHOW_TEXT);
            const isLetter = c => !!c && /[A-Za-z]/.test(c);
            for (let n; (n = walker.nextNode());) {
              if (n.parentElement.closest('a, sup, table, .reflist, .hatnote, figure, .infobox')) continue;
              if (!n.parentElement.closest('p')) continue;
              const text = n.textContent;
              const i = text.indexOf(w);
              if (i < 0 || isLetter(text[i - 1]) || isLetter(text[i + w.length])) continue;
              const m = {index: i};
              const r = document.createRange();
              r.setStart(n, m.index); r.setEnd(n, m.index + w.length);
              if (r.getClientRects().length === 0) continue;
              const span = document.createElement('span');
              r.surroundContents(span);
              span.id = '__target';
              span.scrollIntoView({block: 'center'});
              return true;
            }
            return false;
            """,
            w,
        )
        if not found:
            continue
        time.sleep(1)
        target = driver.find_element(By.ID, "__target")
        driver.execute_script(
            "const r = document.createRange(); r.selectNodeContents(arguments[0]);"
            "getSelection().removeAllRanges(); getSelection().addRange(r);",
            target,
        )
        ActionChains(driver).key_down(Keys.ALT).click(target).key_up(Keys.ALT).perform()
        try:
            WebDriverWait(driver, 12).until(lambda d: d.execute_script(
                "const h = document.querySelector('#anki-dict-modal .anki-dict-word h2'); return h && h.textContent.trim();"
            ) == w)
        except Exception:
            ActionChains(driver).send_keys(Keys.ESCAPE).perform()
            continue
        time.sleep(0.8)
        print("looked up", w)
        return w
    raise RuntimeError(f"none of {candidates} could be looked up")


COMMON = ["discovery", "accidentally", "remarkable", "fortunate", "valuable", "unexpected",
          "significant", "bacteria", "infections", "effective", "produced", "observed",
          "widely", "originally", "concept", "creativity", "phenomenon", "coined"]


def save_viewport(name):
    img = Image.open(io.BytesIO(driver.get_screenshot_as_png())).convert("RGB")
    if img.size != (W, H):
        img = img.resize((W, H), Image.LANCZOS)
    img.save(os.path.join(OUT, name))
    print("saved", name, img.size)


try:
    driver.install_addon(os.path.abspath(EXT_DIR), temporary=True)
    set_viewport(W, H)

    # Build up a word list on a few articles.
    done = []
    for url in ["https://en.wikipedia.org/wiki/Penicillin", "https://en.wikipedia.org/wiki/Serendipity"]:
        driver.get(url)
        loaded()
        for _ in range(2):
            done.append(lookup_plain_word(COMMON, exclude=done))
            ActionChains(driver).send_keys(Keys.ESCAPE).perform()

    # 1. Lookup modal (default theme), mouse resting on the modal.
    driver.get("https://en.wikipedia.org/wiki/Serendipity")
    loaded()
    lookup_plain_word(["serendipitous", "unplanned", "fortunate", "accident"] + COMMON, exclude=done)
    ActionChains(driver).move_to_element(driver.find_element(By.ID, "anki-dict-modal")).perform()
    time.sleep(0.5)
    save_viewport("01-lookup.png")

    # 2. Word list popup, composed onto a 1280x800 canvas.
    open_ext("/popup/popup.html")
    driver.execute_script("document.querySelector('#select-unexported').click()")
    set_viewport(400, 600)
    time.sleep(0.5)
    popup = Image.open(io.BytesIO(driver.find_element(By.TAG_NAME, "body").screenshot_as_png)).convert("RGB")
    set_viewport(W, H)
    canvas = Image.new("RGB", (W, H), "#eef7e4")
    scale = min(720 / popup.height, 1.4)
    popup = popup.resize((int(popup.width * scale), int(popup.height * scale)), Image.LANCZOS)
    shadow = Image.new("RGB", (popup.width + 12, popup.height + 12), "#cfe3bb")
    x, y = (W - popup.width) // 2, (H - popup.height) // 2
    canvas.paste(shadow, (x - 2, y + 6))
    canvas.paste(popup, (x, y))
    canvas.save(os.path.join(OUT, "02-word-list.png"))
    print("saved 02-word-list.png", canvas.size)

    # 3. Settings page.
    open_ext("/options/options.html")
    save_viewport("03-settings.png")

    # 4. Lookup with the British Classic theme.
    driver.execute_async_script(
        "const done = arguments[arguments.length - 1];"
        "browser.storage.local.get('settings').then(d => browser.storage.local.set({settings: {...d.settings, theme: 'british'}})).then(() => done(true));"
    )
    driver.get("https://en.wikipedia.org/wiki/Penicillin")
    loaded()
    lookup_plain_word(["mould", "antibiotics", "infections"] + COMMON, exclude=done)
    ActionChains(driver).move_to_element(driver.find_element(By.ID, "anki-dict-modal")).perform()
    time.sleep(0.5)
    save_viewport("04-lookup-british-theme.png")
finally:
    driver.quit()
