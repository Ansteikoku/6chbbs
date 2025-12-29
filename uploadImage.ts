import { supabase } from './supabaseClient';

export async function uploadImage(file: File) {
  const name = `${Date.now()}_${file.name}`;
  await supabase.storage.from('images').upload(name, file);
  return supabase.storage.from('images').getPublicUrl(name).data.publicUrl;
}
