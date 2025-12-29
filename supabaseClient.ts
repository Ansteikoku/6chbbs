import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://furhathilthcnoxfdmzv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1cmhhdGhpbHRoY25veGZkbXp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMTQyMzMsImV4cCI6MjA4MjU5MDIzM30.5niAFnw7GqtVQVSMdp6LuRZnALu8C8Gyjdodp2FOpgY'
);
