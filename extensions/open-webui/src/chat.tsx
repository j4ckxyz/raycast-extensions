import {
  Action,
  ActionPanel,
  List,
  Icon,
  LocalStorage,
  showToast,
  Toast,
} from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { api, Model, ChatMessage } from "./utils/api";

const STORAGE_KEY = "open-webui-conversation";

interface StoredMessage extends ChatMessage {
  id: string;
  timestamp: number;
  isLoading?: boolean;
}

export default function Chat() {
  const [inputText, setInputText] = useState("");
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [reasoningLevel, setReasoningLevel] = useState<string>("none");
  const messagesRef = useRef<StoredMessage[]>([]);

  // Keep ref in sync
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Load on mount
  useEffect(() => {
    async function init() {
      try {
        setIsLoading(true);

        const saved = await LocalStorage.getItem<string>(STORAGE_KEY);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed.messages) {
              setMessages(parsed.messages);
              messagesRef.current = parsed.messages;
            }
            if (parsed.model) setSelectedModel(parsed.model);
            if (parsed.reasoning) setReasoningLevel(parsed.reasoning);
          } catch (e) {
            console.error("Parse error:", e);
          }
        }

        const fetchedModels = await api.getModels();
        setModels(fetchedModels);
        if (fetchedModels.length > 0 && !selectedModel) {
          setSelectedModel(fetchedModels[0].id);
        }
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  // Save
  useEffect(() => {
    if (messages.length > 0) {
      LocalStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          messages,
          model: selectedModel,
          reasoning: reasoningLevel,
        }),
      );
    }
  }, [messages, selectedModel, reasoningLevel]);

  async function sendMessage() {
    const text = inputText.trim();
    if (!text) return;
    if (!selectedModel) {
      showToast({ style: Toast.Style.Failure, title: "Select a model first" });
      return;
    }

    const currentMessages = messagesRef.current;

    const userMessage: StoredMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: Date.now(),
    };

    const loadingMessage: StoredMessage = {
      id: `loading-${Date.now()}`,
      role: "assistant",
      content: "Thinking...",
      timestamp: Date.now(),
      isLoading: true,
    };

    const newMessages = [...currentMessages, userMessage, loadingMessage];
    setMessages(newMessages);
    messagesRef.current = newMessages;
    setInputText("");
    setIsLoading(true);

    try {
      const history = [...currentMessages, userMessage].map(
        ({ role, content }) => ({ role, content }),
      );

      showToast({
        style: Toast.Style.Animated,
        title: "Waiting for response...",
      });

      const result = await api.chatCompletion(
        history,
        selectedModel,
        undefined,
        reasoningLevel !== "none" ? reasoningLevel : undefined,
      );

      const assistantMessage: StoredMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: result.thinking
          ? `💭 **Thinking:**\n\n${result.thinking}\n\n---\n\n${result.content}`
          : result.content,
        timestamp: Date.now(),
      };

      const finalMessages = [...currentMessages, userMessage, assistantMessage];
      setMessages(finalMessages);
      messagesRef.current = finalMessages;

      // Save to Open WebUI so it appears in the web interface
      try {
        await api.saveChat(
          finalMessages.map((m) => ({ role: m.role, content: m.content })),
          selectedModel,
        );
      } catch (e) {
        console.log("Could not save to Open WebUI:", e);
      }

      showToast({ style: Toast.Style.Success, title: "Response received" });
    } catch (error) {
      console.error("Error:", error);
      const errorMessages = [...currentMessages, userMessage];
      setMessages(errorMessages);
      messagesRef.current = errorMessages;
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function clearChat() {
    setMessages([]);
    messagesRef.current = [];
    await LocalStorage.removeItem(STORAGE_KEY);
    showToast({ style: Toast.Style.Success, title: "Chat cleared" });
  }

  const reasoningOptions = [
    { value: "none", title: "No Reasoning" },
    { value: "low", title: "Low" },
    { value: "medium", title: "Medium" },
    { value: "high", title: "High" },
  ];

  return (
    <List
      isLoading={isLoading}
      searchText={inputText}
      onSearchTextChange={setInputText}
      searchBarPlaceholder="Type a message and press Enter..."
      filtering={false}
      isShowingDetail={messages.length > 0}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Model"
          value={selectedModel}
          onChange={setSelectedModel}
        >
          <List.Dropdown.Section title="Models">
            {models.map((m) => (
              <List.Dropdown.Item key={m.id} value={m.id} title={m.name} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {messages.length === 0 ? (
        <List.EmptyView
          icon={Icon.Message}
          title="Start chatting"
          description="Type a message above and press Enter"
          actions={
            <ActionPanel>
              <Action
                title="Send"
                icon={Icon.Envelope}
                onAction={sendMessage}
              />
              <ActionPanel.Submenu
                title="Reasoning Level"
                icon={Icon.LightBulb}
              >
                {reasoningOptions.map((opt) => (
                  <Action
                    key={opt.value}
                    title={opt.title}
                    icon={
                      reasoningLevel === opt.value ? Icon.Checkmark : undefined
                    }
                    onAction={() => setReasoningLevel(opt.value)}
                  />
                ))}
              </ActionPanel.Submenu>
            </ActionPanel>
          }
        />
      ) : (
        messages.map((msg) => (
          <List.Item
            key={msg.id}
            icon={
              msg.role === "user"
                ? Icon.Person
                : msg.isLoading
                  ? Icon.Clock
                  : Icon.Message
            }
            title={
              msg.role === "user" ? "You" : msg.isLoading ? "Thinking..." : "AI"
            }
            subtitle={
              msg.content.substring(0, 60) +
              (msg.content.length > 60 ? "..." : "")
            }
            detail={
              <List.Item.Detail
                markdown={msg.content}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Time"
                      text={new Date(msg.timestamp).toLocaleTimeString()}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Role"
                      text={msg.role === "user" ? "You" : "AI"}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title="Send"
                  icon={Icon.Envelope}
                  onAction={sendMessage}
                />
                <Action.CopyToClipboard
                  title="Copy Message"
                  content={msg.content}
                />
                <ActionPanel.Submenu
                  title={`Reasoning: ${reasoningLevel}`}
                  icon={Icon.LightBulb}
                >
                  {reasoningOptions.map((opt) => (
                    <Action
                      key={opt.value}
                      title={opt.title}
                      icon={
                        reasoningLevel === opt.value
                          ? Icon.Checkmark
                          : undefined
                      }
                      onAction={() => setReasoningLevel(opt.value)}
                    />
                  ))}
                </ActionPanel.Submenu>
                <Action
                  title="Clear Chat"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                  onAction={clearChat}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
