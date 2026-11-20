import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const PHOTO_BUCKET = 'dairy-photos';
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

export async function uploadPhoto(centreId: string, kind: 'farmers' | 'animals', file: File): Promise<string> {
  if (!ALLOWED.includes(file.type)) throw new Error('Please choose a JPG, PNG or WebP photo');
  if (file.size > MAX_BYTES) throw new Error('Photo must be 5 MB or smaller');
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${centreId}/${kind}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

export function usePhotoUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ['photo-url', path],
    enabled: !!path,
    staleTime: 50 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(path as string, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}
