# DataLikers MCP Server

[![npm version](https://img.shields.io/npm/v/datalikers-mcp.svg)](https://www.npmjs.com/package/datalikers-mcp)
[![npm downloads](https://img.shields.io/npm/dm/datalikers-mcp.svg)](https://www.npmjs.com/package/datalikers-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

MCP server for [DataLikers](https://datalikers.com) — access Instagram & TikTok data directly from Claude, Cursor, and other AI assistants. Available on npm: [`datalikers-mcp`](https://www.npmjs.com/package/datalikers-mcp).

## Get 100 Free API Requests

**[Sign up with this link](https://datalikers.com/p/1by27bwg)** and get **100 free DataLikers requests** — no credit card required. Enough to wire up the MCP server, try a few prompts in Claude/Cursor/Codex, and evaluate the data quality before committing.

> **[Get your free 100 requests here](https://datalikers.com/p/1by27bwg)**

<a href="https://glama.ai/mcp/servers/@subzeroid/datalikers-mcp"><img width="380" height="200" src="https://glama.ai/mcp/servers/@subzeroid/datalikers-mcp/badge" alt="DataLikers MCP server" /></a>

## What is DataLikers?

[DataLikers](https://datalikers.com) is an Instagram & TikTok data API platform. Search users by demographics, analyze engagement, explore hashtags, and more — all through a simple API. From $0.0003 per request.

## Available Tools (29)

### Users (10 tools)
| Tool | Description |
|------|-------------|
| `get_user_by_username` | Get user profile by Instagram username |
| `get_user_by_id` | Get user profile by Instagram ID |
| `search_users` | Search for users by query |
| `get_users_by_hashtag` | Find users associated with a hashtag |
| `get_users_by_location` | Find users by location |
| `get_top_users` | Get top users by followers |
| `get_business_users` | Get business accounts by category |
| `search_users_by_demographics` | Search by gender, age, race, emotion, country, city, and more |
| `get_user_photo` | Get user profile photo (returns actual image) |
| `get_user_engagement` | Get average likes/comments per post |

### Media & Posts (4 tools)
| Tool | Description |
|------|-------------|
| `get_user_medias` | Get user's posts and reels |
| `get_top_medias` | Get top posts by likes or comments |
| `search_media_captions` | Search posts by caption text |
| `get_media_by_code` | Get post by Instagram shortcode |

### Comments (2 tools)
| Tool | Description |
|------|-------------|
| `get_comments_by_user` | Get comments left by a user |
| `search_comments` | Search comments by text |

### Hashtags (3 tools)
| Tool | Description |
|------|-------------|
| `get_hashtag_info` | Get hashtag details and post count |
| `search_hashtags` | Search hashtags by query |
| `get_top_hashtags` | Get trending hashtags |

### Locations (2 tools)
| Tool | Description |
|------|-------------|
| `get_location_info` | Get location details |
| `search_locations` | Search locations by name |

### Stories & Highlights (4 tools)
| Tool | Description |
|------|-------------|
| `get_user_stories` | Get user's active stories |
| `get_story_by_id` | Get a specific story |
| `get_user_highlights` | Get user's highlights |
| `get_highlight_by_id` | Get a specific highlight |

### Music (3 tools)
| Tool | Description |
|------|-------------|
| `search_tracks` | Search music tracks used in reels |
| `get_track_by_id` | Get track details |
| `get_top_tracks` | Get trending tracks |

### Analytics (1 tool)
| Tool | Description |
|------|-------------|
| `get_stats` | Get database statistics (total users, posts, comments, etc.) |

## Quick Start

1. Get your API key at [datalikers.com](https://datalikers.com)
2. Install in your AI assistant (see below)
3. Ask Claude: *"Find Instagram users in New York with 10k+ followers"*

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "datalikers": {
      "command": "npx",
      "args": ["-y", "datalikers-mcp"],
      "env": {
        "DATALIKERS_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add datalikers -- npx -y datalikers-mcp \
  --env DATALIKERS_API_KEY=your-api-key
```

### Cursor

Add to Cursor MCP settings (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "datalikers": {
      "command": "npx",
      "args": ["-y", "datalikers-mcp"],
      "env": {
        "DATALIKERS_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "datalikers": {
      "command": "npx",
      "args": ["-y", "datalikers-mcp"],
      "env": {
        "DATALIKERS_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Configuration

| Environment Variable | Description | Required |
|---------------------|-------------|----------|
| `DATALIKERS_API_KEY` | Your DataLikers API key | Yes |
| `DATALIKERS_URL` | Custom server URL (for self-hosted instances) | No |

## Development

```bash
git clone https://github.com/subzeroid/datalikers-mcp.git
cd datalikers-mcp
npm install
npm run build
```

Run tests:

```bash
DATALIKERS_API_KEY=your-key npm test
```

Tests without `DATALIKERS_API_KEY` will skip integration tests and only run unit tests.

## How It Works

This is a thin proxy that connects to the [DataLikers](https://datalikers.com) remote MCP server and exposes all its tools locally via stdio transport. No data processing happens locally — all requests are forwarded to the DataLikers API.

```
AI Assistant ←stdio→ datalikers-mcp ←https→ DataLikers API
```

## License

MIT
