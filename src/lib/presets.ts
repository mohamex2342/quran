import bgMosque from "@/assets/bg-mosque-night.jpg";
import bgNebula from "@/assets/bg-nebula.jpg";
import bgGeometric from "@/assets/bg-geometric.jpg";
import bgDesert from "@/assets/bg-desert.jpg";

export interface BackgroundPreset {
  id: string;
  label: string;
  image: string;
  // CSS gradient overlay applied on top to keep text readable & on-brand
  overlay: string;
}

export const BACKGROUNDS: BackgroundPreset[] = [
  {
    id: "mosque",
    label: "Moonlit Mosque",
    image: bgMosque,
    overlay: "linear-gradient(180deg, hsl(232 60% 6% / 0.35), hsl(232 70% 4% / 0.7))",
  },
  {
    id: "nebula",
    label: "Golden Nebula",
    image: bgNebula,
    overlay: "linear-gradient(180deg, hsl(232 60% 6% / 0.45), hsl(232 70% 4% / 0.75))",
  },
  {
    id: "geometric",
    label: "Arabesque Gold",
    image: bgGeometric,
    overlay: "linear-gradient(180deg, hsl(232 60% 6% / 0.55), hsl(232 70% 4% / 0.8))",
  },
  {
    id: "desert",
    label: "Starlit Desert",
    image: bgDesert,
    overlay: "linear-gradient(180deg, hsl(232 60% 6% / 0.4), hsl(232 70% 4% / 0.75))",
  },
];

export interface StylePreset {
  id: string;
  label: string;
  arabicFont: string;
  arabicColor: string;
  translationColor: string;
  accent: string; // for highlight underline
  arabicSizeRatio: number; // relative to canvas height
}

export const STYLES: StylePreset[] = [
  {
    id: "celestial",
    label: "Celestial",
    arabicFont: '"Amiri", serif',
    arabicColor: "#f5f0e0",
    translationColor: "#c7c9d6",
    accent: "#f0c674",
    arabicSizeRatio: 0.075,
  },
  {
    id: "modern-gold",
    label: "Modern Gold",
    arabicFont: '"Reem Kufi", sans-serif',
    arabicColor: "#f0d78c",
    translationColor: "#e8e8f0",
    accent: "#a78bfa",
    arabicSizeRatio: 0.07,
  },
  {
    id: "pure",
    label: "Pure White",
    arabicFont: '"Amiri", serif',
    arabicColor: "#ffffff",
    translationColor: "#d8d8e8",
    accent: "#818cf8",
    arabicSizeRatio: 0.08,
  },
  {
    id: "violet-dream",
    label: "Violet Dream",
    arabicFont: '"Amiri", serif',
    arabicColor: "#e0d5ff",
    translationColor: "#b8b3d4",
    accent: "#c4b5fd",
    arabicSizeRatio: 0.075,
  },
];
