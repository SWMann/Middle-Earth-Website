import type { ReactNode } from "react";

export function ComingSoon({
  title,
  phase,
  children,
}: {
  title: string;
  phase: string;
  children?: ReactNode;
}) {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <p className="mb-2 text-xs uppercase tracking-widest opacity-60">
        {phase}
      </p>
      <h1 className="mb-4 text-3xl font-semibold">{title}</h1>
      <div className="prose prose-sm dark:prose-invert opacity-80">
        {children}
      </div>
    </section>
  );
}
