import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Newar Insights - Admin Panel",
  description: "Sistema de gerenciamento de gravações de reuniões",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
