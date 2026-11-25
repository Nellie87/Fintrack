import { createBrowserRouter, Navigate } from "react-router";
import { AppLayout } from "./components/AppLayout";
import { GuestRoute, ProtectedRoute } from "./auth/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PortfoliosPage } from "./pages/PortfoliosPage";
import { RegisterPage } from "./pages/RegisterPage";

// The <h1> placeholders are replaced as each page lands in its own commit.
export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/portfolios" replace /> },
      {
        // Only for visitors who are not logged in.
        element: <GuestRoute />,
        children: [
          { path: "login", element: <LoginPage /> },
          { path: "register", element: <RegisterPage /> },
        ],
      },
      {
        // Only for logged-in analysts.
        element: <ProtectedRoute />,
        children: [
          { path: "portfolios", element: <PortfoliosPage /> },
          {
            // Loaded on demand: it pulls in the charting library, which the login and list pages don't need.
            path: "portfolios/:id",
            lazy: async () => ({ Component: (await import("./pages/PortfolioDetailPage")).PortfolioDetailPage }),
          },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
