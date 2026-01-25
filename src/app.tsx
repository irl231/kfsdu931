import { useRoutes } from "react-router";
import routes from "./routes";

const App: React.FC = () => {
  const routeElement = useRoutes(routes);

  return <div>{routeElement}</div>;
};

export default App;
