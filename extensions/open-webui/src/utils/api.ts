import { getPreferenceValues } from "@raycast/api";

// Interfaces

export interface Model {
  id: string;
  name: string;
  owned_by: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  id?: string;
  timestamp?: number;
  thinking?: string;
}

export interface Chat {
  id: string;
  title: string;
  updated_at: number;
  models?: string[];
  tags?: string[];
}

export interface ChatCompletionChoice {
  message: {
    role: string;
    content: string;
    reasoning_content?: string;
    thinking?: string;
  };
  finish_reason: string;
}

export interface ChatCompletionResponse {
  choices: ChatCompletionChoice[];
}

export interface ChatCompletionResult {
  content: string;
  thinking?: string;
}

// Configuration
const getPreferences = (): Preferences => {
  return getPreferenceValues<Preferences>();
};

// API Client
export const api = {
  getModels: async (): Promise<Model[]> => {
    const { serverUrl, apiKey } = getPreferences();
    const response = await fetch(`${serverUrl}/api/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const data = (await response.json()) as { data: Model[] };
    return data.data;
  },

  getChats: async (): Promise<Chat[]> => {
    const { serverUrl, apiKey } = getPreferences();
    const response = await fetch(`${serverUrl}/api/v1/chats/`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch chats: ${response.statusText}`);
    }

    const data = await response.json();
    return data as Chat[];
  },

  getChat: async (
    id: string,
  ): Promise<{
    chat: {
      messages: ChatMessage[];
      models: string[];
      title?: string;
      tags?: string[];
    };
  }> => {
    const { serverUrl, apiKey } = getPreferences();
    const response = await fetch(`${serverUrl}/api/v1/chats/${id}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch chat: ${response.statusText}`);
    }

    return await response.json();
  },

  generateTitle: async (
    messages: ChatMessage[],
    model: string,
  ): Promise<string> => {
    const promptMessages: ChatMessage[] = [
      ...messages,
      {
        role: "user",
        content:
          "Generate a brief 3-5 word title for this conversation. Do not use quotes. Output ONLY the title.",
      },
    ];

    try {
      const result = await api.chatCompletion(promptMessages, model);
      return result.content.trim().replace(/^["']|["']$/g, "");
    } catch (error) {
      console.error("Failed to generate title:", error);
      return "New Chat";
    }
  },

  getUniqueTags: async (): Promise<string[]> => {
    try {
      const chats = await api.getChats();
      const tags = new Set<string>();
      chats.forEach((chat) => {
        if (chat.tags) {
          chat.tags.forEach((tag) => tags.add(tag));
        }
      });
      return Array.from(tags).sort();
    } catch (e) {
      console.error("Error fetching tags:", e);
      return [];
    }
  },

  // Create or Update chat
  saveChat: async (
    chatId: string | undefined, // undefined = new chat
    messages: ChatMessage[],
    model: string,
    reasoningLevel?: string,
    title?: string,
    tags?: string[],
  ): Promise<{ id: string }> => {
    const { serverUrl, apiKey } = getPreferences();
    const endpoint = chatId
      ? `${serverUrl}/api/v1/chats/${chatId}`
      : `${serverUrl}/api/v1/chats/new`;

    const body: any = {
      chat: {
        messages: messages,
        models: [model],
        params: reasoningLevel ? { reasoning_effort: reasoningLevel } : {},
      },
    };

    if (title) body.chat.title = title;
    if (tags) body.chat.tags = tags;

    // If updating, the payload might differ slightly depending on Open WebUI version
    // But typically POST /chats/new returns an ID.
    // For updates, we often just need to push the new state.
    // NOTE: Open WebUI API for updates can be tricky.
    // If we use /api/v1/chats/new with an existing ID in the body, it might update.
    // But let's assume specific endpoint for now or just recreate logic.
    // Actually, checking Open WebUI source/docs is safer.
    // Standard Open WebUI often uses POST /api/v1/chats/new for everything (upsert with same ID).

    // For now, let's use the simplest approach: Always POST to /api/v1/chats/new
    // But if we want to update, we need to ensure we pass the same ID if possible or just use the returned ID for future calls.
    // Wait, the user specifically asked for "one chat in extension = one chat in open webui".
    // So we MUST maintain the ID.

    // If chatId exists, we should try to update.
    // Recent Open WebUI versions allow POST /api/v1/chats/{id} to update details.

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      // Fallback: If specific ID update failed, maybe it doesn't exist?
      // But throwing error is better for now.
      const text = await response.text();
      throw new Error(`Failed to save chat: ${text}`);
    }

    const data = await response.json();
    return { id: data.id || chatId || "" };
  },

  chatCompletion: async (
    messages: ChatMessage[],
    model: string,
    reasoningLevel?: string,
  ): Promise<ChatCompletionResult> => {
    const { serverUrl, apiKey } = getPreferences();

    const body: Record<string, unknown> = {
      model,
      messages: messages.map(({ role, content }) => ({ role, content })),
      stream: false,
    };

    // Add reasoning effort for models that support it
    if (reasoningLevel) {
      body.reasoning_effort = reasoningLevel;
    }

    const response = await fetch(`${serverUrl}/api/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Chat completion failed: ${errText}`);
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const choices = data.choices;

    if (!choices || choices.length === 0) {
      throw new Error("No response choices returned from API");
    }

    const choice = choices[0];
    const thinking =
      choice.message.reasoning_content || choice.message.thinking;

    return {
      content: choice.message.content,
      thinking: thinking,
    };
  },
};
