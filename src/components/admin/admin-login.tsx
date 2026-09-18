"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  Lock,
  User,
  Eye,
  EyeOff,
  Loader2,
  ArrowLeft,
  Mail,
  CheckCircle2,
  KeyRound,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import {
  loginAdminAction,
  requestPasswordResetAction,
  verifyTwoFactorAction,
  resendTwoFactorAction,
} from "@/actions/admin-auth";

interface AdminLoginProps {
  onLoginSuccess: (user: { username: string; role: string; email?: string }) => void;
}

export function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const [mode, setMode] = useState<"login" | "forgot" | "2fa">("login");

  // Login form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // 2FA state
  const [tempToken, setTempToken] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Forgot password form state
  const [resetQuery, setResetQuery] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState("");
  const [resetErrorMsg, setResetErrorMsg] = useState("");

  // Cooldown countdown timer for 2FA resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg("Please enter both username and password.");
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg("");

      const res = await loginAdminAction({
        username: username.trim(),
        password: password.trim(),
      });

      if (!res.success) {
        throw new Error(res.error || "Invalid username or password.");
      }

      // Step 2: If 2FA is required, transition to 2FA verification mode
      if (res.requires2FA) {
        setTempToken(res.tempToken || "");
        setMaskedEmail(res.maskedEmail || "your administrator email");
        setTwoFactorCode("");
        setTwoFactorError("");
        setMode("2fa");
        setResendCooldown(60);
        toast.info("A 6-digit verification code has been dispatched to your email.");
        return;
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to authenticate.");
      toast.error(err.message || "Authentication failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const triggerVerifyCode = async (codeToVerify: string) => {
    if (codeToVerify.length !== 6 || twoFactorLoading) return;
    try {
      setTwoFactorLoading(true);
      setTwoFactorError("");

      const res = await verifyTwoFactorAction({
        tempToken,
        code: codeToVerify,
      });

      if (!res.success || !res.user) {
        throw new Error(res.error || "Invalid verification code.");
      }

      toast.success(`Identity verified! Welcome back, ${res.user.username}!`);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setTwoFactorError(err.message || "Failed to verify code.");
      toast.error(err.message || "Verification failed.");
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleVerifyTwoFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    await triggerVerifyCode(twoFactorCode);
  };

  const handleResendTwoFactor = async () => {
    if (resendCooldown > 0 || resendLoading) return;
    try {
      setResendLoading(true);
      setTwoFactorError("");

      const res = await resendTwoFactorAction({ tempToken });
      if (!res.success) {
        throw new Error(res.error || "Failed to resend code.");
      }

      if (res.tempToken) {
        setTempToken(res.tempToken);
      }
      setResendCooldown(60);
      toast.success(res.message || "Verification code resent!");
    } catch (err: any) {
      setTwoFactorError(err.message || "Could not resend code.");
      toast.error(err.message || "Resend failed.");
    } finally {
      setResendLoading(false);
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

      const res = await requestPasswordResetAction(resetQuery.trim());

      if (!res.success) {
        throw new Error(res.error || "Failed to dispatch reset email.");
      }

      setResetSuccessMsg(
        res.message || "Password reset instructions have been sent to your email.",
      );
      toast.success("Reset link dispatched!");
    } catch (err: any) {
      setResetErrorMsg(err.message || "Could not process password reset.");
      toast.error(err.message || "Password reset error.");
    } finally {
      setResetLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // 2FA Verification View
  // -------------------------------------------------------------------------
  if (mode === "2fa") {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-slate-200/80 bg-white">
          <CardHeader className="text-center space-y-2 pb-6">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <KeyRound className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
              Two-Factor Authentication
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              We sent a 6-digit verification code to{" "}
              <strong className="text-slate-800">{maskedEmail}</strong>. Enter it below to complete sign-in.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleVerifyTwoFactor}>
            <CardContent className="space-y-4">
              {twoFactorError && (
                <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <span className="font-semibold">Error:</span> {twoFactorError}
                </div>
              )}

              <div className="space-y-2">
                <Label
                  htmlFor="two-factor-code"
                  className="text-xs font-semibold text-slate-700 block text-center"
                >
                  Enter 6-Digit Code
                </Label>
                <div className="relative flex justify-center">
                  <Input
                    id="two-factor-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="••••••"
                    value={twoFactorCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setTwoFactorCode(val);
                      if (val.length === 6) {
                        triggerVerifyCode(val);
                      }
                    }}
                    className="h-14 text-center text-2xl font-extrabold tracking-[10px] sm:tracking-[14px] font-mono border-2 border-slate-300 focus:border-indigo-600 focus:ring-indigo-500 max-w-[280px] rounded-xl shadow-xs"
                    autoFocus
                    required
                  />
                </div>
                <p className="text-[11px] text-center text-slate-400">
                  Security code expires in 10 minutes.
                </p>
              </div>
            </CardContent>

            <CardFooter className="pt-2 pb-6 flex flex-col gap-3">
              <Button
                type="submit"
                disabled={twoFactorLoading || twoFactorCode.length !== 6}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs h-10 rounded-xl"
              >
                {twoFactorLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying Identity...
                  </>
                ) : (
                  "Verify & Complete Sign In"
                )}
              </Button>

              <div className="flex items-center justify-between w-full pt-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setTwoFactorCode("");
                    setTwoFactorError("");
                  }}
                  className="text-slate-500 hover:text-slate-900 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to Login
                </button>

                <button
                  type="button"
                  onClick={handleResendTwoFactor}
                  disabled={resendCooldown > 0 || resendLoading}
                  className="text-indigo-600 hover:text-indigo-800 font-semibold disabled:text-slate-400 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RotateCcw
                    className={`h-3 w-3 ${resendLoading ? "animate-spin" : ""}`}
                  />
                  {resendCooldown > 0
                    ? `Resend code in ${resendCooldown}s`
                    : "Resend Code"}
                </button>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Forgot Password View
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // Main Login View
  // -------------------------------------------------------------------------
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
            Enter your credentials. A secure 2FA verification code will be sent to your administrator email.
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
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs h-10 rounded-xl"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying Credentials...
                </>
              ) : (
                "Continue with Two-Factor Auth"
              )}
            </Button>
            <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400">
              <Shield className="w-3 h-3 text-emerald-600" />
              <span>Two-Factor Authentication Protected</span>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
