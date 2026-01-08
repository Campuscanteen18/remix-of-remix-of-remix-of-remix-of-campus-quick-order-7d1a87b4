import { Clock } from 'lucide-react';
import { TimePeriod } from '@/types/canteen';

interface TimePeriodBannerProps {
  period: TimePeriod;
}

export function TimePeriodBanner({ period }: TimePeriodBannerProps) {
  const formatTime = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  return (
    <div className="flex items-center gap-4 px-4 py-4 rounded-2xl bg-muted/50 mb-4 lg:mb-6 border border-border">
      <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
        <span className="text-3xl">{period.icon}</span>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 text-primary">
          <Clock className="w-4 h-4" />
          <span className="font-semibold text-sm">{period.name} Time</span>
        </div>
        <p className="text-foreground font-medium mt-0.5">
          Showing items available now
        </p>
        <p className="text-muted-foreground text-sm">
          ({formatTime(period.startHour)} - {formatTime(period.endHour)})
        </p>
      </div>
    </div>
  );
}
