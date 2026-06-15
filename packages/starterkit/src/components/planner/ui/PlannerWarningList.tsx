"use client";

type Props = {
  title?: string;
  items: string[];
  variant?: "risk" | "watch" | "ok";
};

const ICON: Record<NonNullable<Props["variant"]>, string> = {
  risk: "!",
  watch: "!",
  ok: "✓",
};

export function PlannerWarningList({
  title,
  items,
  variant = "watch",
}: Props) {
  if (!items.length) return null;

  return (
    <div className={`planner-warning-list planner-warning-list--${variant}`}>
      {title ? (
        <h4 className="planner-warning-list-title">
          {title}
          <span className="planner-warning-list-count">{items.length}</span>
        </h4>
      ) : null}
      <ul>
        {items.map((item) => (
          <li key={item}>
            <span className="planner-warning-list-icon" aria-hidden="true">
              {ICON[variant]}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
