import { createBrowserRouter } from "react-router";
import { POS } from "./components/POS";
import { SalesHistory } from "./components/SalesHistory";
import { Dashboard } from "./components/Dashboard";
import { Reports } from "./components/Reports";
import { Settings } from "./components/Settings";
import { Layout } from "./components/Layout";
import { Inventory } from "./components/Inventorys";
import Pricing from "./components/Pricing";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: POS },
      { path: "sales", Component: SalesHistory },
      { path: "dashboard", Component: Dashboard },
      { path: "reports", Component: Reports },
      { path: "settings", Component: Settings },
      { path: "inventory", Component: Inventory },
      {
    path: "/pricing",
    element: <Pricing />,
},
    ],
  },
]);
