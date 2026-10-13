import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ecosystem Scientist",
  description: "A pixel-art ecosystem game with a research lab and three restoration missions.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="bg-[#0d1b2a] antialiased">{children}</body>
    </html>
  );
}
