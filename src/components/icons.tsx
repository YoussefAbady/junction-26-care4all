import {
  Brain, CircleDot, ClipboardCheck, ClipboardList, Droplets, FileText, Flower2, Heart, HeartPulse, MessageCircle, MessageCircleHeart,
  ShieldCheck, Sprout, Stethoscope, Thermometer, UserRound, Users, Utensils, Wind, Hand, Zap, type LucideProps,
} from "lucide-react";
import type { ComponentType } from "react";

const icons: Record<string, ComponentType<LucideProps>> = {
  Brain, CircleDot, ClipboardCheck, ClipboardList, Droplets, FileText, Flower2, Heart, HeartPulse, MessageCircle, MessageCircleHeart,
  ShieldCheck, Sprout, Stethoscope, Thermometer, UserRound, Users, Utensils, Wind, Hand, Zap,
};

/** Draws one of the icons the questionnaire content refers to by name. Decorative, so hidden from assistive technology. */
export function Icon({ name, size = 22, ...rest }: { name?: string; size?: number } & LucideProps) {
  const Component = name ? icons[name] : undefined;
  return Component ? <Component size={size} aria-hidden="true" focusable="false" {...rest} /> : null;
}

export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <rect width="48" height="48" rx="14" fill="var(--berry-700)" />
      <path d="M24 35.5 13.6 25.3a7.6 7.6 0 0 1 10.4-11 7.6 7.6 0 0 1 10.4 11z" fill="#fff" />
      <path d="M16.5 24.5h3.6l1.9-3.8 3.1 7.6 2.2-4.6 1 .8h2.2" fill="none" stroke="var(--berry-700)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="37" cy="11" r="3" fill="var(--gold-500)" />
    </svg>
  );
}
