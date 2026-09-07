import Link from "next/link";
import { ChevronLeft, BarChart3, Mail } from "lucide-react";

export default function MailFormLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50/50">
      <header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Templates
            </Link>
            <span className="text-gray-300">|</span>
            <span className="font-semibold text-sm text-gray-900 flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-indigo-600" />
              ISCE-mail
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/history"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
              Campaigns & Insights
            </Link>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
