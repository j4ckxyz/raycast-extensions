import { LocalStorage, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect } from "react";
import Chat from "./chat";

export default function NewChat() {
  const { push } = useNavigation();

  useEffect(() => {
    async function reset() {
      try {
        await LocalStorage.clear();
        showToast({ style: Toast.Style.Success, title: "Chat cleared" });
        push(<Chat />);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to clear chat",
          message: String(error),
        });
      }
    }
    reset();
  }, []);

  return null;
}
