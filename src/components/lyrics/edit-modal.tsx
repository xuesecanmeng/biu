import { useState } from "react";

import {
  addToast,
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Tab,
  Tabs,
  Textarea,
} from "@heroui/react";

interface LyricsEditModalProps {
  lyrics: string;
  translatedLyrics: string;
  onClose: () => void;
  onSave: (lyrics: string, translatedLyrics: string) => Promise<void>;
}

const LyricsEditModal = ({ lyrics, translatedLyrics, onClose, onSave }: LyricsEditModalProps) => {
  const [originalLyrics, setOriginalLyrics] = useState(lyrics);
  const [translationLyrics, setTranslationLyrics] = useState(translatedLyrics);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(originalLyrics, translationLyrics);
    } catch {
      addToast({ color: "danger", title: "歌词保存失败，请重试" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      isDismissable={!isSaving}
      isKeyboardDismissDisabled={isSaving}
      hideCloseButton={isSaving}
      scrollBehavior="inside"
      size="2xl"
    >
      <ModalContent>
        <ModalHeader>编辑歌词</ModalHeader>
        <ModalBody>
          <Tabs aria-label="歌词类型">
            <Tab key="original" title="原歌词">
              <Textarea
                label="原歌词"
                labelPlacement="outside"
                placeholder="请输入歌词，格式如：[00:12.345]这里是歌词内容"
                value={originalLyrics}
                onValueChange={setOriginalLyrics}
                isDisabled={isSaving}
                minRows={10}
                maxRows={20}
              />
            </Tab>
            <Tab key="translation" title="翻译歌词">
              <Textarea
                label="翻译歌词"
                labelPlacement="outside"
                placeholder="请输入翻译歌词，格式如：[00:12.345]这里是翻译内容"
                value={translationLyrics}
                onValueChange={setTranslationLyrics}
                isDisabled={isSaving}
                minRows={10}
                maxRows={20}
              />
            </Tab>
          </Tabs>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose} isDisabled={isSaving}>
            取消
          </Button>
          <Button color="primary" onPress={handleSave} isLoading={isSaving}>
            保存
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default LyricsEditModal;
