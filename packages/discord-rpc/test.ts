import { type ActivityPayload, DiscordRPC } from "./src/index.ts";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const log = (message: string) => {
  const timestamp = new Date().toISOString().split("T")[1].slice(0, 8);
  console.log(`[${timestamp}] ${message}`);
};

const rpc = new DiscordRPC();
const clientIds = ["1375941857393119273", "728713238845325433"];

// ============================================================
// Example 1: Basic Activity with all common fields
// ============================================================
log("Setting basic activity with state, details, party, and buttons...");
await rpc.updateActivity(clientIds[0], {
  // Main text lines shown in the activity
  details: "Playing Campaign Mode",
  state: "In Lobby",

  // Party info (shows "In a party (1 of 4)" in Discord)
  party: {
    id: "unique-party-id-123",
    size: [1, 4], // [current, max]
  },

  // Clickable buttons (max 2)
  buttons: [
    {
      label: "Join Game",
      url: "https://example.com/join/123",
    },
    {
      label: "View Profile",
      url: "https://example.com/profile",
    },
  ],
} satisfies ActivityPayload);

await sleep(5000);

// ============================================================
// Example 2: Activity with Timestamps (elapsed time)
// ============================================================
log("Setting activity with elapsed time timestamp...");
await rpc.updateActivity(clientIds[0], {
  details: "In a Ranked Match",
  state: "Attacking",

  // Shows "00:00 elapsed" and counts up
  timestamps: {
    start: Date.now(),
  },

  party: {
    id: "match-456",
    size: [5, 5],
  },
} satisfies ActivityPayload);

await sleep(5000);

// ============================================================
// Example 3: Activity with Countdown Timer
// ============================================================
log("Setting activity with countdown timer...");
await rpc.updateActivity(clientIds[0], {
  details: "Queue Time",
  state: "Waiting for players...",

  // Shows "05:00 remaining" and counts down
  timestamps: {
    end: Date.now() + 5 * 60 * 1000, // 5 minutes from now
  },
} satisfies ActivityPayload);

await sleep(5000);

// ============================================================
// Example 4: Activity with Large & Small Images
// ============================================================
log("Setting activity with images (large and small)...");
await rpc.updateActivity(clientIds[0], {
  details: "Exploring the World",
  state: "Level 42 - Forest Zone",

  // Large image (main image)
  assets: {
    large_image: "map_forest", // Asset key from Discord Developer Portal
    large_text: "Forest Zone - Difficulty: Hard", // Tooltip on hover

    // Small image (overlays bottom-right of large image)
    small_image: "class_warrior",
    small_text: "Warrior Class",
  },

  timestamps: {
    start: Date.now() - 30 * 60 * 1000, // Started 30 minutes ago
  },
} satisfies ActivityPayload);

await sleep(5000);

// ============================================================
// Example 5: Switching to Different Client ID
// ============================================================
log("Switching to a different Discord Application (Client ID)...");
await rpc.updateActivity(clientIds[1], {
  details: "Now using different app",
  state: "Client switched successfully",

  buttons: [
    {
      label: "Learn More",
      url: "https://example.com",
    },
  ],
} satisfies ActivityPayload);

await sleep(5000);

// ============================================================
// Example 6: Minimal Activity (just details)
// ============================================================
log("Setting minimal activity with just details...");
await rpc.updateActivity(clientIds[1], {
  details: "Idle in Menu",
} satisfies ActivityPayload);

await sleep(5000);

// ============================================================
// Example 7: Activity with Secrets (for game invites)
// ============================================================
log("Setting activity with invite secrets...");
await rpc.updateActivity(clientIds[1], {
  details: "In Multiplayer Lobby",
  state: "Waiting for friends",

  party: {
    id: "lobby-789",
    size: [2, 8],
  },

  // Secrets for Discord's "Ask to Join" / "Spectate" features
  // These generate invite buttons in Discord
  secrets: {
    join: "unique-join-secret-abc123",
    spectate: "unique-spectate-secret-xyz789",
    match: "unique-match-id-456",
  },

  timestamps: {
    start: Date.now(),
  },
} satisfies ActivityPayload);

await sleep(5000);

// ============================================================
// Example 8: Clear Activity (remove rich presence but stay connected)
// ============================================================
log("Clearing activity...");
await rpc.updateActivity(clientIds[1], true);

await sleep(3000);

// ============================================================
// Example 9: Set activity again after clearing
// ============================================================
log("Setting activity again after clear...");
await rpc.updateActivity(clientIds[1], {
  details: "Back from AFK",
  state: "Ready to play",

  timestamps: {
    start: Date.now(),
  },
} satisfies ActivityPayload);

await sleep(5000);

// ============================================================
// Example 10: Full disconnect (clear activity and disconnect)
// ============================================================
log("Disconnecting from Discord RPC...");
await rpc.updateActivity(clientIds[1], true, true);

log("Test completed!");
