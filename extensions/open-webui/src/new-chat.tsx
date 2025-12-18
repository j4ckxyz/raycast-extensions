import {
  launchCommand,
  LaunchType,
  LocalStorage,
  showToast,
  Toast,
} from "@raycast/api";

const STORAGE_KEY = "open-webui-chat-state";

export default async function Command() {
  try {
    await LocalStorage.removeItem(STORAGE_KEY);
    await showToast({ style: Toast.Style.Success, title: "Chat cleared" });
    try {
      await launchCommand({ name: "chat", type: LaunchType.UserInitiated });
    } catch {
      // Ignore launch error if it's just 'background' limitations, but here it should work.
      // Actually, launchCommand is best-effort.
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to clear chat",
      message: String(error),
    });
  }
}
