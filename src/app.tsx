import { memo } from "react";
import { useRoutes } from "react-router";
import { Noise } from "./components/overlay/noise";
import routes from "./routes";

const App: React.FC = memo(() => {
  const routeElement = useRoutes(routes);

  return (
    <div>
      <Noise />
      {routeElement}
    </div>
  );
});

App.displayName = "App";

export default App;
