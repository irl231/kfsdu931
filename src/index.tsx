import "./styles/fonts.css";
import "./styles/global.css";

import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router";
import App from "./app";
import { Noise } from "./components/overlay/noise";

const containerId = "root";
let container = document.getElementById(containerId);
if (!container) {
  container = document.createElement("div");
  container.id = containerId;
  document.body.appendChild(container);
}

const root = createRoot(container);
root.render(
  <HashRouter>
    <Noise />
    <App />
  </HashRouter>,
);
