"use client";

import { useRouter } from "next/navigation";
import { getFirebase } from "../../lib/firebase/config";
import { signOut } from "../../lib/firebase/auth";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const { auth } = getFirebase();
    await signOut(auth);
    router.replace("/auth");
  }

  return (
    <button
      onClick={handleSignOut}
      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
    >
      Sign out
    </button>
  );
}
