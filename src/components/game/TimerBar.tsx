import { motion } from "framer-motion";

interface Props {
  seconds: number;
  maxSeconds: number;
}

export function TimerBar({ seconds, maxSeconds }: Props) {
  const fraction = maxSeconds > 0 ? seconds / maxSeconds : 0;
  const urgency = maxSeconds > 0 ? 1 - seconds / maxSeconds : 0;
  const isLow = seconds <= 10;
  const isCritical = seconds <= 5;

  const barHue = Math.round(142 - urgency * 142);
  const barColor = `hsl(${barHue} 70% ${42 + urgency * 8}%)`;

  return (
    <div className="flex min-w-[11rem] shrink-0 items-center gap-3">
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-zinc-800">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: barColor }}
          initial={false}
          animate={{ width: `${fraction * 100}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>
      <motion.span
        className={`min-w-[3ch] text-right font-mono text-lg font-bold tabular-nums ${
          isCritical
            ? "text-red-500"
            : isLow
              ? "text-red-400/90"
              : "text-zinc-300"
        }`}
        initial={false}
        animate={{
          scale: isCritical ? [1, 1.12, 1] : isLow ? [1, 1.06, 1] : 1,
        }}
        transition={{
          duration: isCritical ? 0.45 : 0.55,
          repeat: isLow ? Infinity : 0,
          repeatDelay: isCritical ? 0.35 : 0.55,
          ease: "easeInOut",
        }}
      >
        {seconds}
      </motion.span>
    </div>
  );
}
