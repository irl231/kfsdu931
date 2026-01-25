import adventuraBg from "@assets/img/games/adventura-bg.png";
import adventuraIcon from "@assets/img/games/adventura-icon.png";
import aetheriaBg from "@assets/img/games/aetheria-bg.png";
import aetheriaIcon from "@assets/img/games/aetheria-icon.png";
import altherionBg from "@assets/img/games/altherion-bg.png";
import altherionIcon from "@assets/img/games/altherion-icon.png";
import aqworldsBg from "@assets/img/games/aqworlds-bg.png";
import aqworldsIcon from "@assets/img/games/aqworlds-icon.jpeg";
import augoeidesBg from "@assets/img/games/augoeides-bg.png";
import augoeidesIcon from "@assets/img/games/augoeides-icon.png";
import everrealmBg from "@assets/img/games/everrealm-bg.png";
import everrealmIcon from "@assets/img/games/everrealm-icon.png";
import nullworldBg from "@assets/img/games/nullworld-bg.png";
import nullworldIcon from "@assets/img/games/nullworld-icon.png";
import redaqBg from "@assets/img/games/redaq-bg.jpeg";
import redaqIcon from "@assets/img/games/redaq-icon.png";
import redheroBg from "@assets/img/games/redhero-bg.png";
import redheroIcon from "@assets/img/games/redhero-icon.png";
import { parse as parseTLD } from "tldts";

export interface GameImage {
  icon: string;
  background: string;
}

export interface GameURL {
  home: string;
  game: string;
}

export interface Game {
  id: string;
  name: string;
  accent: string;
  image: GameImage;
  url: GameURL;
  desc: string;
  discordId?: string;
}

export const GAME_IMAGES = {
  localhost: {
    icon: aqworldsIcon,
    background: aqworldsBg,
  },
  aqworlds: {
    icon: aqworldsIcon,
    background: aqworldsBg,
  },
  aetheria: {
    icon: aetheriaIcon,
    background: aetheriaBg,
  },
  redhero: {
    icon: redheroIcon,
    background: redheroBg,
  },
  augoeides: {
    icon: augoeidesIcon,
    background: augoeidesBg,
  },
  redaq: {
    icon: redaqIcon,
    background: redaqBg,
  },
  everrealm: {
    icon: everrealmIcon,
    background: everrealmBg,
  },
  nullworld: {
    icon: nullworldIcon,
    background: nullworldBg,
  },
  adventura: {
    icon: adventuraIcon,
    background: adventuraBg,
  },
  altherion: {
    icon: altherionIcon,
    background: altherionBg,
  },
} as const;

export const GAMES: Game[] = [
  {
    name: "AQWorlds",
    accent: "#ffeb87",
    url: {
      home: "https://game.aq.com/",
      game: "https://game.aq.com/game/",
    },
    desc: "A free, massively multiplayer game that plays in your browser! Battle monsters and obtain legendary weapons.",
    discordId: "79860635443376128",
  },
  {
    name: "Aetheria",
    accent: "#ca8f72",
    url: {
      home: "https://aetheria.asia/",
      game: "https://aetheria.asia/game/browser",
    },
    desc: "Aetheria is a fantasy MMORPG where your journey begins as a Novice and evolves through a deep skill tree system.",
    discordId: "1372089438351528026",
  },
  {
    name: "RedHero",
    accent: "#dc6060",
    url: {
      home: "https://redhero.online/",
      game: "https://redhero.online/game/browser",
    },
    desc: `RedHero is a completely free-to-play online MMORPG that will surely know how to keep you busy!`,
    discordId: "806658757081301053",
  },
  {
    name: "Augoeides",
    accent: "#ffeb87",
    url: {
      home: "https://augo.pw/",
      game: "https://augo.pw/game",
    },
    desc: "An up to date AQWorlds Private Server, fully functioning, with all the AQWorlds features you love.",
    discordId: "573062682366836746",
  },
  {
    name: "RedAQ",
    accent: "#ffeb87",
    url: {
      home: "https://redaq.net/",
      game: "https://redaq.net/game/browser",
    },
    desc: "RedAQ invites you to step into a thrilling MMORPG online game experience with custom events.",
    discordId: "806658757081301053",
  },
  {
    name: "EverRealm",
    accent: "#D2FF00",
    url: {
      home: "https://everrealm.online/",
      game: "https://everrealm.online/game/browser",
    },
    desc: "EverRealm Online is an MMORPG designed to bring players together from around the globe.",
    discordId: "1368872908952440884",
  },
  {
    name: "NullWorld",
    accent: "#D2FF00",
    url: {
      home: "https://nullworld.net/",
      game: "https://nullworld.net/game/browser",
    },
    desc: "Free mmorpg online game, pass the level, evolve, make friends.",
    discordId: "991776332897853510",
  },
  {
    name: "Adventura",
    accent: "#D2FF00",
    url: {
      home: "https://adventura.quest/",
      game: "https://adventura.quest/game/browser",
    },
    desc: "Adventura invites you to step into a thrilling MMORPG online game experience.",
    discordId: "1319596360332349442",
  },
  {
    name: "Altherion",
    accent: "#D2FF00",
    url: {
      home: "https://altherion.cc/",
      game: "https://altherion.cc/game/browser",
    },
    desc: "Altherion is a fantasy MMORPG where your journey begins as a Novice and evolves through a deep skill tree system.",
    discordId: "1374848591083868384",
  },
].map((x) => {
  const url = new URL(x.url.game.replace(/\/$/, ""));
  const tld = parseTLD(url.hostname);

  return {
    id: `${tld.domain}-${url.pathname}`,
    image:
      GAME_IMAGES[
        x.name.toLowerCase().replace(/\s/g, "") as keyof typeof GAME_IMAGES
      ],
    ...x,
  };
});
