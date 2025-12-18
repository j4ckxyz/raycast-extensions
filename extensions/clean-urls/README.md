# Clean URLs

Remove tracking parameters from URLs on your clipboard with a single command.

## Features

- **One-click cleaning** - Run the command and your clipboard URL is instantly cleaned
- **Smart detection** - Removes 100+ tracking parameters (utm_*, fbclid, gclid, etc.)
- **Site-specific handlers** - Special cleaning for YouTube, Amazon, Twitter/X, Instagram, TikTok, Reddit, Spotify, Facebook, and LinkedIn
- **Safe by default** - Preserves essential URL parameters (search queries, pagination, etc.)

## How It Works

1. Copy a URL to your clipboard
2. Run "Clean Clipboard URL" in Raycast
3. The cleaned URL replaces your clipboard content

### Examples

| Before | After |
|--------|-------|
| `youtube.com/watch?v=abc&si=xyz&feature=share` | `youtube.com/watch?v=abc` |
| `amazon.com/long-product-name/dp/B08N5/ref=sr_1_1&tag=...` | `amazon.com/dp/B08N5` |
| `example.com/page?utm_source=fb&utm_medium=cpc&id=123` | `example.com/page?id=123` |

## Tracked Parameters Removed

- Google Analytics: `utm_source`, `utm_medium`, `utm_campaign`, etc.
- Social: `fbclid`, `gclid`, `twclid`, `ttclid`, `igshid`, `si`
- Ads: `msclkid`, `gclid`, `wbraid`, `gbraid`, `dclid`
- Email: `mc_cid`, `mc_eid`, `mkt_tok`, `__hs*`
- And many more...
