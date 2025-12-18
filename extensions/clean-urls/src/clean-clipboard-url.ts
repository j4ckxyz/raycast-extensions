import { Clipboard, showHUD } from "@raycast/api";
import { cleanUrl, isValidUrl } from "./url-cleaner";

/**
 * Extract a URL from text content (handles cases where URL is surrounded by whitespace or quotes)
 */
function extractUrl(text: string): string | null {
  const trimmed = text.trim();

  // If the whole thing is a valid URL, use it
  if (isValidUrl(trimmed)) {
    return trimmed;
  }

  // Try to find a URL in the text (handles cases where URL is wrapped in quotes or has extra text)
  const urlMatch = trimmed.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/i);
  if (urlMatch && isValidUrl(urlMatch[0])) {
    return urlMatch[0];
  }

  return null;
}

export default async function Command() {
  try {
    // Read clipboard content
    const clipboardContent = await Clipboard.read();
    const text = clipboardContent.text;

    // Check if clipboard has content
    if (!text) {
      await showHUD("❌ No text on clipboard");
      return;
    }

    // Extract URL from the text
    const extractedUrl = extractUrl(text);

    if (!extractedUrl) {
      await showHUD("❌ Clipboard doesn't contain a valid URL");
      return;
    }

    // Clean the URL
    const { url: cleanedUrl, removed } = cleanUrl(extractedUrl);

    // Copy cleaned URL to clipboard
    await Clipboard.copy(cleanedUrl);

    // Show feedback based on result
    if (removed === 0) {
      await showHUD("✨ URL is already clean!");
    } else {
      const plural = removed === 1 ? "parameter" : "parameters";
      await showHUD(`✅ Removed ${removed} tracking ${plural}`);
    }
  } catch (error) {
    console.error("Error cleaning URL:", error);
    await showHUD("❌ Failed to clean URL");
  }
}
