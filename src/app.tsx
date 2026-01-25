import { memo } from "react";
import { useRoutes } from "react-router";
import routes from "./routes";

const App: React.FC = memo(() => {
  const routeElement = useRoutes(routes);

  return <>{routeElement}</>;
});

App.displayName = "App";

export default App;
