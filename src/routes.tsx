import type { RouteObject } from "react-router";

import Layout from "./layout";
import { NotElectronPage } from "./pages/error/not-electron";
import { NotFoundPage } from "./pages/error/not-found";
import { LauncherPage } from "./pages/launcher";
import { SplashPage } from "./pages/splash";

// Cache electron check to avoid re-evaluation on every render
const IS_ELECTRON = "electron" in window;
const routes: RouteObject[] = [
  {
    path: "/splash",
    element: <SplashPage />,
  },
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: IS_ELECTRON ? <LauncherPage /> : <NotElectronPage />,
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
];

export default routes;
