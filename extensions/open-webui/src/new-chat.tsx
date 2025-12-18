import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import Chat from "./chat";

const STORAGE_KEY = "open-webui-conversation";

export default function NewChat() {
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    async function clearConversation() {
      await LocalStorage.removeItem(STORAGE_KEY);
      setCleared(true);
    }
    clearConversation();
  }, []);

  if (!cleared) {
    return null; // Brief loading state while clearing
  }

  return <Chat />;
}
