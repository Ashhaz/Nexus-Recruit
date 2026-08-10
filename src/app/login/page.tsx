"use client";

import React, { useState, useEffect } from "react";
import { useSignIn, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import CustomCursor from "@/components/ui/CustomCursor";

export default function LoginPage() {
  const { signIn, fetchStatus } = useSignIn();
  const { isSignedIn, isLoaded: isAuthLoaded } = useAuth();
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isLoaded = fetchStatus === "idle" && !!signIn;

  useEffect(() => {
    if (isAuthLoaded && isSignedIn) {
      router.push("/");
    }
  }, [isAuthLoaded, isSignedIn, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLoaded || !signIn) return;

    setLoading(true);
    setError("");

    try {
      // Step 1 — provide the identifier to initialize the sign-in
      const { error: createError } = await signIn.create({
        identifier: identifier.trim(),
      });

      if (createError) {
        setError(createError.longMessage || createError.message || "Unknown error during sign-in initialization.");
        return;
      }

      // Step 2 — submit the password
      const { error: passwordError } = await signIn.password({
        password,
      });

      if (passwordError) {
        setError(passwordError.longMessage || passwordError.message || "Incorrect password.");
        return;
      }

      // Step 3 — finalize the session once status is complete
      if (signIn.status === "complete") {
        const { error: finalizeError } = await signIn.finalize();
        if (finalizeError) {
          setError(finalizeError.longMessage || finalizeError.message || "Failed to create session.");
          return;
        }
        router.push("/");
      } else {
        setError(
          `Sign-in requires an additional step (status: ${signIn.status}). Check your Clerk instance configuration.`
        );
      }
    } catch (err: any) {
      console.error("Login error:", err);
      if (err?.errors?.length > 0) {
        setError(
          err.errors[0].longMessage ||
            err.errors[0].message ||
            "Invalid credentials."
        );
      } else {
        setError("Invalid email/ID or password.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <CustomCursor />
      <main className="min-h-screen bg-background text-on-background flex items-center justify-center px-6">
      <div className="w-full max-w-[448px]">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-outline bg-surface shadow-lg">
            <span className="material-symbols-outlined text-3xl text-primary">
              terminal
            </span>
          </div>

          <h1 className="text-3xl font-bold tracking-wide text-[#FFFFFF] font-headline-lg">
            NEXUS
          </h1>

          <p className="mt-1 text-xs uppercase tracking-[0.3em] text-[#A8A8A8]">
            NEXT-GEN CODERS UNITED SOCIETY
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-outline-variant bg-surface p-8 shadow-2xl">
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-[#FFFFFF]">
              Sign in
            </h2>

            <p className="mt-2 text-sm text-[#A8A8A8]">
              Enter your NEXUS credentials to continue.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-red-400">
                  error
                </span>

                <p className="text-sm leading-5 text-red-300">
                  {error}
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Identifier */}
            <div>
              <label
                htmlFor="identifier"
                className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#A8A8A8]"
              >
                Email / Interviewer ID
              </label>

              <div className="relative">
                <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#707070]">
                  person
                </span>

                <input
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="admin@nexus.com"
                  autoComplete="username"
                  required
                  className="w-full rounded-xl border border-outline bg-surface-variant py-3.5 pl-12 pr-4 text-sm text-[#FFFFFF] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-[#707070]"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#A8A8A8]"
              >
                Password
              </label>

              <div className="relative">
                <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#707070]">
                  lock
                </span>

                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  className="w-full rounded-xl border border-outline bg-surface-variant py-3.5 pl-12 pr-4 text-sm text-[#FFFFFF] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-[#707070]"
                />
              </div>
            </div>

            {/* Login */}
            <button
              type="submit"
              disabled={!isLoaded || loading}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-primary py-3.5 text-sm font-bold tracking-wide text-on-primary transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-on-primary/30 border-t-on-primary" />
                  AUTHENTICATING...
                </>
              ) : (
                <>
                  LOGIN
                  <span className="material-symbols-outlined text-lg">
                    arrow_forward
                  </span>
                </>
              )}
            </button>
          </form>

          <div className="mt-7 border-t border-outline-variant pt-5 text-center">
            <p className="text-xs text-[#707070]">
              Authorized NEXUS personnel only
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-[#707070]">
          NEXUS Recruitment Engine
        </p>
      </div>
    </main>
    </>
  );
}