import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = "Search menu..." }: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <motion.div 
      className="relative"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Search 
        className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200 ${
          isFocused ? 'text-primary' : 'text-muted-foreground'
        }`} 
      />
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className="pl-10 pr-10 h-11 rounded-xl bg-muted/50 border-transparent focus:border-primary focus:bg-card transition-all text-sm"
      />
      <AnimatePresence>
        {value && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => onChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-muted-foreground/15 flex items-center justify-center hover:bg-muted-foreground/25 transition-colors"
          >
            <X size={12} />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
