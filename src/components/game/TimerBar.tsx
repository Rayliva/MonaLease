import { motion } from "framer-motion";

interface Props {
  seconds: number;
  maxSeconds: number;
}

export function TimerBar({ seconds, maxSeconds }: Props) {
  const fraction = maxSeconds > 0 ? seconds / maxSeconds : 0;
  const isLow = seconds <= 10;

  return (
    <div className="flex items-center gap-3">
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-zinc-800">
        <motion.div
          className={`h-full rounded-full ${isLow ? "bg-red-500" : "bg-emerald-500"}`}
          initial={false}
          animate={{ width: `${fraction * 100}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>
      <span
        className={`min-w-[3ch] text-right font-mono text-lg font-bold ${isLow ? "text-red-400" : "text-zinc-300"}`}
      >
        {seconds}
      </span>
    </div>
  );
}
