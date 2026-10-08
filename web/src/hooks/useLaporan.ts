import {
    buildDateRange,
    getPeopleMetrics,
    getQualityMetrics,
    getSpeedMetrics,
    getVolumeChart,
    getVolumeMetrics,
    type DateRange,
    type TimeFilter,
} from "@/repositories/laporanRepository";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export function useDateRange(
  filter: TimeFilter,
  customFrom?: string,
  customTo?: string,
): DateRange {
  return useMemo(
    () => buildDateRange(filter, customFrom, customTo),
    [filter, customFrom, customTo],
  );
}

export function useVolumeMetrics(range: DateRange) {
  return useQuery({
    queryKey: ["laporan", "volume", range.from, range.to],
    queryFn: () => getVolumeMetrics(range),
    staleTime: 60_000,
  });
}

export function useQualityMetrics(range: DateRange) {
  return useQuery({
    queryKey: ["laporan", "quality", range.from, range.to],
    queryFn: () => getQualityMetrics(range),
    staleTime: 60_000,
  });
}

export function useSpeedMetrics(range: DateRange) {
  return useQuery({
    queryKey: ["laporan", "speed", range.from, range.to],
    queryFn: () => getSpeedMetrics(range),
    staleTime: 60_000,
  });
}

export function usePeopleMetrics(range: DateRange) {
  return useQuery({
    queryKey: ["laporan", "people", range.from, range.to],
    queryFn: () => getPeopleMetrics(range),
    staleTime: 60_000,
  });
}

export function useVolumeChart(range: DateRange) {
  return useQuery({
    queryKey: ["laporan", "chart", range.from, range.to],
    queryFn: () => getVolumeChart(range),
    staleTime: 60_000,
  });
}
