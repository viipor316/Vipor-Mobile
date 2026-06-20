# VIPOR — local dev setup (do this once)

We hit three issues running locally: Node too new, the wrong Expo SDK, and an
editor extension that kept rewriting `package.json`. This guide fixes all three
permanently. Do the steps **in order**.

---

## Step 1 — Stop the thing that rewrites package.json

VS Code's **Expo Tools** / React Native extension auto-runs `expo install --fix`,
which keeps bumping the project to the newest SDK (56) — that's why our pinned
versions kept reverting.

**Do ONE of these:**
- **Simplest:** close VS Code entirely while installing, and edit files in another
  editor (Notepad++, Sublime) — or just let the commands below run with VS Code shut.
- **Or** disable the extension for this folder: in VS Code → Extensions → search
  "Expo" → gear icon → **Disable (Workspace)**. Reload window.

Verify nothing reverts: open `vipor/mobile/package.json` and confirm it still says
`"expo": "~54.0.0"` and `"react-native": "0.81.5"`. If it flipped back to 56, the
extension is still active — disable it before continuing.

---

## Step 2 — Use Node 22 LTS (not 26)

Expo SDK 54's tooling crashes on Node 26 (`options.mode must be one of 'strip'`).

**Check what you have:**
```powershell
node -v
```

**If it's not v22**, install nvm-windows and switch:
1. Get `nvm-setup.exe` from https://github.com/coreybutler/nvm-windows/releases
2. Run it, then **close and reopen PowerShell**.
3. ```powershell
   nvm install 22
   nvm use 22
   node -v        # must show v22.x
   ```

> `nvm use 22` only affects the **current terminal**. Run it in any new PowerShell
> window where you work on the app. Your machine's default stays Node 26.

---

## Step 3 — Clean install the mobile app (pinned to SDK 54)

With VS Code closed (Step 1) and Node 22 active (Step 2):

```powershell
cd D:\OpenClaw\vipor\mobile
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
npm install
```

`package.json` is already pinned to a consistent SDK 54 set, so `npm install`
resolves with no ERESOLVE and you do **not** need `expo install --fix`
(that command is what caused the SDK-56 drift — avoid it).

If you ever DO see an ERESOLVE, it means a version drifted again (Step 1) — fix
the file, don't paper over it with `--force`.

---

## Step 4 — Run it

**Terminal A — backend** (Node version doesn't matter here):
```powershell
cd D:\OpenClaw\vipor\backend
npm install
npm start                      # VIPOR mock API on http://localhost:3001
```

**Terminal B — app** (must have `nvm use 22` active):
```powershell
cd D:\OpenClaw\vipor\mobile
npx expo start
```
Press **`w`** to open in your browser, or scan the QR with **iOS Expo Go (SDK 54)**.

### Phone + backend
On a physical phone, `localhost` means the phone. Point the app at your PC's LAN IP:
```powershell
# find it:
ipconfig        # look for IPv4 Address, e.g. 192.168.1.20
# then start the app pointed at it:
$env:EXPO_PUBLIC_API_URL="http://192.168.1.20:3001/api"; npx expo start
```

---

## Pinned versions (SDK 54) — for reference
| package | version |
|---|---|
| expo | ~54.0.0 |
| react | 19.1.0 |
| react-native | 0.81.5 |
| expo-status-bar | ~3.0.9 |
| react-native-safe-area-context | ~5.6.0 |
| react-native-screens | ~4.16.0 |
| react-native-gesture-handler | ~2.28.0 |

Don't run `npx expo install --fix` — it upgrades these to the latest SDK and
breaks Expo Go compatibility. If you intentionally move to a newer SDK later,
update your phone's Expo Go to match in the same step.

---

## Troubleshooting
| Symptom | Cause | Fix |
|---|---|---|
| `options.mode must be one of 'strip'` | Node 26 | Step 2 (Node 22) |
| `ERESOLVE ... react-native@0.86` | package.json drifted to SDK 56 | Step 1, re-pin, reinstall |
| `Project is incompatible with this version of Expo Go` | SDK mismatch | project on 54, update/keep Expo Go on 54 |
| `PluginError: Failed to resolve plugin expo-location` | plugin listed but pkg not installed | already removed from app.json |
| Quote screen loads but Approve fails | backend not running / wrong IP | start backend; set EXPO_PUBLIC_API_URL |
