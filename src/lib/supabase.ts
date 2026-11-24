import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('your-project')
);

// Fallback dummy client if not configured yet, to prevent runtime crashes
export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : (createClient(
      'https://placeholder-project.supabase.co',
      'placeholder-anon-key'
    ) as SupabaseClient);

/**
 * Upload file to Supabase Storage bucket
 */
export async function uploadToSupabaseStorage(
  bucketName: string,
  filePath: string,
  file: File | Blob
): Promise<{ url: string | null; error: Error | null }> {
  if (!isSupabaseConfigured) {
    return {
      url: null,
      error: new Error('Supabase chưa được cấu hình. Vui lòng thiết lập biến môi trường VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY.'),
    };
  }

  try {
    const { data, error } = await supabase.storage.from(bucketName).upload(filePath, file, {
      upsert: true,
    });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(data.path);
    return { url: publicUrlData.publicUrl, error: null };
  } catch (err: any) {
    return { url: null, error: err };
  }
}
