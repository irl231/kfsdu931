import type { RouteObject } from "react-router";

import Layout from "./layout";
import { NotElectronPage } from "./pages/error/not-electron";
import { NotFoundPage } from "./pages/error/not-found";
import { LauncherPage } from "./pages/launcher";
import { SplashPage } from "./pages/splash";

const isElectron = "electron" in window;
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
        element: isElectron ? <LauncherPage /> : <NotElectronPage />,
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
];

export default routes;
