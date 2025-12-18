import { getPreferenceValues } from "@raycast/api";
import * as fs from "fs";
import * as path from "path";

// Interfaces
export interface Preferences {
  serverUrl: string;
  apiKey: string;
}

export interface Model {
  id: string;
  name: string;
  owned_by: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  thinking?: string;
}

export interface FileReference {
  type: "file" | "collection";
  id: string;
  name?: string;
}

export interface UploadedFile {
  id: string;
  filename: string;
  created_at: string;
  meta?: {
    name?: string;
    content_type?: string;
    size?: number;
  };
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

  chatCompletion: async (
    messages: ChatMessage[],
    model: string,
    files?: FileReference[],
    reasoningLevel?: string,
  ): Promise<ChatCompletionResult> => {
    const { serverUrl, apiKey } = getPreferences();

    const body: Record<string, unknown> = {
      model,
      messages: messages.map(({ role, content }) => ({ role, content })),
      stream: false,
    };

    // Add files for RAG
    if (files && files.length > 0) {
      body.files = files;
    }

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
    const choice = data.choices[0];
    const thinking =
      choice.message.reasoning_content || choice.message.thinking;

    return {
      content: choice.message.content,
      thinking: thinking,
    };
  },

  uploadFile: async (filePath: string): Promise<UploadedFile> => {
    const { serverUrl, apiKey } = getPreferences();

    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);

    // Create a boundary for multipart form data
    const boundary = `----FormBoundary${Date.now()}`;
    const crlf = "\r\n";

    // Build the multipart body manually
    const header = `--${boundary}${crlf}Content-Disposition: form-data; name="file"; filename="${fileName}"${crlf}Content-Type: application/octet-stream${crlf}${crlf}`;
    const footer = `${crlf}--${boundary}--${crlf}`;

    const headerBuffer = Buffer.from(header);
    const footerBuffer = Buffer.from(footer);
    const bodyBuffer = Buffer.concat([
      headerBuffer,
      fileBuffer,
      footerBuffer,
    ] as unknown as Uint8Array[]);
    const body = new Uint8Array(bodyBuffer);

    const response = await fetch(`${serverUrl}/api/v1/files/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body: body,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`File upload failed: ${errText}`);
    }

    return (await response.json()) as UploadedFile;
  },

  getFiles: async (): Promise<UploadedFile[]> => {
    const { serverUrl, apiKey } = getPreferences();

    const response = await fetch(`${serverUrl}/api/v1/files/`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch files: ${response.statusText}`);
    }

    return (await response.json()) as UploadedFile[];
  },

  // Save chat to Open WebUI so it appears in the web interface
  saveChat: async (
    messages: ChatMessage[],
    model: string,
    title?: string,
  ): Promise<{ id: string }> => {
    const { serverUrl, apiKey } = getPreferences();

    // Format messages for Open WebUI's chat format
    const chatMessages = messages.map((msg, idx) => ({
      id: `msg-${idx}`,
      role: msg.role,
      content: msg.content,
      timestamp: Date.now() / 1000,
    }));

    const body = {
      chat: {
        title: title || messages[0]?.content.substring(0, 50) || "Raycast Chat",
        models: [model],
        messages: chatMessages,
        history: {
          messages: Object.fromEntries(
            chatMessages.map((msg, idx) => [
              msg.id,
              { ...msg, parentId: idx > 0 ? chatMessages[idx - 1].id : null },
            ]),
          ),
          currentId: chatMessages[chatMessages.length - 1]?.id,
        },
      },
    };

    const response = await fetch(`${serverUrl}/api/v1/chats/new`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Save chat failed:", errText);
      // Don't throw - saving to Open WebUI is optional
      return { id: "" };
    }

    return (await response.json()) as { id: string };
  },
};
