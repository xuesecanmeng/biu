import { RiArrowDownSLine, RiTBoxLine } from "@remixicon/react";

import IconButton from "@/components/icon-button";
import MusicDownloadButton from "@/components/music-download-button";
import MusicPlayMode from "@/components/music-play-mode";
import MusicRate from "@/components/music-rate";
import MusicVolume from "@/components/music-volume";
import OpenPlaylistDrawerButton from "@/components/open-playlist-drawer-button";
import { usePlayList } from "@/store/play-list";
import { useSettings } from "@/store/settings";

const RightControl = () => {
  const playId = usePlayList(s => s.playId);
  const getPlayItem = usePlayList(s => s.getPlayItem);
  const updateSettings = useSettings(s => s.update);

  return (
    <div className="flex h-full items-center justify-end gap-1">
      <MusicPlayMode />
      <IconButton aria-label="桌面歌词" tooltip="桌面歌词" onPress={() => window.electron.toggleDesktopLyrics()}>
        <RiTBoxLine size={18} />
      </IconButton>
      {Boolean(playId) && getPlayItem()?.source !== "local" && <MusicDownloadButton />}
      <OpenPlaylistDrawerButton />
      <MusicVolume />
      <MusicRate />
      <IconButton
        radius="full"
        variant="light"
        onPress={() => updateSettings({ playbarCollapsed: true })}
        className="ml-1 size-8 min-w-8"
        aria-label="折叠播放栏"
        tooltip="折叠"
      >
        <RiArrowDownSLine size={18} />
      </IconButton>
    </div>
  );
};

export default RightControl;
