import {
  Action,
  ActionPanel,
  List,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { api, Chat } from "./utils/api";
import ChatCommand from "./chat";

export default function SearchChats() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  useEffect(() => {
    async function fetchChats() {
      try {
        setIsLoading(true);
        const fetchedChats = await api.getChats();
        // Sort by updated_at desc
        fetchedChats.sort((a, b) => b.updated_at - a.updated_at);
        setChats(fetchedChats);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load chats",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchChats();
  }, []);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search past conversations..."
    >
      <List.EmptyView
        icon={Icon.Message}
        title="No chats found"
        description="Start a new chat to see it here"
        actions={
          <ActionPanel>
            <Action
              title="New Chat"
              icon={Icon.Plus}
              onAction={() => push(<ChatCommand />)}
            />
          </ActionPanel>
        }
      />
      {chats.map((chat) => (
        <List.Item
          key={chat.id}
          title={chat.title || "Untitled Chat"}
          subtitle={new Date(chat.updated_at * 1000).toLocaleString()}
          icon={Icon.Message}
          actions={
            <ActionPanel>
              <Action
                title="Open Chat"
                icon={Icon.Bubble}
                onAction={() =>
                  push(<ChatCommand launchContext={{ chatId: chat.id }} />)
                }
              />
              <Action.CopyToClipboard
                title="Copy Chat ID"
                content={chat.id}
                shortcut={{ modifiers: ["opt"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
