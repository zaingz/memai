import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import encoreClient from '@/lib/encore';

// List bookmarks
export function useBookmarks(params = {}) {
  return useQuery({
    queryKey: ['bookmarks', params],
    queryFn: () => encoreClient.bookmarks.list(params),
  });
}

// Get single bookmark
export function useBookmark(id: number) {
  return useQuery({
    queryKey: ['bookmark', id],
    queryFn: () => encoreClient.bookmarks.get({ id }),
    enabled: !!id,
  });
}

// Get bookmark details with transcription
export function useBookmarkDetails(id: number) {
  return useQuery({
    queryKey: ['bookmarkDetails', id],
    queryFn: () => encoreClient.bookmarks.getDetails({ id }),
    enabled: !!id,
  });
}

// Create bookmark
export function useCreateBookmark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => encoreClient.bookmarks.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    },
  });
}

// Update bookmark
export function useUpdateBookmark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: any) =>
      encoreClient.bookmarks.update({ id }, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
      queryClient.invalidateQueries({ queryKey: ['bookmark', variables.id] });
    },
  });
}

// Delete bookmark
export function useDeleteBookmark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => encoreClient.bookmarks.remove({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    },
  });
}

// Transcription polling
export function useTranscriptionPolling(bookmarkId: number, enabled = true) {
  return useQuery({
    queryKey: ['bookmarkDetails', bookmarkId],
    queryFn: () => encoreClient.bookmarks.getDetails({ id: bookmarkId }),
    enabled: enabled && !!bookmarkId,
    refetchInterval: (data) => {
      const status = (data as any)?.transcription?.status;
      // Poll every 5s if processing, stop if completed/failed
      return status === 'processing' || status === 'pending' ? 5000 : false;
    },
  });
}
