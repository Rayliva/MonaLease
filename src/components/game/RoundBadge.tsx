interface Props {
  round: number;
  totalRounds: number;
}

export function RoundBadge({ round, totalRounds }: Props) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800 px-4 py-1.5 text-sm font-semibold text-zinc-200">
      <span className="text-emerald-400">Round {round}</span>
      <span className="text-zinc-500">/</span>
      <span className="text-zinc-400">{totalRounds}</span>
    </div>
  );
}
