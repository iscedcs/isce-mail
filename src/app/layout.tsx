import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mail Form",
  description: "Input parameters for the chosen email template",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        {/* Every toast.* call in the app was a no-op until this was mounted —
            admin login, the admin header, products and templates all raise
            toasts that never rendered. */}
        <Toaster richColors closeButton position="top-right" />
      </body>
    </html>
  );
}
