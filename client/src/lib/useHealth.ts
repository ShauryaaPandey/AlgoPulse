import { useQuery } from '@tanstack/react-query';
import { api } from './api';

interface HealthResponse {
  status: string;
  mongoConfigured: boolean;
  aiConfigured: boolean;
}

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const res = await api.get<HealthResponse>('/health');
      return res.data;
    },
    staleTime: 60_000,
    retry: false
  });
}
