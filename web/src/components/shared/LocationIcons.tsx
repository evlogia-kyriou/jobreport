/**
 * LocationIcons — Phosphor duotone icons for Tipe Bangunan + Kategori Fungsi
 *
 * Usage:
 *   import { TipeBangunanIcon, KategoriFungsiIcon } from '@/components/shared/LocationIcons'
 *   <TipeBangunanIcon label="Rumah" size={32} />
 *   <KategoriFungsiIcon label="F&B" size={24} />
 */

import {
  Bag,
  Bank,
  Barbell,
  Bed,
  Bell,
  Briefcase,
  Building,
  BuildingApartment,
  BuildingOffice,
  Buildings,
  CastleTurret,
  Code,
  CraneTower,
  Factory,
  FirstAidKit,
  ForkKnife,
  GraduationCap,
  HandsPraying,
  Hospital,
  House,
  HouseSimple,
  Laptop,
  MapPin,
  MusicNote,
  Question,
  ShoppingBag,
  ShoppingCart,
  Stethoscope,
  Storefront,
  Toolbox,
  Warehouse,
  Wrench,
} from "@phosphor-icons/react";
import React from "react";

// ── Shared props ───────────────────────────────────────────────────────────────

interface IconProps {
  size?: number;
  color?: string;
}

const DEFAULT_COLOR = "var(--text-accent)";
const DEFAULT_SIZE = 28;

// ── Tipe Bangunan → icon map ───────────────────────────────────────────────────

const TIPE_BANGUNAN_MAP: Record<string, React.FC<IconProps>> = {
  Rumah: ({ size, color }) => (
    <House weight="duotone" size={size} color={color} />
  ),
  Apartemen: ({ size, color }) => (
    <Buildings weight="duotone" size={size} color={color} />
  ),
  "Kosan / Kontrakan": ({ size, color }) => (
    <BuildingApartment weight="duotone" size={size} color={color} />
  ),
  Villa: ({ size, color }) => (
    <CastleTurret weight="duotone" size={size} color={color} />
  ),
  Townhouse: ({ size, color }) => (
    <HouseSimple weight="duotone" size={size} color={color} />
  ),
  Ruko: ({ size, color }) => (
    <Storefront weight="duotone" size={size} color={color} />
  ),
  "Rukan (Rumah Kantor)": ({ size, color }) => (
    <BuildingOffice weight="duotone" size={size} color={color} />
  ),
  Kios: ({ size, color }) => <Bag weight="duotone" size={size} color={color} />,
  Toko: ({ size, color }) => (
    <ShoppingBag weight="duotone" size={size} color={color} />
  ),
  "Lantai Kantor": ({ size, color }) => (
    <Building weight="duotone" size={size} color={color} />
  ),
  "Gedung Kantor": ({ size, color }) => (
    <Buildings weight="duotone" size={size} color={color} />
  ),
  "Coworking Space": ({ size, color }) => (
    <Laptop weight="duotone" size={size} color={color} />
  ),
  "Mal / Pusat Perbelanjaan": ({ size, color }) => (
    <ShoppingCart weight="duotone" size={size} color={color} />
  ),
  Hotel: ({ size, color }) => (
    <Bed weight="duotone" size={size} color={color} />
  ),
  "Rumah Sakit": ({ size, color }) => (
    <Hospital weight="duotone" size={size} color={color} />
  ),
  "Sekolah / Kampus": ({ size, color }) => (
    <GraduationCap weight="duotone" size={size} color={color} />
  ),
  "Gedung Serbaguna": ({ size, color }) => (
    <CraneTower weight="duotone" size={size} color={color} />
  ),
  Pabrik: ({ size, color }) => (
    <Factory weight="duotone" size={size} color={color} />
  ),
  Gudang: ({ size, color }) => (
    <Warehouse weight="duotone" size={size} color={color} />
  ),
  "Workshop / Bengkel": ({ size, color }) => (
    <Wrench weight="duotone" size={size} color={color} />
  ),
  Lainnya: ({ size, color }) => (
    <MapPin weight="duotone" size={size} color={color} />
  ),
};

// ── Kategori Fungsi → icon map ─────────────────────────────────────────────────

const KATEGORI_FUNGSI_MAP: Record<string, React.FC<IconProps>> = {
  "F&B": ({ size, color }) => (
    <ForkKnife weight="duotone" size={size} color={color} />
  ),
  Perkantoran: ({ size, color }) => (
    <Briefcase weight="duotone" size={size} color={color} />
  ),
  Residensial: ({ size, color }) => (
    <House weight="duotone" size={size} color={color} />
  ),
  Kesehatan: ({ size, color }) => (
    <Stethoscope weight="duotone" size={size} color={color} />
  ),
  Pendidikan: ({ size, color }) => (
    <GraduationCap weight="duotone" size={size} color={color} />
  ),
  "Retail / Perdagangan": ({ size, color }) => (
    <ShoppingBag weight="duotone" size={size} color={color} />
  ),
  Perhotelan: ({ size, color }) => (
    <Bed weight="duotone" size={size} color={color} />
  ),
  Industri: ({ size, color }) => (
    <Factory weight="duotone" size={size} color={color} />
  ),
  Teknologi: ({ size, color }) => (
    <Code weight="duotone" size={size} color={color} />
  ),
  Pemerintahan: ({ size, color }) => (
    <Bank weight="duotone" size={size} color={color} />
  ),
  Hiburan: ({ size, color }) => (
    <MusicNote weight="duotone" size={size} color={color} />
  ),
  Olahraga: ({ size, color }) => (
    <Barbell weight="duotone" size={size} color={color} />
  ),
  "Tempat Ibadah": ({ size, color }) => (
    <HandsPraying weight="duotone" size={size} color={color} />
  ),
  Lainnya: ({ size, color }) => (
    <Question weight="duotone" size={size} color={color} />
  ),
};

// ── Public components ──────────────────────────────────────────────────────────

interface LocationIconProps {
  label: string;
  size?: number;
  color?: string;
}

export function TipeBangunanIcon({
  label,
  size = DEFAULT_SIZE,
  color = DEFAULT_COLOR,
}: LocationIconProps) {
  const IconComponent = TIPE_BANGUNAN_MAP[label];
  if (!IconComponent)
    return <MapPin weight="duotone" size={size} color={color} />;
  return <IconComponent size={size} color={color} />;
}

export function KategoriFungsiIcon({
  label,
  size = DEFAULT_SIZE,
  color = DEFAULT_COLOR,
}: LocationIconProps) {
  const IconComponent = KATEGORI_FUNGSI_MAP[label];
  if (!IconComponent)
    return <Question weight="duotone" size={size} color={color} />;
  return <IconComponent size={size} color={color} />;
}
