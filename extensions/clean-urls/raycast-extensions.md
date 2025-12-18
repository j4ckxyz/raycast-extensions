This markdown file consolidates the provided Raycast extension documentation into a structured, single-source guide optimized for LLM context windows and developer reference.

---

# Raycast Extension Development: The Complete Guide

## 1. Getting Started & System Requirements

Before building, ensure your environment meets these specifications:

* **Raycast Version:** 1.26.0 or higher.
* **Node.js:** 22.14 or higher (nvm recommended).
* **Package Manager:** npm 7 or higher.
* **Core Skills:** React and TypeScript.
* **Authentication:** You must be signed in to Raycast to use the `Create Extension` and `Store` commands.

---

## 2. Creating Your First Extension

### Step 1: Initialize

1. Open Raycast and run the **Create Extension** command.
2. Name it (e.g., "Hello World") and select the **Detail** template.
3. Choose a location and press `⌘ ↵`.

### Step 2: Build and Run

```bash
cd your-extension-directory
npm install
npm run dev

```

The extension will appear at the top of your Raycast root search.

### Step 3: Develop

Edit `./src/index.tsx`. The developer environment supports **Hot Reloading**. Changes reflect immediately upon saving.

---

## 3. Preparing for the Store (Guidelines)

To pass the review process, adhere to these standards:

### Metadata (package.json)

* **Author:** Use your Raycast username.
* **License:** Must be `MIT`.
* **Dependencies:** Use `npm` and include `package-lock.json`.
* **Build:** Always run `npm run build` locally to verify type-checking before submission.

### Naming Conventions

* **Style:** Follow Apple Style Guide (Title Case).
* **Extension Title:** Noun-based (e.g., "Emoji Search" not "Search Emoji").
* **Command Title:** Verb + Noun (e.g., "Create Task").
* **Subtitles:** Use for service names (e.g., "GitHub") to provide context.

### Assets & UI

* **Icons:** 512x512px PNG. Must look good in Light and Dark modes. No default Raycast icons allowed.
* **Screenshots:** 2000x1250px (16:10). Provide 3–6 screenshots. Use the built-in Window Capture tool (`⌘⇧⌥+M` in dev mode).
* **Navigation:** Use the Raycast `Navigation` API. Do not build custom navigation stacks.
* **Empty States:** Use `List.EmptyView` to avoid flickering "No Results" screens during data fetches.

---

## 4. Publishing Your Extension

### Validation

Run `npm run build` to ensure the production bundle is error-free.

### The Publish Command

Run `npm run publish`.

* This automatically forks the Raycast extension repo and opens a Pull Request.
* It handles squashing commits automatically.
* If others contribute via GitHub, run `npx @raycast/api@latest pull-contributions` to sync locally.

---

## 5. Development Examples

### Example A: Hacker News (List View & RSS)

This example demonstrates fetching an RSS feed and rendering a list with actions.

```typescript
import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import Parser from "rss-parser";

const parser = new Parser();

export default function Command() {
  const [state, setState] = useState<{ items?: Parser.Item[]; error?: Error }>({});

  useEffect(() => {
    async function fetchStories() {
      try {
        const feed = await parser.parseURL("https://hnrss.org/frontpage?description=0&count=25");
        setState({ items: feed.items });
      } catch (e) {
        setState({ error: e instanceof Error ? e : new Error("Failed") });
      }
    }
    fetchStories();
  }, []);

  return (
    <List isLoading={!state.items && !state.error}>
      {state.items?.map((item, index) => (
        <List.Item
          key={item.guid}
          title={item.title ?? ""}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={item.link ?? ""} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

```

### Example B: Doppler Share (Forms & Preferences)

This example shows how to use forms and persistent storage for inputs.

* **Form Items:** Use `Form.TextArea`, `Form.Dropdown`.
* **`storeValue`:** Set to `true` in Dropdowns to remember the user's last selection across sessions.
* **Form Submission:**

```typescript
function ShareSecretAction() {
  async function handleSubmit(values: { secret: string; expireViews: string }) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Sharing..." });
    try {
      // API Logic here
      toast.style = Toast.Style.Success;
      toast.title = "Secret Shared";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed";
    }
  }
  return <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />;
}

```

---

## 6. Prohibited Practices & Constraints

* **Keychain:** Extensions requesting Keychain Access will be **rejected**.
* **Analytics:** External analytics (Google Analytics, Mixpanel, etc.) are **prohibited**.
* **Binaries:** Avoid heavy binaries. If using a CLI, download it from a verified, trusted source with hash checks.
* **Localization:** Only US English is supported. Do not implement custom localization frameworks.

---

## 7. Versioning (CHANGELOG.md)

Keep a `CHANGELOG.md` in the root folder using this format:

```markdown
## [Title of Change] - {PR_MERGE_DATE}
- Descriptive bullet point of change

```

Using `{PR_MERGE_DATE}` allows Raycast to automatically insert the correct date when the PR is merged.

