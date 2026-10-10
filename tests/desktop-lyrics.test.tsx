import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import DesktopLyrics from "@/pages/desktop-lyrics";

const { broadcast, getStore, getLyricsAuto, setDesktopLyricsLock, toggleDesktopLyrics } = vi.hoisted(() => ({
  broadcast: { onmessage: null as ((event: { data: unknown }) => void) | null, postMessage: vi.fn(), close: vi.fn() },
  getStore: vi.fn(),
  getLyricsAuto: vi.fn(),
  setDesktopLyricsLock: vi.fn(),
  toggleDesktopLyrics: vi.fn(),
}));

vi.mock("@/common/utils/mini-player", () => ({ createBroadcastChannel: () => broadcast }));
vi.mock("@/store/settings", () => ({
  useSettings: (select: (state: object) => unknown) =>
    select({ desktopLyricsFontSize: 36, desktopLyricsColor: "#60a5fa", desktopLyricsFontFamily: "system-ui" }),
}));
vi.mock("@/components/icon-button", () => ({
  default: ({ onPress, children, ...props }: any) => (
    <button {...props} onClick={onPress}>
      {children}
    </button>
  ),
}));
vi.mock("@/components/lyrics/get-lyrics", async importOriginal => ({
  ...(await importOriginal<object>()),
  getLyricsAuto,
}));

let root: Root;
let container: HTMLDivElement;

async function receive(data: unknown) {
  await act(async () => broadcast.onmessage?.({ data }));
}

beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  window.electron = {
    getStore,
    onDesktopLyricsLockChange: () => vi.fn(),
    setDesktopLyricsLock,
    setDesktopLyricsIgnoreMouseEvents: vi.fn(),
    toggleDesktopLyrics,
  } as unknown as ElectronAPI;
  getStore.mockResolvedValue({ "BV1-1": { lyrics: "[00:00]第一行\n[00:10]第二行", offset: 2000 } });
  getLyricsAuto.mockResolvedValue(null);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(<DesktopLyrics />));
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe("desktop lyrics integration", () => {
  test("uses cached offset and accepts the mini-player live offset message", async () => {
    await receive({ from: "main", state: { bvid: "BV1", cid: "1", currentTime: 8 } });
    expect(container.textContent).toContain("第二行");
    await receive({ from: "main", type: "lyricsOffset", offset: 0 });
    expect(container.textContent).toContain("第一行");
    expect(getLyricsAuto).not.toHaveBeenCalled();
  });

  test("clears previous lyrics on track change and ignores a stale fetch", async () => {
    let resolveLyrics!: (result: unknown) => void;
    getLyricsAuto.mockReturnValueOnce(new Promise(resolve => (resolveLyrics = resolve)));
    await receive({ from: "main", state: { bvid: "BV2", cid: "2", title: "待加载歌曲", currentTime: 0 } });
    expect(getLyricsAuto).toHaveBeenCalledWith({ cid: 2, bvid: "BV2" }, "待加载歌曲", "BV2", "2");
    await receive({ from: "main", state: { currentTime: 0 } });
    await act(async () => resolveLyrics({ lyrics: [{ time: 0, text: "旧歌歌词" }] }));
    expect(container.textContent).toContain("听你想听的");
    expect(container.textContent).not.toContain("旧歌歌词");
  });

  test("provides named lock and close controls", async () => {
    const lock = container.querySelector<HTMLButtonElement>('[aria-label="锁定桌面歌词"]');
    const close = container.querySelector<HTMLButtonElement>('[aria-label="关闭桌面歌词"]');
    await act(async () => lock?.click());
    expect(setDesktopLyricsLock).toHaveBeenCalledWith(true);
    await act(async () => close?.click());
    expect(toggleDesktopLyrics).toHaveBeenCalledOnce();
  });
});
