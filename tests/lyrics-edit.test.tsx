import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

import { addToast } from "@heroui/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { postLyricsUpdated } from "@/common/utils/mini-player";
import Lyrics from "@/components/lyrics";
import { usePlayList } from "@/store/play-list";

vi.mock("@/store/play-list", async () => {
  const { create } = await import("zustand");
  const store = create<{ playId: string; getPlayItem: () => unknown }>(() => ({
    playId: "a",
    getPlayItem: () => ({ id: store.getState().playId, bvid: "BV1", cid: store.getState().playId === "a" ? "1" : "2" }),
  }));
  return { usePlayList: store };
});
vi.mock("@/store/play-progress", () => ({ usePlayProgress: vi.fn(() => ({ currentTime: 0 })) }));
vi.mock("@/store/settings", () => ({ useSettings: vi.fn((select: any) => select({ showLyricsTranslation: true })) }));
vi.mock("@/common/utils/mini-player", () => ({ postLyricsOffset: vi.fn(), postLyricsUpdated: vi.fn() }));
vi.mock("@/components/lyrics/get-lyrics", () => ({ getLyricsAuto: vi.fn() }));
vi.mock("@/components/lyrics-search-modal", () => ({ default: () => null }));
vi.mock("@/components/lyrics/font-size-control", () => ({ default: () => null }));
vi.mock("@/components/lyrics/offset-control", () => ({ default: () => null }));
vi.mock("@/components/lyrics/utility-controls", () => ({ default: () => null }));
vi.mock("@/components/icon-button", () => ({
  default: ({ children, onPress, isDisabled, "aria-label": label }: any) => (
    <button type="button" onClick={onPress} disabled={isDisabled} aria-label={label}>
      {children}
    </button>
  ),
}));
vi.mock("@heroui/react", async () => {
  const actual = await vi.importActual<typeof import("@heroui/react")>("@heroui/react");
  const Container = ({ children }: { children: ReactNode }) => <div>{children}</div>;
  return {
    useDisclosure: actual.useDisclosure,
    addToast: vi.fn(),
    Modal: Container,
    ModalContent: Container,
    ModalHeader: Container,
    ModalBody: Container,
    ModalFooter: Container,
    Tabs: Container,
    Tab: Container,
    Textarea: ({ label, value, onValueChange, isDisabled }: any) => (
      <textarea
        aria-label={label}
        value={value}
        onChange={event => onValueChange(event.target.value)}
        disabled={isDisabled}
      />
    ),
    Button: ({ children, onPress, isDisabled, isLoading }: any) => (
      <button type="button" onClick={onPress} disabled={isDisabled || isLoading}>
        {children}
      </button>
    ),
  };
});

let root: Root;
let container: HTMLDivElement;
let cache: Record<string, MusicLyrics>;

beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  HTMLElement.prototype.scrollTo = vi.fn();
  cache = { "BV1-1": { lyrics: "[00:12.345]原文", tLyrics: "[00:12.345]翻译", offset: 150, fontSize: 26 } };
  window.electron = {
    getStore: vi.fn(async () => structuredClone(cache)),
    setStore: vi.fn(async (_name, value) => {
      cache = value;
    }),
  } as unknown as ElectronAPI;
  usePlayList.setState({ playId: "a" });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(<Lyrics showControls />));
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

const click = async (label: string) => {
  const button = Array.from(container.querySelectorAll("button")).find(
    item => item.getAttribute("aria-label") === label || item.textContent === label,
  );
  expect(button).toBeDefined();
  await act(async () => button!.click());
};

const input = (label: string) => container.querySelector<HTMLTextAreaElement>(`textarea[aria-label="${label}"]`)!;
const change = async (label: string, value: string) => {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(input(label), value);
    input(label).dispatchEvent(new Event("input", { bubbles: true }));
  });
};

test("取消后重开恢复原文，保留三位毫秒并保存原文、翻译和既有缓存字段", async () => {
  await click("编辑歌词");
  expect(input("原歌词").value).toBe("[00:12.345]原文");
  await change("原歌词", "未保存");
  await click("取消");
  await click("编辑歌词");
  expect(input("原歌词").value).toBe("[00:12.345]原文");
  await change("原歌词", "[00:12.345]新原文");
  await change("翻译歌词", "[00:12.345]新翻译");
  await click("保存");
  expect(cache["BV1-1"]).toEqual({
    lyrics: "[00:12.345]新原文",
    tLyrics: "[00:12.345]新翻译",
    offset: 150,
    fontSize: 26,
  });
  expect(container.textContent).toContain("新原文");
  expect(container.textContent).toContain("新翻译");
  expect(postLyricsUpdated).toHaveBeenCalledWith("BV1", "1", "[00:12.345]新原文");
  expect(input("原歌词")).toBeNull();
});

test("保存读取缓存时切歌不写入任何曲目，返回原曲目也不恢复草稿", async () => {
  await click("编辑歌词");
  await change("原歌词", "[00:12.345]未保存");
  let resolveRead!: (value: Record<string, MusicLyrics>) => void;
  vi.mocked(window.electron.getStore).mockReturnValueOnce(
    new Promise(resolve => {
      resolveRead = resolve;
    }),
  );
  await click("保存");
  await act(async () => usePlayList.setState({ playId: "b" }));
  await act(async () => resolveRead(cache));
  expect(window.electron.setStore).not.toHaveBeenCalled();
  expect(input("原歌词")).toBeNull();
  await act(async () => usePlayList.setState({ playId: "a" }));
  expect(input("原歌词")).toBeNull();
});

test("写回失败时保留编辑草稿并提示错误", async () => {
  await click("编辑歌词");
  await change("原歌词", "[00:12.345]待重试");
  vi.mocked(window.electron.setStore).mockResolvedValueOnce(undefined);
  await click("保存");
  expect(input("原歌词").value).toBe("[00:12.345]待重试");
  expect(addToast).toHaveBeenCalledWith({ color: "danger", title: "歌词保存失败，请重试" });
  expect(cache["BV1-1"].lyrics).toBe("[00:12.345]原文");
});
