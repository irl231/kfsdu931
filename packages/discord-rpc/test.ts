import { DiscordRPC } from "./src/index.ts";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const rpc = new DiscordRPC();
await rpc.updateActivity("123", {
  details: "Hello World",
  state: "Hello World",
  party: {
    id: "123",
    size: [1, 2],
  },
  buttons: [
    {
      label: "Hello World",
      url: "https://google.com",
    },
    {
      label: "Hello World",
      url: "https://google.com",
    },
  ],
});

await sleep(5000);
await rpc.updateActivity("1234", {
  details: "Hello World from asdasd",
  state: "Hello World",
  party: {
    id: "123",
    size: [2, 2],
  },
  buttons: [
    {
      label: "Hello World",
      url: "https://google.com",
    },
  ],
});

await sleep(5000);
await rpc.updateActivity("123", true);
await sleep(5000);
await rpc.updateActivity("123", {
  details: "Hfsdfsdfello World from asdasd",
  state: "Hdfsdfsdfello World",
  party: {
    id: "123",
    size: [2, 2],
  },
  buttons: [
    {
      label: "Hello World",
      url: "https://google.com",
    },
  ],
});
await sleep(5000);
await rpc.updateActivity("12345", {
  details: "Hfsdfsdfello World from asdasd",
  state: "Hdfsdfsdfello World",
  timestamps: {
    start: Date.now(),
  },
  party: {
    id: "123",
    size: [2, 2],
  },
  buttons: [
    {
      label: "Hello World",
      url: "https://google.com",
    },
  ],
});
await sleep(5000);
await rpc.updateActivity("123", true, true);
