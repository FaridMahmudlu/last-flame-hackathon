# Last Flame

## Product and stack

- Keep all application copy, code, and project documentation in English.
- This is an atmospheric 2D cooperative escape game, not a first-person 3D game.
- Expo SDK 57, React Native 0.86, React 19, and TypeScript. Node 22.13 through 24 is supported.
- The shared game engine is in `shared/game.ts`; room content and rules are in `shared/content.ts`.
- The WebSocket server is authoritative. Never trust client clocks, resource balances, clue access, or victory claims.
- A single surviving player can finish the escape for the whole team. There is exactly one rescue per team per round.
- Unavailable senses can be borrowed per room so captured or disconnected players cannot permanently block progress.
- Solo practice is explicitly labeled and uses the same engine locally. Do not add fake multiplayer participants.

## Commands

- Install locked dependencies: `npm ci`.
- Generate the original app icons and sound effects: `npm run assets`.
- Run the game server on port 8787: `npm run server`.
- Start Expo for phones on the same LAN: `npm start`.
- Start Metro for Android USB testing: `npm run start:usb`.
- Run TypeScript, ESLint, engine/server tests, and the web export: `npm run verify`.
- Run browser tests after building the web client: `npm run test:ui`.
- Export platform bundles: `npm run build:native`. These exports are not signed APK, AAB, or IPA files.
- The server serves the web export from `dist`; open `http://localhost:8787` after `npm run build:web`.
- Browser tests use installed Microsoft Edge and isolated ephemeral game servers.

## Device testing

- Windows can resolve localhost to IPv6-only `::1`, which Android ADB reverse cannot reach. `start:usb` uses IPv4-first DNS for Metro.
- For an explicitly authorized Android device, forward ports 8081 and 8787 with `adb -s <serial> reverse tcp:8081 tcp:8081` and `adb -s <serial> reverse tcp:8787 tcp:8787`.
- Open the local Expo project using `exp://127.0.0.1:8081` when using USB forwarding.
- Set `ANDROID_SERIAL` before running `npm run test:android`.
- Native smoke tests only operate on the main Android profile and require Expo Go and Last Flame to be visible. Never relax that guard to inspect another application or a protected profile.
- Generated device captures belong under `.expo`, which is ignored by Git.
- Real iPhone verification and signed release builds require the appropriate device and Apple/Expo signing access. Do not report JavaScript bundle exports as device or store-build validation.

## Implementation conventions

- Use `src/lib/useAnimatedValue.ts` for animated values across native and web; React Native Web does not expose every React Native hook.
- Validate SVG path data in browser tests. Missing coordinate separators can crash the Android native SVG renderer even when browsers render the remaining path without throwing a JavaScript error.
- Import only the font weights and Lucide icon entry points actually used. Importing their full indexes significantly increases bundles.
- Keep sound clues available as text, use labeled touch targets, preserve safe-area padding, and honor reduced-motion preferences.
- Keep phone gameplay controls in the persistent bottom dock.
- Add regression coverage for reconnect races, stale commands, duplicate actions, timer-driven outcomes, and the shared rescue limit.

## Deployment and security

- The public Vercel preview uses `EXPO_PUBLIC_DEMO_ONLY=1` and offers solo play. The full co-op implementation runs with the supplied Node server; do not describe the static preview as hosted online co-op.
- Live rooms are in memory and expire. Restarting the server ends those sessions; multiple server replicas need a shared-room architecture before deployment.
- Internet play requires HTTPS/WSS and an explicit browser-origin allowlist in `ALLOWED_ORIGINS`.
- Production EAS profiles require `EXPO_PUBLIC_GAME_SERVER_URL` to use HTTPS.
- Reconnect tokens are private. Never log them or expose another player's unrevealed clues.
- The current dependency audit reports an upstream `uuid` advisory through Expo's `xcode` build-tool chain. Review upstream-compatible fixes before release; do not force-downgrade Expo or bypass package security controls to silence the report.
