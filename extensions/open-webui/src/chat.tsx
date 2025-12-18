import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  LocalStorage,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { api, ChatMessage, Model } from "./utils/api";

const STORAGE_KEY = "open-webui-chat-state";

interface ChatProps {
  launchContext?: {
    chatId?: string;
  };
}

export default function Chat(props: ChatProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [reasoningLevel, setReasoningLevel] = useState<string>("none");
  const [chatId, setChatId] = useState<string | undefined>(
    props.launchContext?.chatId,
  );
  const [title, setTitle] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);

  const messagesRef = useRef<ChatMessage[]>([]);
  const chatIdRef = useRef<string | undefined>(props.launchContext?.chatId);
  const tagsRef = useRef<string[]>([]);

  // Keep refs in sync
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    chatIdRef.current = chatId;
  }, [chatId]);

  useEffect(() => {
    tagsRef.current = tags;
  }, [tags]);

  // Load on mount
  useEffect(() => {
    async function init() {
      try {
        setIsLoading(true);

        const fetchedModels = await api.getModels();
        setModels(fetchedModels);

        // If we have a chatId, load that chat from API
        if (props.launchContext?.chatId) {
          const fullChat = await api.getChat(props.launchContext.chatId);
          if (fullChat && fullChat.chat) {
            const history = fullChat.chat.messages || [];
            setMessages(history);
            messagesRef.current = history;
            if (fullChat.chat.title) setTitle(fullChat.chat.title);
            if (fullChat.chat.tags) {
              setTags(fullChat.chat.tags);
              tagsRef.current = fullChat.chat.tags;
            }

            if (fullChat.chat.models && fullChat.chat.models.length > 0) {
              setSelectedModel(fullChat.chat.models[0]);
            } else if (fetchedModels.length > 0) {
              setSelectedModel(fetchedModels[0].id);
            }
          }
        }
        // ... (local storage logic could be updated too but skipping for brevity as API is source of truth)
        else {
          const saved = await LocalStorage.getItem<string>(STORAGE_KEY);
          let restoredModel = "";
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              // Only restore if we are not forcing a specific chat
              if (parsed.messages) {
                setMessages(parsed.messages);
                messagesRef.current = parsed.messages;
              }
              if (parsed.model) {
                setSelectedModel(parsed.model);
                restoredModel = parsed.model;
              }
              if (parsed.reasoning) setReasoningLevel(parsed.reasoning);
            } catch (e) {
              console.error("Parse error:", e);
            }
          }

          // Set default model if not restored
          if (!restoredModel && fetchedModels.length > 0) {
            setSelectedModel(fetchedModels[0].id);
          }
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
  }, [props.launchContext?.chatId]);

  // Save local state for resilience
  useEffect(() => {
    LocalStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        messages,
        model: selectedModel,
        reasoning: reasoningLevel,
      }),
    );
  }, [messages, selectedModel, reasoningLevel]);

  const markdown =
    messages.length === 0
      ? `## Open WebUI Chat\n\nType below to start chatting with **${selectedModel || "AI"}**`
      : messages
          .map((msg) => {
            const icon = msg.role === "user" ? "👤" : "🤖";
            const name = msg.role === "user" ? "You" : selectedModel;
            const thinkingBlock = msg.thinking
              ? `> **Thinking**\n> ${msg.thinking.replace(/\n/g, "\n> ")}\n\n---\n\n`
              : "";
            return `### ${icon} ${name}\n\n${thinkingBlock}${msg.content}\n\n---`;
          })
          .join("\n");

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      navigationTitle={title || "New Chat"}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Actions">
            <Action.Push
              title="Send Message"
              icon={Icon.Bubble}
              target={
                <MessageForm
                  parentSendMessage={async (text) => {
                    const userMsg: ChatMessage = {
                      role: "user",
                      content: text,
                    };
                    const newMessages = [...messagesRef.current, userMsg];
                    setMessages(newMessages);
                    setIsLoading(true);
                    showToast({
                      style: Toast.Style.Animated,
                      title: "Sending message...",
                    });

                    try {
                      const response = await api.chatCompletion(
                        newMessages,
                        selectedModel,
                        reasoningLevel !== "none" ? reasoningLevel : undefined,
                      );

                      const assistantMsg: ChatMessage = {
                        role: "assistant",
                        content: response.content,
                        thinking: response.thinking,
                      };

                      const finalMessages = [...newMessages, assistantMsg];
                      setMessages(finalMessages);
                      showToast({
                        style: Toast.Style.Success,
                        title: "Response received",
                      });

                      try {
                        // First save to persist content
                        const result = await api.saveChat(
                          chatIdRef.current,
                          finalMessages,
                          selectedModel,
                          reasoningLevel !== "none"
                            ? reasoningLevel
                            : undefined,
                          title,
                          tagsRef.current,
                        );
                        if (result && result.id) {
                          setChatId(result.id);
                          chatIdRef.current = result.id;
                        }

                        // Auto-generate title if it's the first turn
                        if (finalMessages.length === 2 && !title) {
                          showToast({
                            style: Toast.Style.Animated,
                            title: "Generating title...",
                          });
                          const newTitle = await api.generateTitle(
                            finalMessages,
                            selectedModel,
                          );
                          setTitle(newTitle);

                          // Update chat with new title
                          await api.saveChat(
                            result.id,
                            finalMessages,
                            selectedModel,
                            reasoningLevel !== "none"
                              ? reasoningLevel
                              : undefined,
                            newTitle,
                            tagsRef.current,
                          );
                          showToast({
                            style: Toast.Style.Success,
                            title: "Chat saved",
                          });
                        }
                      } catch (e) {
                        console.error(e);
                      }
                    } catch (e) {
                      showToast({
                        style: Toast.Style.Failure,
                        title: "Error",
                        message: String(e),
                      });
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                />
              }
            />
            <Action.Push
              title="Add to Folder (Tag)"
              icon={Icon.Folder}
              shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
              target={
                <TagForm
                  onAddTag={async (tag) => {
                    const newTags = [...tagsRef.current, tag];
                    setTags(newTags);
                    tagsRef.current = newTags;
                    showToast({
                      style: Toast.Style.Animated,
                      title: "Adding tag...",
                    });
                    try {
                      await api.saveChat(
                        chatIdRef.current,
                        messagesRef.current,
                        selectedModel,
                        reasoningLevel !== "none" ? reasoningLevel : undefined,
                        title,
                        newTags,
                      );
                      showToast({
                        style: Toast.Style.Success,
                        title: "Tag added",
                      });
                    } catch (e) {
                      showToast({
                        style: Toast.Style.Failure,
                        title: "Failed to add tag",
                        message: String(e),
                      });
                    }
                  }}
                />
              }
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Settings">
            <ActionPanel.Submenu title="Select Model" icon={Icon.ComputerChip}>
              {models.map((m) => (
                <Action
                  key={m.id}
                  title={m.name}
                  onAction={() => setSelectedModel(m.id)}
                  icon={selectedModel === m.id ? Icon.CheckCircle : Icon.Circle}
                />
              ))}
            </ActionPanel.Submenu>

            {selectedModel.toLowerCase().includes("r1") ||
            selectedModel.toLowerCase().includes("reasoning") ||
            selectedModel.toLowerCase().includes("thinking") ||
            reasoningLevel !== "none" ? (
              <ActionPanel.Submenu
                title="Reasoning Level"
                icon={Icon.LightBulb}
              >
                {["none", "low", "medium", "high"].map((level) => (
                  <Action
                    key={level}
                    title={level.charAt(0).toUpperCase() + level.slice(1)}
                    onAction={() => setReasoningLevel(level)}
                    icon={
                      reasoningLevel === level ? Icon.CheckCircle : Icon.Circle
                    }
                  />
                ))}
              </ActionPanel.Submenu>
            ) : null}
          </ActionPanel.Section>
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Model" text={selectedModel} />
          <Detail.Metadata.Label
            title="Messages"
            text={messages.length.toString()}
          />
          {tags.length > 0 && (
            <Detail.Metadata.TagList title="Folders">
              {tags.map((tag) => (
                <Detail.Metadata.TagList.Item key={tag} text={tag} />
              ))}
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
    />
  );
}

function MessageForm({
  parentSendMessage,
}: {
  parentSendMessage: (t: string) => Promise<void>;
}) {
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Send"
            onSubmit={(values) => {
              pop();
              parentSendMessage(values.message);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="message"
        title="Message"
        placeholder="Type here..."
        autoFocus
      />
    </Form>
  );
}

function TagForm({ onAddTag }: { onAddTag: (tag: string) => void }) {
  const { pop } = useNavigation();
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [tagName, setTagName] = useState("");

  useEffect(() => {
    api.getUniqueTags().then(setExistingTags);
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Tag"
            onSubmit={() => {
              if (tagName) {
                onAddTag(tagName);
                pop();
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="tag"
        title="Tag Name"
        placeholder="Enter new tag name"
        value={tagName}
        onChange={setTagName}
      />
      {existingTags.length > 0 && (
        <Form.Description text={`Existing tags: ${existingTags.join(", ")}`} />
      )}
      {existingTags.length > 0 && (
        <Form.Dropdown
          id="existingTag"
          title="Or Select Existing"
          onChange={setTagName}
        >
          <Form.Dropdown.Item value="" title="Select..." />
          {existingTags.map((tag) => (
            <Form.Dropdown.Item key={tag} value={tag} title={tag} />
          ))}
        </Form.Dropdown>
      )}
    </Form>
  );
}
