"use client";

import React, { useState } from "react";
import { Shield, Lock, User, Eye, EyeOff, Loader2, ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { loginAdminAction, requestPasswordResetAction } from "@/actions/admin-auth";

interface AdminLoginProps {
  onLoginSuccess: (user: { username: string; role: string; email?: string }) => void;
}

export function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const [mode, setMode] = useState<"login" | "forgot">("login");

  // Login form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Forgot password form state
  const [resetQuery, setResetQuery] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState("");
  const [resetErrorMsg, setResetErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg("Please enter both username and password.");
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg("");

      // Direct Server Action call (No /api/ route)
      const res = await loginAdminAction({
        username: username.trim(),
        password: password.trim(),
      });

      if (!res.success || !res.user) {
        throw new Error(res.error || "Invalid username or password.");
      }

      toast.success(`Welcome back, ${res.user.username}!`);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to authenticate.");
      toast.error(err.message || "Authentication failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetQuery.trim()) {
      setResetErrorMsg("Please enter your administrator username or email.");
      return;
    }

    try {
      setResetLoading(true);
      setResetErrorMsg("");
      setResetSuccessMsg("");

      // Direct Server Action call (dispatches email using ISCE_RESEND_API_KEY)
      const res = await requestPasswordResetAction(resetQuery.trim());

      if (!res.success) {
        throw new Error(res.error || "Failed to dispatch reset email.");
      }

      setResetSuccessMsg(res.message || "Password reset instructions have been sent to your email.");
      toast.success("Reset link dispatched!");
    } catch (err: any) {
      setResetErrorMsg(err.message || "Could not process password reset.");
      toast.error(err.message || "Password reset error.");
    } finally {
      setResetLoading(false);
    }
  };

  if (mode === "forgot") {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-slate-200/80 bg-white">
          <CardHeader className="text-center space-y-2 pb-6">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md">
              <Mail className="h-6 w-6 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
              Reset Admin Password
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 max-w-xs mx-auto">
              Enter your username or email. We will send a secure password reset link to your administrator address.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleResetRequest}>
            <CardContent className="space-y-4">
              {resetErrorMsg && (
                <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">
                  <span className="font-semibold">Error:</span> {resetErrorMsg}
                </div>
              )}

              {resetSuccessMsg ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto" />
                  <p className="text-xs font-semibold text-emerald-900">Check Your Email</p>
                  <p className="text-xs text-emerald-700 leading-relaxed">{resetSuccessMsg}</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="reset-query" className="text-xs font-semibold text-slate-700">
                    Administrator Username or Email
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      id="reset-query"
                      type="text"
                      placeholder="admin or admin@isce.app"
                      value={resetQuery}
                      onChange={(e) => setResetQuery(e.target.value)}
                      className="pl-9 text-sm"
                      autoFocus
                      required
                    />
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="pt-2 pb-6 flex flex-col gap-3">
              {!resetSuccessMsg && (
                <Button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs"
                >
                  {resetLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending Reset Link...
                    </>
                  ) : (
                    "Send Password Reset Link"
                  )}
                </Button>
              )}

              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setResetErrorMsg("");
                  setResetSuccessMsg("");
                }}
                className="text-xs text-slate-500 hover:text-slate-900 flex items-center justify-center gap-1 font-medium transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
              </button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-slate-200/80 bg-white">
        <CardHeader className="text-center space-y-2 pb-6">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
            Admin Console Login
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 max-w-xs mx-auto">
            Enter your credentials to manage brands, API keys, email templates, and layouts.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {errorMsg && (
              <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <span className="font-semibold">Error:</span> {errorMsg}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="admin-username" className="text-xs font-semibold text-slate-700">
                Username or Email
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  id="admin-username"
                  type="text"
                  placeholder="admin or admin@isce.app"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-9 text-sm"
                  autoFocus
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="admin-password" className="text-xs font-semibold text-slate-700">
                  Password
                </Label>
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-10 text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="pt-2 pb-6 flex flex-col gap-3">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing In...
                </>
              ) : (
                "Sign In to Admin Dashboard"
              )}
            </Button>
            <p className="text-[11px] text-center text-slate-400">
              Session is encrypted and protected with HTTP-only cookies.
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
