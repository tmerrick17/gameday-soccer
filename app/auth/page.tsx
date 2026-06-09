"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../providers";
import { getFirebase } from "../../lib/firebase/config";
import {
  signInWithGoogle,
  sendSignInLink,
  completeEmailSignIn,
} from "../../lib/firebase/auth";

export default function AuthPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  // Redirect to teams if already signed in
  useEffect(() => {
    if (!loading && user) router.replace("/teams");
  }, [user, loading, router]);

  // Complete email sign-in if this is a callback URL
  useEffect(() => {
    const url = window.location.href;
    if (!url.includes("oobCode")) return;
    setCompleting(true);
    const { auth } = getFirebase();
    completeEmailSignIn(auth, url)
      .then((used) => {
        if (used) router.replace("/teams");
        else setError("Sign-in link is invalid or expired.");
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setCompleting(false));
  }, [router]);

  async function handleGoogle() {
    setError(null);
    try {
      const { auth } = getFirebase();
      await signInWithGoogle(auth);
    } catch (e: unknown) {
      setError((e as Error).message);
    }
  }

  async function handleEmailLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const { auth } = getFirebase();
      await sendSignInLink(auth, email);
      setLinkSent(true);
    } catch (e: unknown) {
      setError((e as Error).message);
    }
  }

  if (loading || completing) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-gray-500">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6">
      <h1 className="text-2xl font-bold tracking-tight">GameDay Soccer</h1>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {linkSent ? (
        <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          Check your email — a sign-in link is on its way to{" "}
          <strong>{email}</strong>.
        </p>
      ) : (
        <>
          <button
            onClick={handleGoogle}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium shadow-sm hover:bg-gray-50 active:bg-gray-100"
          >
            <GoogleIcon />
            Sign in with Google
          </button>

          <div className="relative flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-gray-400">or</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <form onSubmit={handleEmailLink} className="flex flex-col gap-3">
            <label className="text-sm font-medium text-gray-700">
              Email address
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-3 text-base outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200"
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 active:bg-green-800"
            >
              Send sign-in link
            </button>
          </form>
        </>
      )}
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
