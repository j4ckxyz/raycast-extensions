import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
  Detail,
  Icon,
} from "@raycast/api";
import { useState } from "react";
import { api, UploadedFile } from "./utils/api";

export default function UploadFile() {
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: { files: string[] }) {
    const files = values.files;

    if (!files || files.length === 0) {
      showToast({ style: Toast.Style.Failure, title: "No file selected" });
      return;
    }

    setIsLoading(true);

    try {
      const results: UploadedFile[] = [];

      for (const filePath of files) {
        const result = await api.uploadFile(filePath);
        results.push(result);
      }

      push(<UploadSuccess files={results} />);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Upload failed",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Upload"
            icon={Icon.Upload}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="files"
        title="Select Files"
        allowMultipleSelection={true}
        canChooseDirectories={false}
      />
      <Form.Description
        title="About RAG"
        text="Uploaded files are automatically processed and stored in Open WebUI's vector database. You can then reference them in chat to ask questions about their content."
      />
    </Form>
  );
}

interface UploadSuccessProps {
  files: UploadedFile[];
}

function UploadSuccess({ files }: UploadSuccessProps) {
  const markdown = `# ✅ Upload Successful

${files.length} file(s) uploaded successfully!

| Filename | File ID |
|----------|---------|
${files.map((f) => `| ${f.filename} | \`${f.id}\` |`).join("\n")}

---

You can now use these files in your chat by attaching them when composing a message.

**To use in chat:**
1. Open the **Chat** command
2. Press **Enter** to compose a message
3. Select files from the **Attach Files** dropdown
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          {files.map((file) => (
            <Action.CopyToClipboard
              key={file.id}
              title={`Copy ID: ${file.filename}`}
              content={file.id}
            />
          ))}
        </ActionPanel>
      }
    />
  );
}
