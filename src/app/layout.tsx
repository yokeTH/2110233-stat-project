import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: "A/B Testing App",
  description: "A/B Testing with Next.js and Middleware",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = headers();
  const variant = headersList.get("x-ab-variant");

  return (
    <html lang="en">
      <head>
        <meta name="ab-variant" content={variant || ""} />
      </head>
      <body>{children}</body>
    </html>
  );
}
