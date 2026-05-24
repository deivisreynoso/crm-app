# Bug Report: Home Page Empty After Compact Update (Classic & Compact)

**Product:** Cursor IDE  
**Severity:** High — blocks primary post-login workflow (Home / agent cards)  
**Report date:** 2026-05-23  
**Reporter context:** Windows user; issue also reported on macOS and Linux in community threads  

---

## Summary

After updating to a Cursor build that introduces or defaults to the **Compact home layout**, the **Home page renders with no cards** (empty feed). **Classic and Compact fail the same way** — not two separate bugs. Users who switch to Compact, stay on Classic, or toggle between layouts can all see an empty home; switching layout is **not** a reliable fix.

This matches multiple public reports (Reddit, Cursor Community Forum) on **2.4.x–2.5.x**, including builds where the Compact UI was rolled out.

---

## Environment (reporter)

| Field | Value |
|--------|--------|
| **OS** | Windows (NT 10.0; build 26200) |
| **Shell** | PowerShell |
| **Cursor builds mentioned in community** | 2.4.21, 2.4.28, 2.5.17, 2.5.20+ |
| **Feature** | New Home / Compact layout (post-login landing) |

*Exact local build/version should be filled from **Help → About** when filing with Cursor support.*

---

## Steps to Reproduce

1. Install or update Cursor to a version with the new Compact home experience (e.g. 2.4.21+ / 2.5.x).
2. Sign in and land on **Home** (Compact and/or Classic).
3. Observe Home page: **no agent cards / empty content area**.
4. *(Optional)* Switch **Compact ↔ Classic** in settings — **same empty home** for many users; layout change does not restore cards.

**Expected:** Home shows recent agents, projects, or card grid as before the UI change.  
**Actual:** Blank or non-functional home; cards missing in **both** Classic and Compact.

---

## Symptoms

- Home page loads but **shows zero cards** / empty main panel.
- **Classic and Compact behave the same** — empty feed in either mode; not “only Compact is broken.”
- Occurs **after login** on the default landing view.
- **CLI still works:** `cursor-agent` in terminal functions while GUI home is empty (reported on macOS 2.4.21).
- **Intermittent for some users:** empty home until force-quit or reload; others see it **persistently** until downgrade/reinstall.

---

## Community Evidence (cross-platform)

| Platform | OS / browser | Build (reported) | Notes |
|----------|----------------|------------------|--------|
| Reddit | macOS | 2.4.21 | Empty home after update; `cursor-agent` OK |
| Reddit | Windows | 2.4.28 | Same empty home |
| Reddit | (unspecified) | 2.5.17 | Compact default; empty cards |
| Forum | Windows 11 | 2.5.20 | Empty after Compact switch; **Classic same** |
| Forum | Windows | (recent) | Persists after restart/reinstall; CLI works |
| Forum | Linux | Chrome 145 | 2.5.20 — **Compact and Classic both empty** |

**Sources (for support):**

