
import { createBrowserRouter } from "react-router-dom";
import { POS } from "./components/POS";
import { SalesHistory } from "./components/SalesHistory";
import { Dashboard } from "./components/Dashboard";
import { Reports } from "./components/Reports";
import { Settings } from "./components/Settings";
import { Layout } from "./components/Layout";
import { Inventory } from "./components/Inventorys";
import Terms from "./components/Terms";
import PrivacyPolicy from "./components/PrivacyPolicy";
import PaymentSuccess from "./components/PaymentSuccess";

export const router = createBrowserRouter([
  {
    path: "/payment-success",
    Component: PaymentSuccess,
  },
  {
  path: "/terms",
  Component: Terms,
},
{
  path: "/privacy",
  Component: PrivacyPolicy,
},
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
      
    ],
  },
]);
