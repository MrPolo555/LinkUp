import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js'

const SUPABASE_URL = 'https://wydmaatvxutxgvxjknhm.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5ZG1hYXR2eHV0eGd2eGprbmhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwOTU1MjAsImV4cCI6MjA4OTY3MTUyMH0.ZhybOVp98GTHDZxjDXJF4IruDoip0Npf8AKcsimNeC4'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)