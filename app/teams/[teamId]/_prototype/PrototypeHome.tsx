// PROTOTYPE — throwaway. Entry point mounted by page.tsx when ?variant= is set.
// Picks A/B/C, injects mocked focus-game data per ?state=, renders the switcher.
"use client";

import { useSearchParams } from "next/navigation";
import type { TeamDoc, MemberDoc } from "../../../../lib/firebase";
import VariantA from "./VariantA";
import VariantB from "./VariantB";
import VariantC from "./VariantC";
import PrototypeSwitcher from "./PrototypeSwitcher";
import { mockGames, type FocusState } from "./mockData";

export default function PrototypeHome({
  teamId,
  team,
  members,
  inviteUrl,
  copied,
  onCopy,
  onSignOut,
}: {
  teamId: string;
  team: TeamDoc;
  members: MemberDoc[];
  inviteUrl: string;
  copied: boolean;
  onCopy: () => void;
  onSignOut: () => void;
}) {
  const searchParams = useSearchParams();
  const variant = (searchParams.get("variant") ?? "A").toUpperCase();
  const state = (searchParams.get("state") ?? "live") as FocusState;

  const props = {
    teamId,
    team,
    members,
    games: mockGames(state),
    inviteUrl,
    copied,
    onCopy,
    onSignOut,
  };

  return (
    <>
      {variant === "B" ? (
        <VariantB {...props} />
      ) : variant === "C" ? (
        <VariantC {...props} />
      ) : (
        <VariantA {...props} />
      )}
      <PrototypeSwitcher variant={variant} state={state} />
    </>
  );
}
