import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FinTrack API",
  description: "REST API for FinTrack by Finnet Technologies",
};

// The backend serves JSON only; this layout exists because the App Router requires one.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
