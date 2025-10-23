import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from '../_shared/cors.ts';

// Allowed file extensions and MIME types
const ALLOWED_EXTENSIONS = ['pdf', 'csv', 'txt', 'log', 'json', 'zip', 'png', 'jpg', 'jpeg', 'doc', 'docx', 'xls', 'xlsx'];
const ALLOWED_MIMES = [
  'application/pdf', 'text/csv', 'text/plain', 'application/json',
  'application/zip', 'image/png', 'image/jpeg',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

// Simple UUID v4 generator
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const auth = req.headers.get('Authorization') || '';

    const sbAuth = createClient(url, anon, {
      global: { headers: { Authorization: auth } },
    });
    const sb = createClient(url, service);

    const { data: { user } } = await sbAuth.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { control_id, filename } = await req.json();
    if (!control_id || !filename) {
      return new Response(
        JSON.stringify({ error: 'Missing fields: control_id, filename' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file extension
    const ext = filename.includes('.') ? filename.split('.').pop()?.toLowerCase() : '';
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      return new Response(
        JSON.stringify({ error: `File type not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile } = await sb
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.company_id) {
      return new Response(
        JSON.stringify({ error: 'No tenant' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tenant_id = profile.company_id;

    // Generate target path (ext already validated above)
    const objectName = `evidence/${tenant_id}/${uuidv4()}.${ext}`;

    console.log('[get-upload-url]', { tenant_id, objectName, extension: ext });

    // Create presigned upload URL (short TTL, no upsert)
    const { data, error } = await sb.storage
      .from('evidence')
      .createSignedUploadUrl(objectName, {
        upsert: false
      });

    if (error) throw error;

    console.log('[get-upload-url] Generated URL for', objectName);

    return new Response(
      JSON.stringify({
        path: objectName,
        signedUrl: data?.signedUrl,
        token: data?.token,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    console.error('[get-upload-url]', e);
    return new Response(
      JSON.stringify({ error: e.message ?? 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
