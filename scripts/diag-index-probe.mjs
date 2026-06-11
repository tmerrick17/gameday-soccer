// [DEBUG-idx9] THROWAWAY diagnostic harness for the members/userId collection-group
// index bug. Mirrors getTeamsByUser() in lib/firebase/teams.ts. Delete after diagnosis.
//
// Usage: node scripts/diag-index-probe.mjs
//
// Signal:
//   FAILED-PRECONDITION (requires an index)  -> index MISSING (bug reproduced)
//   permission-denied / results              -> query passed planning, index ACTIVE

import { readFileSync } from "node:fs";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collectionGroup,
  query,
  where,
  getDocs,
} from "firebase/firestore";

// Parse .env.local (Next isn't running, so env vars aren't loaded).
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const app = initializeApp({
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
});

const db = getFirestore(app);

console.log(`[DEBUG-idx9] project=${env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);

// Run an unauthenticated collectionGroup('members') query on a given field and
// classify the outcome. Index-required (failed-precondition) is a planning error
// returned BEFORE rule evaluation; permission-denied means planning succeeded.
async function probe(field) {
  try {
    const snap = await getDocs(
      query(collectionGroup(db, "members"), where(field, "==", "diagnostic-probe"))
    );
    return `succeeded (${snap.size} docs) -> planning passed, INDEX ACTIVE`;
  } catch (e) {
    if (e.code === "failed-precondition") return `failed-precondition -> INDEX MISSING`;
    if (e.code === "permission-denied") return `permission-denied -> planning passed, INDEX ACTIVE`;
    return `unexpected code=${e.code} msg=${e.message}`;
  }
}

// SUBJECT: the deployed index field.
const subject = await probe("userId");
// CONTROL: a field with NO collection-group index — should surface failed-precondition,
// proving the loop distinguishes missing-index from present-index.
const control = await probe("role");

console.log(`[DEBUG-idx9] SUBJECT userId : ${subject}`);
console.log(`[DEBUG-idx9] CONTROL role   : ${control}`);

const subjectActive = subject.includes("INDEX ACTIVE");
const controlMissing = control.includes("INDEX MISSING");
console.log(`[DEBUG-idx9] LOOP-VALID=${controlMissing} (control must be MISSING for signal to be trustworthy)`);
console.log(`[DEBUG-idx9] VERDICT: ${
  controlMissing && subjectActive
    ? "userId index is BUILT and ACTIVE (control proves the loop distinguishes states)"
    : !controlMissing
      ? "INCONCLUSIVE — control did not surface index error; loop cannot distinguish states"
      : "userId index still MISSING"
}`);

process.exit(0);
