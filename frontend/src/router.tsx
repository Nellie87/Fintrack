import { createBrowserRouter, Navigate } from "react-router";
import { AppLayout } from "./components/AppLayout";
import { GuestRoute, ProtectedRoute } from "./auth/ProtectedRoute";
import { NotFoundPage } from "./pages/NotFoundPage";

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
          { path: "login", element: <h1>Log in</h1> },
          { path: "register", element: <h1>Create account</h1> },
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
