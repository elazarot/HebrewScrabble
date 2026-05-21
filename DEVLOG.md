# DEVLOG - Hebrew Scrabble

## 2026-05-21 - Android Black Screen Fix & Capacitor Configuration

### 🛠️ What was done
1. **Resolved Android Black Screen Bug**:
   - Identified that `capacitor.config.ts` was pointing to a local development server IP (`http://192.168.1.201:3000`). When the app is built/run standalone on the phone without the dev server running, this causes the webview to fail to connect and display a black screen.
   - Commented out the `server` block in `capacitor.config.ts` so that Capacitor loads pre-bundled local files from the `dist` directory by default.
2. **Added Capacitor CLI Helper Scripts**:
   - Added `npm run cap:sync` (`npx cap sync`) and `npm run cap:open` (`npx cap open android`) scripts to `package.json` to streamline native building and asset synchronization.
3. **Rebuilt & Synced Native Assets**:
   - Ran `npm run build` and `npx cap sync` to compile the latest web application and bundle it directly into the native Android folder structure.
4. **Compiled, Installed, and Launched Standalone APK**:
   - Connected via ADB wireless debugging to the user's device (`10.0.0.11:39533`).
   - Ran `gradlew.bat installDebug` to compile and install the standalone debug APK directly on the connected phone.
   - Successfully launched the application automatically on the phone.
5. **Resized Score Preview Badge**:
   - Modified `.score-preview-badge` diameter from `22px` to `16px` and font-size from `11px` to `8px` in `src/styles/board.css` for a more compact and elegant look on mobile.
   - Updated center alignments in `src/components/Board.tsx` from `-11px`/`-12px` to `-8px` to match the new `16px` dimensions perfectly.
6. **Implemented Advanced PvE AI Difficulty Levels**:
   - Upgraded `generateAIMove` in `src/engine/aiEngine.ts` to implement sophisticated, human-like AI decisions.
   - **Hard Mode**: Added a defensive scoring mechanism (`getStrategicWeight`) that prioritizes utilizing bonus squares, penalizes placing easy-to-use letters (vowels אהו"י) adjacent to empty bonus squares (preventing opponent access), and manages rack letters (rewards 25%-45% vowel balance). It selects a move randomly from the top 10 weighted options.
   - **Easy Mode**: Targets the 30th to 60th percentile (average score range) of all valid options, and has a 20% chance of making a "missed opportunity" play (choosing a low-tier move). Does not restrict word lengths to allow organic plays.
   - **Dynamic UI Delay**: Implemented dynamic simulated think times, keeping it a fast 1.0s on Easy, but scaling between 1.2s to 3.0s on Hard depending on search space complexity to simulate deep thinking.
7. **Started Live Development Server**:
   - Started the Vite live server (`npm run dev`) at port 3000 to enable instant visual updates and live-reload during future development.
8. **Generated and Applied Custom App Launcher Icons**:
   - Created a PowerShell script (`scripts/generate_icons.ps1`) that automatically resizes the user's high-resolution Scrabble board image into all standard Android mipmap sizes (`48x48`, `72x72`, `96x96`, `144x144`, `192x192`) and PWA web assets (`favicon.png`, `icon-192.png`, `icon-512.png`).
   - Ran script to successfully overwrite the Android launcher assets (`ic_launcher.png` and `ic_launcher_round.png`) and web assets.
9. **Configured Wireless Device Live-Reload (Live Mode)**:
   - Configured `capacitor.config.ts`'s `server` block to target the computer's local Wi-Fi IP network address (`http://10.0.0.10:3000`).
   - Compiled and installed the debug APK over ADB Wi-Fi (`gradlew.bat installDebug`) and automatically launched it on the phone. The phone now loads directly from the live Vite development server, enabling instant live reloading.
10. **Prevented Dictionary Exploit/Cheating**:
    - Modified `handleLongPress` in `src/App.tsx` to check if it's the human's turn and there are unconfirmed tiles placed on the board (`state.placedTiles.length > 0`).
    - If so, it blocks the dictionary definition search and shows a user-friendly error message, preventing the player from testing word combinations on the board to cheat.

### 📋 Status
* **Version**: 1.2 (Stable Web & Android)
* **Build**: Web (Live), Android (Local & Standalone)
* **Stability**: High. The Android app now successfully loads internal web assets offline/standalone, eliminating the black screen bug.

### 🚀 Next Steps (To-Do)
1. **Dictionary Whitelist**: Add a list of ~100 common "Ktif Hasar" words (like "יתן", "אמא") to improve user experience.
2. **Sound FX**: Add subtle sounds for tile placement, move submission, and errors.
3. **Web Worker**: Move AI engine to a background thread to prevent UI micro-stutters during "thinking".
4. **PWA Support**: Ensure offline-first capabilities for the web version.
5. **Favicon/Logo**: Create a custom icon for the site and home screen.

## 2026-05-16 - Deployment, Responsive Layout & AI Balance

### 🛠️ What was done
1.  **AI Engine Upgrade**:
    *   Implemented actual move scoring for AI decision making (calculates best possible score including board bonuses).
    *   Added probabilistic selection: 
        *   **HARD Mode**: 70% chance to pick from top 5 moves.
        *   **EASY Mode**: 80% chance to pick from bottom 5 moves.
    *   This creates a more human-like and balanced opponent.
2.  **Web Deployment**:
    *   Initialized Git repository and connected to GitHub (`elazarot/HebrewScrabble`).
    *   Deployed to Netlify (`hebrewscrabble.netlify.app`) with automatic CI/CD.
3.  **UI/UX Refinements (Device-Specific)**:
    *   **Desktop Layout**: Implemented a 400px wide sidebar on the right for Rack and Controls.
    *   **Responsive Scaling**: Reduced board square size on desktop (4vh) to prevent vertical overflow.
    *   **No-Scroll Viewport**: Enforced `100vh` height and `overflow: hidden` on root to give it a native app feel on the web.
    *   **Mobile Controls**: Refactored to a 2x2 symmetrical grid for better touch targets and layout stability.
    *   **Safety Margins**: Guaranteed 5px horizontal margin on mobile for both board and controls.
4.  **SEO & Metadata**:
    *   Added meta tags for Title, Description, and Social Sharing (Open Graph).
    *   Improved browser tab labeling.
5.  **Bug Fixes**:
    *   Fixed layout shift where "last move announcement" would push the board down.
    *   Resolved invisibility of system messages (toasts) by moving them to the board-section with high z-index.
    *   Verified dictionary availability for common words like "היא" (found in Ktif Male).

### 📋 Status
*   **Version**: 1.1 (Stable Web)
*   **Build**: Web (Live), Android (Local)
*   **Stability**: High. AI is performing well, and the layout is solid on both mobile and desktop.

### 🚀 Next Steps (To-Do)
1.  **Dictionary Whitelist**: Add a list of ~100 common "Ktif Hasar" words (like "יתן", "אמא") to improve user experience.
2.  **Sound FX**: Add subtle sounds for tile placement, move submission, and errors.
3.  **Web Worker**: Move AI engine to a background thread to prevent UI micro-stutters during "thinking".
4.  **PWA Support**: Ensure offline-first capabilities for the web version.
5.  **Favicon/Logo**: Create a custom icon for the site and home screen.
