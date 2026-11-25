import { createBrowserRouter, Navigate } from "react-router";
import { AppLayout } from "./components/AppLayout";
import { GuestRoute, ProtectedRoute } from "./auth/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
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
          { path: "portfolios", element: <h1>Portfolios</h1> },
          { path: "portfolios/:id", element: <h1>Portfolio</h1> },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
