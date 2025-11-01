import { useQuery, useMutation, useQueryClient } from '@tantml:query';
import encoreClient from '@/lib/encore';

// Get current user
export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => encoreClient.users.me(),
  });
}

// Update profile
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => encoreClient.users.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}
