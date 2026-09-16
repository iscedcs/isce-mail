"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  FileCode2,
  ArrowLeft,
  RefreshCw,
  LogOut,
  Shield,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

import { logoutAdminAction } from "@/actions/admin-auth";

interface AdminHeaderProps {
  currentUser?: { username: string; role?: string } | null;
  onLogout?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function AdminHeader({
  currentUser,
  onLogout,
  onRefresh,
  isRefreshing = false,
}: AdminHeaderProps) {
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await logoutAdminAction();
      toast.info("Logged out of admin session");
      if (onLogout) onLogout();
    } catch {
      toast.error("Error logging out");
    }
  };

  const navItems = [
    {
      label: "Campaigns & Insights",
      href: "/history",
      icon: BarChart3,
      active: pathname === "/history",
    },
    {
      label: "Products & Brands",
      href: "/admin/products",
      icon: Building2,
      active: pathname.startsWith("/admin/products"),
    },
    {
      label: "Email Templates",
      href: "/admin/templates",
      icon: FileCode2,
      active: pathname.startsWith("/admin/templates"),
    },
  ];

  return (
    <header className="border-b bg-white shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Left: Brand & Back */}
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground text-xs flex items-center gap-1 font-medium transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Campaigns
            </Link>

            <div className="h-4 w-px bg-slate-200" />

            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                IS
              </div>
              <div>
                <span className="font-bold text-slate-900 text-sm tracking-tight">ISCE Mail</span>
                <Badge variant="outline" className="ml-2 text-[10px] font-mono py-0 text-slate-600">
                  Admin
                </Badge>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1 ml-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      item.active
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: User Status & Actions */}
          <div className="flex items-center gap-3">
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="h-8 px-2.5 text-xs text-slate-600"
                title="Refresh data"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            )}

            {currentUser && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-semibold text-slate-800 flex items-center justify-end gap-1">
                    <Shield className="h-3 w-3 text-emerald-600" />
                    {currentUser.username}
                  </span>
                  <span className="text-[10px] text-slate-400 capitalize">
                    {currentUser.role || "Admin"}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="h-8 px-2.5 text-xs text-slate-600 hover:text-red-600 hover:border-red-200 gap-1"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Log Out</span>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="flex md:hidden items-center gap-2 py-2 border-t border-slate-100">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium ${
                  item.active
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
