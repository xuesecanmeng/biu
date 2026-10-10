import { expect, test, vi } from "vitest";

import { getLyricsAuto } from "@/components/lyrics/get-lyrics";

vi.mock("@/service/ai-lyrics", () => ({ getLyric: vi.fn() }));
vi.mock("@/service/web-player", () => ({ getWebPlayerInfo: vi.fn(async () => ({ data: {} })) }));

test("较晚返回的自动搜索不覆盖已保存的编辑歌词和偏移", async () => {
  let resolveLyrics!: (value: GetLyricsByNeteaseResponse) => void;
  const automaticLyrics = new Promise<GetLyricsByNeteaseResponse>(resolve => {
    resolveLyrics = resolve;
  });
  let cache: Record<string, MusicLyrics> = { "BV1-1": { offset: 150 } };
  const getNeteaseLyrics = vi.fn(() => automaticLyrics);
  window.electron = {
    getStore: vi.fn(async () => structuredClone(cache)),
    setStore: vi.fn(async (_name, value) => {
      cache = value;
    }),
    searchNeteaseSongs: vi.fn(async () => ({ result: { songs: [{ id: 1 }] } })),
    getNeteaseLyrics,
  } as unknown as ElectronAPI;

  const pending = getLyricsAuto({ cid: 1 }, "歌曲", "BV1", "1");
  await vi.waitFor(() => expect(getNeteaseLyrics).toHaveBeenCalled());
  const edited = { lyrics: "[00:01.005]编辑原文", tLyrics: "[00:01.005]编辑翻译", offset: 150, fontSize: 26 };
  cache["BV1-1"] = edited;
  resolveLyrics({ lrc: { lyric: "[00:01.005]自动搜索原文" } });
  await pending;

  expect(window.electron.setStore).not.toHaveBeenCalled();
  expect(cache["BV1-1"]).toEqual(edited);
});