- Reddit: [Cursor 2.4.21 update – macOS home empty](https://www.reddit.com/r/cursor/comments/1qyniww/cursor_2421_update_macos_home_page_empty_after/)
- Reddit: [Cursor 2.4.28 – Windows same issue](https://www.reddit.com/r/cursor/comments/1r8qcns/cursor_2428_update_windows_same_home_page_empty/)
- Reddit: [Compact default 2.5.17 – cards not showing](https://www.reddit.com/r/cursor/comments/1r9qrgh/cursor_25_update_compact_home_page_default/)
- Forum: [Home page empty after switching to Compact](https://forum.cursor.com/t/home-page-empty-after-switching-to-compact/152067)
- Forum: [Home page empty after update – persists](https://forum.cursor.com/t/home-page-empty-after-update-persists-after-restart-reinstall/151914)
- Forum: [Home page empty after switching to Compact UI](https://forum.cursor.com/t/home-page-empty-after-switching-to-compact-ui/1420381)

---

## Related Windows / Shell Issues (same release window)

These may share auth, shell, or workspace state with the home feed:

| Issue | Symptom | Forum |
|--------|---------|--------|
| Blank sidebar after update | Explorer/sidebar empty; chat/history missing | [151407](https://forum.cursor.com/t/blank-sidebar-after-update/151407) |
| Cannot type in Agent chat | Input broken on Windows | [151397](https://forum.cursor.com/t/cannot-type-in-agent-chat-on-windows/151397) |
| Chat input not accepting keys | Keyboard input blocked | [150376](https://forum.cursor.com/t/chat-input-not-accepting-keyboard-input/150376) |
| Cannot click anything | UI clicks dead | [150584](https://forum.cursor.com/t/cannot-click-anything/150584) |
| UI completely broken after update | Broad shell failure | [150096](https://forum.cursor.com/t/ui-completely-broken-after-update/150096) |

Worth checking whether home card fetch/render fails in the same broken shell session vs. a dedicated home API/layout bug affecting **both** Classic and Compact code paths.

---

## Workarounds (user-reported, inconsistent)

| Workaround | Reliability | Notes |
|------------|-------------|--------|
| Use **`cursor-agent`** CLI | High for agent work | Does not fix GUI home |
| **Reload window** / restart Cursor | Low–medium | Helps some users temporarily |
| **Switch Classic ↔ Compact** | **Low / ineffective** | Same empty home either way for many reporters |
| **Force-quit** (macOS: all windows + Cmd+Q; Windows: end all Cursor processes) | Low | Sometimes restores cards once |
| **Reinstall / clear app data** | Mixed | Some still broken after full reinstall |
| **Downgrade** to pre-Compact build | Mixed | Reported as fix for some on 2.4.21 |

No single workaround is dependable across platforms; **layout toggle should not be documented as a fix** given Classic/Compact parity on the bug.

---

## Suggested Diagnostics (for engineering / support)

Please collect on affected machines:

1. **Cursor version** (Help → About) and **home layout** setting (Classic vs Compact) when empty.
2. **Developer Tools → Console** on Home route: JS errors, failed network calls (home feed / agents / workspace list).
3. **Logs:** `%APPDATA%\Cursor\logs\` (Windows), `~/Library/Application Support/Cursor/logs/` (macOS).
4. Whether **`cursor-agent` list** (or equivalent) returns agents while GUI home is empty — isolates GUI vs backend.
5. **Multi-root / WSL / remote** workspace vs local folder (forum reports tied empty home to specific workspace until force-quit).

---

## Request to Cursor Team

1. **Fix home card population** for signed-in users on current stable/beta (2.5.x), for **both Classic and Compact** — same root cause likely affects both.
2. **Do not treat Classic vs Compact as separate fixes** — verify card data loads in each mode after one fix.
3. **Regression test** post-login Home on Windows, macOS, and Linux after Compact rollout.
4. **Status / known-issue** entry if widespread, with reliable workaround or ETA.
5. **Windows pass** on shell regressions (sidebar, chat input, clicks) in the same release train.

---

## Impact

Users lose the main **visual entry point** for agents and recent work immediately after update. Agent work may continue via CLI or chat opened elsewhere, but onboarding and daily flow through Home is broken. **Classic and Compact both failing the same way** rules out “just use Classic” as support guidance until fixed.

---

## Report Metadata

| Field | Value |
|--------|--------|
| **Category** | UI / Home / Post-login |
| **Regression** | Yes (tied to Compact home rollout, 2.4.21+) |
| **Layout scope** | Classic **and** Compact (same symptom) |
| **Platforms** | Windows, macOS, Linux (community) |
| **CLI impact** | Typically none (`cursor-agent` works) |

---

*Document prepared from reporter description, forum thread #1420381 (Classic + Compact both empty), and public community reports. Attach version, screenshots, and log excerpts when submitting to [Cursor Forum](https://forum.cursor.com/) or in-app feedback.*
