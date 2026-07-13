import { LucideIcon } from "lucide-react";

interface MetricProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
}

export function Metric({
  title,
  value,
  icon: Icon,
}: MetricProps) {
  return (
    <div
      className="
        bg-white
        dark:bg-slate-800
        border
        border-slate-200
        dark:border-slate-700
        rounded-2xl
        p-4
        shadow-sm
        hover:shadow-md
        transition-all
      "
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {title}
          </p>

          <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
            {value}
          </p>
        </div>

        <div
          className="
            size-10
            rounded-xl
            bg-blue-50
            dark:bg-blue-500/10
            flex
            items-center
            justify-center
          "
        >
          <Icon className="size-5 text-blue-600" />
        </div>
      </div>
    </div>
  );
}