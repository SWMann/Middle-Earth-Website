export const metadata = {
  title: "Rules — Middle-earth",
  description: "Server rules and player conduct.",
};

export default function RulesPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 space-y-8 leading-relaxed">
      <header>
        <p className="mb-2 text-xs uppercase tracking-widest opacity-60">
          Conduct
        </p>
        <h1 className="text-3xl font-semibold">Server rules</h1>
        <p className="mt-2 text-xs opacity-50">
          v0.1 &middot; subject to revision as we learn what players actually
          need.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">The short version</h2>
        <ol className="list-decimal pl-6 space-y-2 opacity-90">
          <li>Be a person. No harassment, no slurs, no doxxing.</li>
          <li>
            No grief outside of declared war. Building on someone else&apos;s
            claim, breaking their walls, stealing their goods &mdash; all
            require a state of war.
          </li>
          <li>
            No exploits. If something looks broken, tell staff in
            <code className="font-mono mx-1">#staff-questions</code>.
            Exploiting it gets you a strike.
          </li>
          <li>
            Builds belong on your faction&apos;s claimed land. Random
            structures across the wilderness will be removed.
          </li>
          <li>
            Roleplay in character on RP channels. Out-of-character chatter has
            its own channel. Don&apos;t mix them.
          </li>
          <li>
            Don&apos;t metagame. Information your character doesn&apos;t have
            is information your character doesn&apos;t have, even if your
            player does.
          </li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Strikes and bans</h2>
        <p className="opacity-90">
          We use a three-strike system for minor violations. Major violations
          (harassment, exploit abuse, persistent grief) are immediate bans.
          Every staff action is recorded in{" "}
          <code className="font-mono">audit.events</code> and reviewable.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Disputes</h2>
        <p className="opacity-90">
          If you disagree with a staff action, raise it in
          <code className="font-mono mx-1">#staff-questions</code>. A
          second staff member will review. We&apos;d rather discuss than
          escalate.
        </p>
      </section>

      <section className="border-t border-stone-200 dark:border-stone-800 pt-6 text-sm opacity-70">
        <p>
          More detail will accumulate here as situations come up. If a
          situation isn&apos;t covered, staff use the principles in{" "}
          <a href="/about" className="underline">
            About
          </a>{" "}
          as a guide.
        </p>
      </section>
    </div>
  );
}
