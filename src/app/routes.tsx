import { createBrowserRouter, Navigate } from "react-router-dom";

import Landing from "./components/Landing";
import { Auth } from "./components/Auth";
import { Layout } from "./components/Layout";

import { POS } from "./components/POS";
import { SalesHistory } from "./components/SalesHistory";
import { Dashboard } from "./components/Dashboard";
import { Reports } from "./components/Reports";
import { Settings } from "./components/Settings";
import { Inventory } from "./components/Inventorys";
import Pricing from "./components/Pricing";

const token = localStorage.getItem("token");

export const router = createBrowserRouter([
  // Landing Page
  {
    path: "/",
    element: <Landing />,
  },

  // Login / Register
  {
  path: "/login",
  element: (
    <Auth
      onLogin={(token) => {
        localStorage.setItem("token", token);
        window.location.href = "/";
      }}
    />
  ),
},

  // Protected App
  {
    path: "/app",
    element: token ? <Layout /> : <Navigate to="/auth" replace />,
    children: [
      { index: true, element: <POS /> },
      { path: "dashboard", element: <Dashboard /> },
      { path: "sales", element: <SalesHistory /> },
      { path: "inventory", element: <Inventory /> },
      { path: "reports", element: <Reports /> },
      { path: "settings", element: <Settings /> },
      { path: "pricing", element: <Pricing /> },
    ],
  },
]);