import {useState} from 'react';
import {BookOpen, Car, Printer, Shirt, Utensils} from 'lucide-react';
import type {ServiceCategory} from '../types';

interface ServiceImageProps {
  src: string;
  alt: string;
  category: ServiceCategory;
  className?: string;
}

const CATEGORY_ICONS: Record<ServiceCategory, typeof Utensils> = {
  Food: Utensils,
  Laundry: Shirt,
  Printing: Printer,
  Transport: Car,
  Stationery: BookOpen,
};

export function ServiceImage({src, alt, category, className = ''}: ServiceImageProps) {
  const [failed, setFailed] = useState(false);
  const Icon = CATEGORY_ICONS[category] || Utensils;

  if (failed || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 ${className}`}
        role="img"
        aria-label={alt}
      >
        <Icon className="w-8 h-8 mb-2 text-slate-400 dark:text-slate-500" strokeWidth={1.5} />
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{category}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
