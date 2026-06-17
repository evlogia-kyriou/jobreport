import { projectRepository } from "@/repositories/projectRepository";
import { useQuery } from "@tanstack/react-query";

export function useDashboardStats() {
    return useQuery({
        queryKey: ["dashboard-stats"],
        queryFn: () => projectRepository.getDashboardStats(),
        refetchInterval: 30_000,
    });
}