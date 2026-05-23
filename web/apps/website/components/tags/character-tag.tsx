import Link from "next/link";
import { getCharacter } from "@/lib/data/characters";

type Props = {
  characterId: number;
  /** Show the faction label inline (useful in cross-faction lists). */
  withFaction?: boolean;
};

/**
 * Renders a character by ID. Per web_spec.md §2.4. Wound and influence
 * detail are NOT shown here — those are faction-scoped, surfaced only on
 * the character's own page or the faction dashboard. The tag is meant to
 * be safe to drop anywhere, including in public-tier surfaces.
 */
export async function CharacterTag({ characterId, withFaction }: Props) {
  const c = await getCharacter(characterId);
  if (!c) {
    return <span className="font-mono text-xs text-stone-500">#{characterId}</span>;
  }
  return (
    <Link
      href={{ pathname: `/characters/${c.id}` }}
      className="inline-flex items-baseline gap-1.5 hover:underline"
    >
      <span>{c.name}</span>
      {c.title && <span className="text-xs text-stone-500">— {c.title}</span>}
      {withFaction && (
        <span className="text-xs text-stone-500">· {c.factionId}</span>
      )}
    </Link>
  );
}
