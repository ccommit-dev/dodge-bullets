export type ContentIconName = "hunt" | "dodge" | "beat" | "forge" | "profile" | "attendance" | "event" | "settings";

export function ContentIcon({ name, className = "" }: { name: ContentIconName; className?: string }) {
  return <span className={`content-icon content-icon-${name} ${className}`} aria-hidden="true" />;
}
