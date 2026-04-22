export function BankAvatar({ code, color, size = 40 }: { code: string; color: string; size?: number }) {
  return (
    <div
      className="rounded-xl grid place-items-center font-display font-bold text-white shadow-md shrink-0"
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${color}, ${color}aa)`, fontSize: size * 0.32 }}
    >
      {code}
    </div>
  );
}
