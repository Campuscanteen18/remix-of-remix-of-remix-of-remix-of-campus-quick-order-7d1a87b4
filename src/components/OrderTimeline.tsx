import { Check, Clock, ChefHat, Package, HandHeart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface OrderTimelineProps {
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'collected';
}

const steps = [
  { id: 'pending', label: 'Order Placed', icon: Clock },
  { id: 'confirmed', label: 'Confirmed', icon: Check },
  { id: 'preparing', label: 'Preparing', icon: ChefHat },
  { id: 'ready', label: 'Ready', icon: Package },
  { id: 'collected', label: 'Collected', icon: HandHeart },
];

const statusIndex: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  preparing: 2,
  ready: 3,
  collected: 4,
};

export function OrderTimeline({ status }: OrderTimelineProps) {
  const currentIndex = statusIndex[status] ?? 0;

  return (
    <div className="py-4">
      <div className="flex items-center justify-between relative">
        {/* Progress line */}
        <div className="absolute left-0 right-0 top-5 h-0.5 bg-muted mx-8" />
        <motion.div 
          className="absolute left-0 top-5 h-0.5 bg-primary mx-8"
          initial={{ width: 0 }}
          animate={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />

        {steps.map((step, index) => {
          const isCompleted = index <= currentIndex;
          const isCurrent = index === currentIndex;
          const Icon = step.icon;

          return (
            <motion.div
              key={step.id}
              className="flex flex-col items-center relative z-10"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <motion.div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                  isCompleted
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground',
                  isCurrent && 'ring-4 ring-primary/20'
                )}
                animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                transition={{ repeat: isCurrent ? Infinity : 0, duration: 2 }}
              >
                <Icon size={18} />
              </motion.div>
              <span
                className={cn(
                  'text-[10px] mt-2 font-medium text-center',
                  isCompleted ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
