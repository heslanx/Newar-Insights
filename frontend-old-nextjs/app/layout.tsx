import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { MainNav } from "@/components/main-nav";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/toaster";
import { Mic } from "lucide-react";

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
        <div className="flex min-h-screen flex-col">
          {/* Header */}
          <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center justify-between">
              <div className="flex items-center gap-6">
                <Link href="/" className="flex items-center gap-2">
                  <Mic className="h-6 w-6" />
                  <span className="text-lg font-bold">Newar Insights</span>
                </Link>
                <Separator orientation="vertical" className="h-6" />
                <MainNav />
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1">
            <div className="container py-6">
              {children}
            </div>
          </main>

          {/* Footer */}
          <footer className="border-t py-6">
            <div className="container text-center text-sm text-muted-foreground">
              Newar Insights © 2025 - Sistema de Gravação de Reuniões
            </div>
          </footer>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
