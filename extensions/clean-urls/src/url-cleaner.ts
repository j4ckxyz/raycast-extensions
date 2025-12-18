/**
 * URL Cleaner - Smart URL cleaning with site-specific handlers
 * Uses pattern-based detection for general sites + custom handlers for social platforms
 */

// ============================================================================
// SITE-SPECIFIC HANDLERS
// ============================================================================

type SiteHandler = (url: URL) => URL;

/**
 * YouTube: Keep only video ID (v) and optional timestamp (t)
 * Converts youtu.be short links to standard format
 */
function handleYouTube(url: URL): URL {
  // Handle youtu.be short links
  if (url.hostname === "youtu.be") {
    const videoId = url.pathname.slice(1); // Remove leading /
    const timestamp = url.searchParams.get("t");
    const cleanUrl = new URL(`https://www.youtube.com/watch?v=${videoId}`);
    if (timestamp) cleanUrl.searchParams.set("t", timestamp);
    return cleanUrl;
  }

  // Handle youtube.com/watch
  const videoId = url.searchParams.get("v");
  const timestamp = url.searchParams.get("t");
  const list = url.searchParams.get("list"); // Preserve playlist

  if (videoId) {
    const cleanUrl = new URL(`https://www.youtube.com/watch`);
    cleanUrl.searchParams.set("v", videoId);
    if (timestamp) cleanUrl.searchParams.set("t", timestamp);
    if (list) cleanUrl.searchParams.set("list", list);
    return cleanUrl;
  }

  return url;
}

/**
 * Twitter/X: Keep only essential path, remove tracking params
 */
function handleTwitter(url: URL): URL {
  // Twitter URLs are path-based, just clean all query params
  url.search = "";
  url.hash = "";
  return url;
}

/**
 * Instagram: Keep only the post/reel/profile path
 */
function handleInstagram(url: URL): URL {
  url.search = "";
  url.hash = "";
  return url;
}

/**
 * TikTok: Keep only the video path
 */
function handleTikTok(url: URL): URL {
  url.search = "";
  url.hash = "";
  return url;
}

/**
 * Reddit: Keep only the post/comment path
 */
function handleReddit(url: URL): URL {
  url.search = "";
  url.hash = "";
  return url;
}

/**
 * Spotify: Keep only the track/album/playlist path
 */
function handleSpotify(url: URL): URL {
  url.search = "";
  url.hash = "";
  return url;
}

/**
 * Amazon: Keep only the product path (/dp/ASIN or /gp/product/ASIN)
 */
function handleAmazon(url: URL): URL {
  const path = url.pathname;

  // Extract ASIN from /dp/ASIN or /gp/product/ASIN
  const dpMatch = path.match(/\/dp\/([A-Z0-9]{10})/i);
  const gpMatch = path.match(/\/gp\/product\/([A-Z0-9]{10})/i);

  const asin = dpMatch?.[1] || gpMatch?.[1];
  if (asin) {
    return new URL(`https://${url.hostname}/dp/${asin}`);
  }

  // Fallback: just clean params
  url.search = "";
  url.hash = "";
  return url;
}

/**
 * Facebook: Clean tracking params but preserve path
 */
function handleFacebook(url: URL): URL {
  url.search = "";
  url.hash = "";
  return url;
}

/**
 * LinkedIn: Clean tracking params but preserve path
 */
function handleLinkedIn(url: URL): URL {
  url.search = "";
  url.hash = "";
  return url;
}

// Map of hostname patterns to handlers
const SITE_HANDLERS: Map<RegExp, SiteHandler> = new Map([
  [/^(www\.)?(youtube\.com|youtu\.be)$/i, handleYouTube],
  [/^(www\.)?(twitter\.com|x\.com)$/i, handleTwitter],
  [/^(www\.)?instagram\.com$/i, handleInstagram],
  [/^(www\.)?tiktok\.com$/i, handleTikTok],
  [/^(www\.|old\.)?reddit\.com$/i, handleReddit],
  [/^open\.spotify\.com$/i, handleSpotify],
  [
    /^(www\.)?amazon\.(com|co\.uk|de|fr|it|es|ca|com\.au|co\.jp)$/i,
    handleAmazon,
  ],
  [/^(www\.|m\.)?facebook\.com$/i, handleFacebook],
  [/^(www\.)?linkedin\.com$/i, handleLinkedIn],
]);

// ============================================================================
// PATTERN-BASED TRACKING DETECTION (for all other sites)
// ============================================================================

// Known tracking prefixes - if a param starts with these, it's tracking
const TRACKING_PREFIXES = [
  "utm_", // Google Analytics
  "fbclid", // Facebook (exact match handled below)
  "gclid", // Google Ads
  "msclkid", // Microsoft
  "__hs", // HubSpot
  "_hs", // HubSpot
  "mc_", // Mailchimp
  "fb_", // Facebook
  "tt_", // TikTok
  "at_", // AT Internet / BBC
  "mtm_", // Matomo
  "pk_", // Piwik
  "ns_", // Newsweaver
  "stm_", // Similar to UTM
  "aff_", // Affiliate tracking
  "ref_", // Referrer
  "oly_", // Omeda
  "vero_", // Vero
  "ml_", // Mailerlite
  "nr_", // Newsletter
  "hsa_", // HubSpot Ads
  "dm_", // Dotmailer
  "wickedid", // Wicked Reports
];

