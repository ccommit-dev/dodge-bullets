export function AdventurerSprite({ className = "" }: { className?: string }) {
  return (
    <div className={`adventurer-sprite ${className}`} role="img" aria-label="비트 수련 중인 검의 주인" />
  );
}
