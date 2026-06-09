import {
  type Auth,
  GoogleAuthProvider,
  signInWithRedirect,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink as firebaseSignInWithEmailLink,
  signOut as firebaseSignOut,
} from "firebase/auth";

const EMAIL_STORAGE_KEY = "gameday_signin_email";

export async function signInWithGoogle(auth: Auth): Promise<void> {
  const provider = new GoogleAuthProvider();
  await signInWithRedirect(auth, provider);
}

export async function sendSignInLink(
  auth: Auth,
  email: string
): Promise<void> {
  const actionCodeSettings = {
    url: `${window.location.origin}/auth`,
    handleCodeInApp: true,
  };
  await sendSignInLinkToEmail(auth, email, actionCodeSettings);
  localStorage.setItem(EMAIL_STORAGE_KEY, email);
}

export function isEmailSignInLink(url: string): boolean {
  // isSignInWithEmailLink needs an Auth instance — use the standalone check
  // by delegating to firebase/auth.
  // We import getAuth lazily to avoid SSR issues.
  return url.includes("oobCode") && url.includes("mode=signIn");
}

export async function completeEmailSignIn(
  auth: Auth,
  url: string
): Promise<string | null> {
  if (!isSignInWithEmailLink(auth, url)) return null;
  const email = localStorage.getItem(EMAIL_STORAGE_KEY) ?? "";
  await firebaseSignInWithEmailLink(auth, email, url);
  localStorage.removeItem(EMAIL_STORAGE_KEY);
  return email;
}

export async function signOut(auth: Auth): Promise<void> {
  await firebaseSignOut(auth);
}