// Exact match tracking parameters
const TRACKING_PARAMS_EXACT = new Set([
  // Click IDs
  "fbclid",
  "gclid",
  "gclsrc",
  "dclid",
  "msclkid",
  "twclid",
  "ttclid",
  "li_fat_id",
  "yclid",
  "wbraid",
  "gbraid",
  "rdt_cid",
  "sc_cid",
  "spm",
  "_kx",
  "tblci",
  "oborigurl",
  "outbrainclickid",
  // Referrer/source
  "ref",
  "referrer",
  "source",
  "campaign",
  "trk",
  "mkt_tok",
  // Analytics IDs
  "_ga",
  "_gl",
  "_ke",
  "cid",
  "igshid",
  "si",
  "feature",
  // HubSpot
  "__hsfp",
  "__hssc",
  "__hstc",
  "hsctaTracking",
  // Email/CRM
  "mktoid",
  "__s",
  // General
  "xtor",
  "share_source_id",
  "share_source_type",
  // Misc
  "_branch_match_id",
  "adjust_tracker",
  "adjust_campaign",
  "adjust_adgroup",
  "pi_campaign_id",
  "pi_contact_id",
]);

// Patterns that suggest a param value is a tracking ID (long random strings)
const TRACKING_VALUE_PATTERNS = [
  /^[A-Za-z0-9\-_]{20,}$/, // Long alphanumeric strings
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, // UUIDs
];

// Parameters that SHOULD be preserved (whitelisted)
const PRESERVE_PARAMS = new Set([
  // Search/filtering
  "q",
  "query",
  "search",
  "s",
  "keyword",
  "keywords",
  // Pagination
  "page",
  "p",
  "offset",
  "limit",
  "per_page",
  "start",
  // Sorting/filtering
  "sort",
  "order",
  "filter",
  "category",
  "type",
  "tag",
  "tags",
  // Authentication/session (careful - but typically needed)
  "token",
  "code",
  "state",
  // Content identifiers
  "id",
  "v",
  "t",
  "item",
  "product",
  "sku",
  "slug",
  // Language/locale
  "lang",
  "language",
  "locale",
  "hl",
  "gl",
  // UI state
  "view",
  "mode",
  "tab",
  "section",
]);

/**
 * Check if a parameter is definitely tracking (by name patterns)
 */
function isDefinitelyTracking(paramName: string): boolean {
  const lower = paramName.toLowerCase();

  // Exact match
  if (TRACKING_PARAMS_EXACT.has(lower)) return true;

  // Prefix match
  for (const prefix of TRACKING_PREFIXES) {
    if (lower.startsWith(prefix)) return true;
  }

  return false;
}

/**
 * Check if a parameter should be preserved
 */
function shouldPreserve(paramName: string): boolean {
  return PRESERVE_PARAMS.has(paramName.toLowerCase());
}

/**
 * Check if a value looks like a tracking ID
 */
function looksLikeTrackingValue(value: string): boolean {
  return TRACKING_VALUE_PATTERNS.some((pattern) => pattern.test(value));
}

/**
 * Generic cleaning using pattern-based heuristics
 */
function genericClean(url: URL): URL {
  const paramsToRemove: string[] = [];

  url.searchParams.forEach((value, key) => {
    // Always remove definite tracking params
    if (isDefinitelyTracking(key)) {
      paramsToRemove.push(key);
      return;
    }

    // Always preserve known good params
    if (shouldPreserve(key)) {
      return;
    }

    // Heuristic: short param names with tracking-like values
    if (key.length <= 3 && looksLikeTrackingValue(value)) {
      paramsToRemove.push(key);
    }
  });

  for (const param of paramsToRemove) {
    url.searchParams.delete(param);
  }

  // Clean tracking hash fragments
  if (url.hash && /^#(xtor|utm|pk_|mtm_)/i.test(url.hash)) {
    url.hash = "";
  }

  return url;
}

// ============================================================================
// MAIN EXPORTS
// ============================================================================

export function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function cleanUrl(urlString: string): { url: string; removed: number } {
  const trimmedUrl = urlString.trim();

  if (!isValidUrl(trimmedUrl)) {
    return { url: trimmedUrl, removed: 0 };
  }

  try {
    const url = new URL(trimmedUrl);
    const originalParamCount = Array.from(url.searchParams).length;

    // Check for site-specific handler
    let cleanedUrl: URL = url;
    let usedSiteHandler = false;

    for (const [pattern, handler] of SITE_HANDLERS) {
      if (pattern.test(url.hostname)) {
        cleanedUrl = handler(new URL(url.toString()));
        usedSiteHandler = true;
        break;
      }
    }

    // If no site handler, use generic cleaning
    if (!usedSiteHandler) {
      cleanedUrl = genericClean(cleanedUrl);
    }

    // Count removed params
    const newParamCount = Array.from(cleanedUrl.searchParams).length;
    const removed = originalParamCount - newParamCount;

    // Clean up trailing ? if no params
    let finalUrl = cleanedUrl.toString();
    if (finalUrl.endsWith("?")) {
      finalUrl = finalUrl.slice(0, -1);
    }

    return { url: finalUrl, removed: Math.max(0, removed) };
  } catch {
    return { url: trimmedUrl, removed: 0 };
  }
}
