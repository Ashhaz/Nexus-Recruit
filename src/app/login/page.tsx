"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSignIn, useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import CustomCursor from "@/components/ui/CustomCursor";

function LoginContent() {
  const { signIn, fetchStatus } = useSignIn();
  const { isSignedIn, isLoaded: isAuthLoaded, signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<"role_selection" | "credentials" | "mfa">("role_selection");
  const [selectedRole, setSelectedRole] = useState<"admin" | "interviewer" | null>(null);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isLoaded = fetchStatus === "idle" && !!signIn;

  // Initialize role from URL query param if present (?portal=admin or ?portal=interviewer)
  useEffect(() => {
    const portal = searchParams.get("portal")?.toLowerCase();
    const mismatch = searchParams.get("mismatch");

    if (portal === "admin") {
      setSelectedRole("admin");
      setStep("credentials");
      if (mismatch === "1") {
        setError("Access Denied: Your account does not have administrator permissions. Please use an authorized admin account.");
      }
    } else if (portal === "interviewer") {
      setSelectedRole("interviewer");
      setStep("credentials");
      if (mismatch === "1") {
        setError("Access Denied: Your account does not have interviewer permissions. Please use an authorized interviewer account.");
      }
    }
  }, [searchParams]);

  // Handle existing active session safely without automatic redirects
  useEffect(() => {
    if (isAuthLoaded && isSignedIn && selectedRole) {
      const verifyActiveSession = async () => {
        try {
          const res = await fetch(`/api/auth/me?t=${Date.now()}`);
          const json = await res.json();
          if (json.success && json.user) {
            const currentRole = json.user.role;
            if (currentRole === selectedRole) {
              window.location.href = currentRole === "admin" ? "/admin/dashboard" : "/interviewer/dashboard";
            } else {
              // Active session is for the other role - clear it so user can log in to the desired portal
              await signOut({ redirectUrl: `/login?portal=${selectedRole}&mismatch=1` });
            }
          }
        } catch {
          // ignore error on background session check
        }
      };
      verifyActiveSession();
    }
  }, [isAuthLoaded, isSignedIn, selectedRole, signOut]);

  const handleRoleSelect = async (role: "admin" | "interviewer") => {
    setSelectedRole(role);
    setStep("credentials");
    setError("");

    // If already signed in with a mismatched role, clear the session immediately
    if (isAuthLoaded && isSignedIn) {
      try {
        const res = await fetch(`/api/auth/me?t=${Date.now()}`);
        const json = await res.json();
        if (json.success && json.user) {
          if (json.user.role !== role) {
            await signOut({ redirectUrl: `/login?portal=${role}&mismatch=1` });
          } else {
            window.location.href = role === "admin" ? "/admin/dashboard" : "/interviewer/dashboard";
          }
        }
      } catch {
        // ignore
      }
    }
  };

  const handleBackToRoles = () => {
    setStep("role_selection");
    setSelectedRole(null);
    setError("");
    setPassword("");
  };

  const handleBackToCredentials = () => {
    setStep("credentials");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLoaded || !signIn) return;

    setLoading(true);
    setError("");

    try {
      // Step 1 — initialize sign-in with identifier
      const { error: createError } = await signIn.create({
        identifier: identifier.trim(),
      });

      if (createError) {
        setError(createError.longMessage || createError.message || "Unknown error during sign-in initialization.");
        setLoading(false);
        return;
      }

      // Step 2 — submit the password
      const { error: passwordError } = await signIn.password({
        password,
      });

      if (passwordError) {
        setError(passwordError.longMessage || passwordError.message || "Incorrect password.");
        setLoading(false);
        return;
      }

      // Handle Device Trust / Client Trust state
      if (signIn.status === "needs_client_trust" || (signIn.status as string) === "needs_second_factor") {
        const factor = (signIn as any).supportedSecondFactors?.find((f: any) => f.strategy === "email_code");
        if (factor) {
          await (signIn as any).mfa.sendEmailCode();
          setStep("mfa");
        } else {
          setError("Device verification is required, but email verification options are not configured.");
        }
        setLoading(false);
        return;
      }

      // Step 3 — Server-side role validation BEFORE session finalization
      if (signIn.status === "complete") {
        const validateRes = await fetch("/api/auth/validate-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: signIn.createdSessionId,
            identifier: identifier.trim(),
            portal: selectedRole,
          }),
        });

        const validateData = await validateRes.json();

        if (!validateData.success) {
          // Role mismatch! Reset unfinalized client sign-in state
          try {
            await signIn.reset();
          } catch (resetErr) {
            console.warn("Sign-in reset warning:", resetErr);
          }

          setError(validateData.error || "Access Denied.");
          setPassword("");
          setLoading(false);
          return;
        }

        // Role verified! Finalize session now and navigate explicitly
        await signIn.finalize({
          navigate: async () => {
            window.location.href = validateData.destination;
          },
        });

        window.location.href = validateData.destination;
        return;
      } else {
        setError(`Sign-in requires an additional step (status: ${signIn.status}).`);
        setLoading(false);
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
        setError("Invalid email or password.");
      }
      setLoading(false);
    }
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLoaded || !signIn) return;

    setLoading(true);
    setError("");

    try {
      const { error: verifyError } = await (signIn as any).mfa.verifyEmailCode({
        code: mfaCode.trim(),
      });

      if (verifyError) {
        setError(verifyError.longMessage || verifyError.message || "Invalid verification code.");
        setLoading(false);
        return;
      }

      if (signIn.status === "complete") {
        const validateRes = await fetch("/api/auth/validate-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: signIn.createdSessionId,
            identifier: identifier.trim(),
            portal: selectedRole,
          }),
        });

        const validateData = await validateRes.json();

        if (!validateData.success) {
          try {
            await signIn.reset();
          } catch (resetErr) {
            console.warn("Sign-in reset warning:", resetErr);
          }

          setError(validateData.error || "Access Denied.");
          setPassword("");
          setMfaCode("");
          setStep("credentials");
          setLoading(false);
          return;
        }

        await signIn.finalize({
          navigate: async () => {
            window.location.href = validateData.destination;
          },
        });

        window.location.href = validateData.destination;
        return;
      } else {
        setError(`Verification succeeded but sign-in is not complete (status: ${signIn.status}).`);
        setLoading(false);
      }
    } catch (err: any) {
      console.error("MFA verification error:", err);
      if (err?.errors?.length > 0) {
        setError(err.errors[0].longMessage || err.errors[0].message || "Invalid verification code.");
      } else {
        setError("Invalid verification code.");
      }
      setLoading(false);
    }
  };

  return (
    <>
      <CustomCursor />
      <main className="min-h-screen bg-[#050505] text-[#F5F5F5] flex items-center justify-center px-6 selection:bg-[#00FF66]/30 selection:text-[#00FF66]">
        <div className="w-full max-w-[448px]">
          {/* Logo / Brand */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#1D2A22] bg-[#101412] shadow-lg">
              <span className="material-symbols-outlined text-3xl text-[#00FF66]">
                terminal
              </span>
            </div>

            <h1 className="text-3xl font-black tracking-wide text-[#FFFFFF] font-headline-lg drop-shadow-[0_0_8px_rgba(0,255,102,0.3)]">
              NEXUS
            </h1>

            <p className="mt-1 text-xs uppercase tracking-[0.3em] text-[#8A938D] font-bold">
              NEXT-GEN CODERS UNITED SOCIETY
            </p>
          </div>

          {/* Card Frame */}
          <div className="rounded-2xl border border-[#1D2A22] bg-[#101412] p-8 shadow-2xl relative overflow-hidden">
            {/* Ambient subtle glow header */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00FF66]/40 to-transparent" />

            {/* Error Message */}
            {error && (
              <div className="mb-6 rounded-xl border border-[#FF4D4D]/30 bg-[#FF4D4D]/10 p-4">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#FF4D4D]">
                    error
                  </span>
                  <p className="text-xs leading-5 font-bold uppercase tracking-wider text-[#FF4D4D]">
                    {error}
                  </p>
                </div>
              </div>
            )}

            {/* 1. ROLE SELECTION STEP */}
            {step === "role_selection" && (
              <div className="space-y-6">
                <div className="mb-8">
                  <h2 className="text-xl font-black uppercase text-[#FFFFFF] tracking-wide">
                    Identity Selection
                  </h2>
                  <p className="mt-2 text-xs font-semibold text-[#8A938D] uppercase tracking-wider">
                    Select your access profile to authenticate.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <button
                    onClick={() => handleRoleSelect("admin")}
                    className="w-full bg-[#050505] border border-[#1D2A22] rounded-xl p-5 hover:border-[#00FF66]/50 transition-all hover:shadow-[0_0_15px_rgba(0,255,102,0.1)] flex items-center justify-between group duration-300 text-left"
                  >
                    <div>
                      <h3 className="text-sm font-black text-[#F5F5F5] uppercase tracking-wider group-hover:text-[#00FF66] transition-colors">
                        ADMIN
                      </h3>
                      <p className="text-[10px] text-[#8A938D] mt-1">
                        Manage recruitment operations
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-[#8A938D] group-hover:text-[#00FF66] transition-colors">
                      admin_panel_settings
                    </span>
                  </button>

                  <button
                    onClick={() => handleRoleSelect("interviewer")}
                    className="w-full bg-[#050505] border border-[#1D2A22] rounded-xl p-5 hover:border-[#00FF66]/50 transition-all hover:shadow-[0_0_15px_rgba(0,255,102,0.1)] flex items-center justify-between group duration-300 text-left"
                  >
                    <div>
                      <h3 className="text-sm font-black text-[#F5F5F5] uppercase tracking-wider group-hover:text-[#00FF66] transition-colors">
                        INTERVIEWER
                      </h3>
                      <p className="text-[10px] text-[#8A938D] mt-1">
                        Conduct candidate interviews
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-[#8A938D] group-hover:text-[#00FF66] transition-colors">
                      assignment_ind
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* 2. CREDENTIALS INPUT STEP */}
            {step === "credentials" && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <h2 className="text-xl font-black uppercase text-[#FFFFFF] tracking-wide">
                    {selectedRole === "admin" ? "Admin Sign In" : "Interviewer Sign In"}
                  </h2>
                  <p className="mt-2 text-xs font-semibold text-[#8A938D] uppercase tracking-wider">
                    Enter your authorized credentials below.
                  </p>
                </div>

                {/* Email / ID */}
                <div className="space-y-2">
                  <label
                    htmlFor="identifier"
                    className="block text-[10px] font-black uppercase tracking-widest text-[#8A938D]"
                  >
                    {selectedRole === "admin" ? "Admin Email" : "Interviewer Email"}
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8A938D] text-sm">
                      mail
                    </span>
                    <input
                      id="identifier"
                      type="email"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder={selectedRole === "admin" ? "admin@nexus.com" : "interviewer@nexus.com"}
                      required
                      className="w-full rounded-xl border border-[#1D2A22] bg-[#050505] py-3.5 pl-11 pr-4 text-xs font-bold text-[#FFFFFF] outline-none transition focus:border-[#00FF66] focus:ring-1 focus:ring-[#00FF66]/20 placeholder:text-[#555]"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <label
                    htmlFor="password"
                    className="block text-[10px] font-black uppercase tracking-widest text-[#8A938D]"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8A938D] text-sm">
                      lock
                    </span>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full rounded-xl border border-[#1D2A22] bg-[#050505] py-3.5 pl-11 pr-4 text-xs font-bold text-[#FFFFFF] outline-none transition focus:border-[#00FF66] focus:ring-1 focus:ring-[#00FF66]/20 placeholder:text-[#555]"
                    />
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-3">
                  <button
                    type="submit"
                    disabled={!isLoaded || loading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00FF66] py-3.5 text-xs font-black uppercase tracking-wider text-[#050505] transition hover:bg-[#00B84A] disabled:cursor-not-allowed disabled:opacity-50 shadow-[0_0_15px_rgba(0,255,102,0.25)]"
                  >
                    {loading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#050505]/30 border-t-[#050505]" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        Login
                        <span className="material-symbols-outlined text-sm font-bold">
                          arrow_forward
                        </span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleBackToRoles}
                    className="w-full text-center text-[10px] font-black uppercase tracking-widest text-[#8A938D] hover:text-[#F5F5F5] transition-colors py-2"
                  >
                    Back to profile selection
                  </button>
                </div>
              </form>
            )}

            {/* 3. DEVICE VERIFICATION (MFA) STEP */}
            {step === "mfa" && (
              <form onSubmit={handleVerifyMfa} className="space-y-6">
                <div>
                  <h2 className="text-xl font-black uppercase text-[#FFFFFF] tracking-wide flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#00FF66] text-xl">security</span>
                    Device Verification
                  </h2>
                  <p className="mt-2 text-xs font-semibold text-[#8A938D] uppercase tracking-wider">
                    A verification code has been sent to your email to authorize this device.
                  </p>
                </div>

                {/* MFA Code */}
                <div className="space-y-2">
                  <label
                    htmlFor="mfaCode"
                    className="block text-[10px] font-black uppercase tracking-widest text-[#8A938D]"
                  >
                    Verification Code
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8A938D] text-sm">
                      key
                    </span>
                    <input
                      id="mfaCode"
                      type="text"
                      maxLength={6}
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value)}
                      placeholder="123456"
                      required
                      className="w-full rounded-xl border border-[#1D2A22] bg-[#050505] py-3.5 pl-11 pr-4 text-xs font-bold text-center tracking-[0.5em] text-[#00FF66] outline-none transition focus:border-[#00FF66] focus:ring-1 focus:ring-[#00FF66]/20 placeholder:text-[#555]"
                    />
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00FF66] py-3.5 text-xs font-black uppercase tracking-wider text-[#050505] transition hover:bg-[#00B84A] disabled:cursor-not-allowed disabled:opacity-50 shadow-[0_0_15px_rgba(0,255,102,0.25)]"
                  >
                    {loading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#050505]/30 border-t-[#050505]" />
                        Verifying Device...
                      </>
                    ) : (
                      <>
                        Verify & Complete Sign In
                        <span className="material-symbols-outlined text-sm font-bold">
                          check_circle
                        </span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleBackToCredentials}
                    className="w-full text-center text-[10px] font-black uppercase tracking-widest text-[#8A938D] hover:text-[#F5F5F5] transition-colors py-2"
                  >
                    Back to credentials
                  </button>
                </div>
              </form>
            )}

            <div className="mt-7 border-t border-[#1D2A22]/50 pt-5 text-center">
              <p className="text-[10px] uppercase font-bold tracking-widest text-[#8A938D]">
                Authorized NEXUS personnel only
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-[10px] uppercase font-black tracking-widest text-[#555]">
            NEXUS Recruitment Engine
          </p>
        </div>
      </main>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050505] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#00FF66]/30 border-t-[#00FF66] rounded-full animate-spin"></div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
