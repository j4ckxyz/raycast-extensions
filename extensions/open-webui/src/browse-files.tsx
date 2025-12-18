import {
  Action,
  ActionPanel,
  List,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { api, UploadedFile } from "./utils/api";

export default function BrowseFiles() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchFiles() {
      try {
        const fetchedFiles = await api.getFiles();
        setFiles(fetchedFiles);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load files",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchFiles();
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return "Unknown";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search files...">
      {files.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Document}
          title="No files uploaded"
          description="Use the 'Upload File' command to add files for RAG"
        />
      ) : (
        files.map((file) => (
          <List.Item
            key={file.id}
            icon={Icon.Document}
            title={file.filename}
            subtitle={file.meta?.content_type}
            accessories={[
              { text: formatSize(file.meta?.size) },
              { text: formatDate(file.created_at), icon: Icon.Calendar },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy File ID"
                  content={file.id}
                />
                <Action.CopyToClipboard
                  title="Copy Filename"
                  content={file.filename}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
