"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Loader2, Mail, Lock, Eye, EyeOff, Sparkles, KeyRound, Users, ShieldCheck, ArrowRight } from "lucide-react";
import { useAuth, getAuthErrorMessage } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const { signInEmail, signUpEmail, signInGoogle } = useAuth();

  const [role, setRole] = useState<"organizer" | "audience">("organizer");
  const [audienceCode, setAudienceCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAudienceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = audienceCode.trim().toUpperCase();
    if (clean.length !== 6) {
      setCodeError("Please enter a valid 6-character access code.");
      return;
    }
    setCodeError(null);
    router.push(`/audience?code=${clean}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "login") {
        await signInEmail(email, password);
      } else {
        await signUpEmail(email, password);
      }
      // Navigation is handled by AppShell after auth state updates
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInGoogle();
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070B14] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute inset-0 pointer-events-none select-none">
        <div className="absolute top-[-10%] left-[40%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-5%] right-[30%] w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-[100px]" />
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md">
        {/* Brand header */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-900 shadow-xl shadow-blue-900/20 mb-4">
            <Image
              src="/brand/stagex-logo.png"
              alt="StageX AI"
              fill
              className="object-contain p-1"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Stage<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-amber-400">X</span> AI
          </h1>
          <p className="text-xs text-slate-400 mt-1 tracking-widest uppercase font-medium">
            Plan. Perform. Adapt.
          </p>
        </div>

        {/* Primary Role Switcher: Organizer vs Audience */}
        <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 mb-4 shadow-xl">
          <button
            type="button"
            onClick={() => { setRole("organizer"); setError(null); }}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all duration-200 ${
              role === "organizer"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-900/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-blue-300" />
            Organizer Login
          </button>
          <button
            type="button"
            onClick={() => { setRole("audience"); setCodeError(null); }}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all duration-200 ${
              role === "audience"
                ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-amber-900/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <Users className="w-4 h-4 text-amber-300" />
            Audience Code Portal
          </button>
        </div>

        {/* Glass card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 rounded-2xl shadow-2xl shadow-black/40 p-8">
          {role === "audience" ? (
            /* Audience Portal: 6-Character Code Entry */
            <div>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-3 text-amber-400">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-white">Attendee & Audience Access</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Enter your 6-character alphanumeric event code to watch videos, download PPTs, and view event scripts.
                </p>
              </div>

              {codeError && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs leading-relaxed">
                  {codeError}
                </div>
              )}

              <form onSubmit={handleAudienceSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 text-center">
                    6-Character Event Code
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={6}
                      value={audienceCode}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                        setAudienceCode(val);
                        if (codeError) setCodeError(null);
                      }}
                      placeholder="e.g. ST8X9B"
                      autoFocus
                      className="w-full text-center font-mono text-2xl tracking-[0.35em] font-bold py-3.5 bg-slate-950/70 border-2 border-amber-500/40 rounded-xl text-amber-300 placeholder:text-slate-600 focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/20 transition-all uppercase selection:bg-amber-500 selection:text-black"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 text-center mt-2">
                    Case-insensitive · Ask your event host for the 6-character code
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={audienceCode.trim().length !== 6}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-lg shadow-amber-900/30 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Enter Event Portal
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="mt-6 pt-4 border-t border-slate-800 text-center">
                <button
                  type="button"
                  onClick={() => setRole("organizer")}
                  className="text-xs text-slate-400 hover:text-blue-400 transition"
                >
                  Are you an organizer? <span className="font-semibold text-blue-400 underline">Sign in here</span>
                </button>
              </div>
            </div>
          ) : (
            /* Organizer Portal: Firebase Auth */
            <>
              {/* Tab switcher */}
              <div className="flex rounded-xl bg-slate-800/60 p-1 mb-6">
                {(["login", "register"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => { setMode(tab); setError(null); }}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                      mode === tab
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {tab === "login" ? "Organizer Sign In" : "Register Organizer"}
                  </button>
                ))}
              </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs leading-relaxed">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-800/60 border border-slate-700/60 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder={mode === "register" ? "Min 6 characters" : "Enter password"}
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-800/60 border border-slate-700/60 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-900/30 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {loading
                ? mode === "login" ? "Signing in…" : "Creating account…"
                : mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-slate-700/60" />
            <span className="text-xs text-slate-500">or continue with</span>
            <div className="flex-1 h-px bg-slate-700/60" />
          </div>

          {/* Google Sign-In */}
          <button
            onClick={handleGoogle}
            disabled={loading || googleLoading}
            className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl text-sm font-semibold bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 hover:border-slate-600 text-slate-200 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            {googleLoading ? "Connecting to Google…" : "Continue with Google"}
          </button>
        </>
      )}
    </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-500 mt-6">
          Powered by{" "}
          <span className="text-slate-400 font-medium">NeuroX</span> · StageX AI
        </p>
      </div>
    </div>
  );
}
