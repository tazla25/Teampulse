import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TeamPulse — AI-Powered Self-Tracking & Team Insights",
  description: "AI-powered productivity companion. Track your own focus, manage Pomodoro sessions, and understand team health without surveillance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
