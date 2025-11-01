import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import encoreClient from '@/lib/encore';

// List digests
export function useDigests(params = {}) {
  return useQuery({
    queryKey: ['digests', params],
    queryFn: () => encoreClient.digests.list(params),
  });
}

// Get single digest
export function useDigest(date: string) {
  return useQuery({
    queryKey: ['digest', date],
    queryFn: () => encoreClient.digests.get({ date }),
    enabled: !!date,
  });
}

// Generate digest
export function useGenerateDigest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => encoreClient.digests.generate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digests'] });
    },
  });
}
