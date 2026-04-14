/**
 * Cross-platform font stacks with Korean fallback.
 * Windows: 맑은 고딕 (Malgun Gothic) is standard Korean font.
 * Mac: Apple SD Gothic Neo is standard.
 * Web: Noto Sans KR / JetBrains Mono (loaded via Google Fonts in index.html)
 */

/** For UI labels, monospace numbers (HP, Gold, stats) */
export const FONT_MONO = "'JetBrains Mono', 'Consolas', 'Menlo', 'Monaco', 'D2Coding', 'Courier New', monospace";

/** For titles and Korean-heavy UI text */
export const FONT_SANS = "'Noto Sans KR', 'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', 'Nanum Gothic', sans-serif";

/** Wait until web fonts are loaded to avoid initial tofu-box rendering. */
export async function waitForFontsReady(): Promise<void> {
  try {
    if ('fonts' in document) {
      await (document as any).fonts.ready;
    }
  } catch {
    // ignore — fall back to system fonts
  }
}
