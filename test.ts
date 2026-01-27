import { Client } from "@distdev/discord-ipc";

const client = await new Client().connect("1465287640944345109")!;
console.log("Connected:", client.transport.ping());
console.log(await client.getGuilds());
