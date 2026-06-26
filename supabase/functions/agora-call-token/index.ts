import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import agoraToken from 'npm:agora-token@2.0.5';

const { RtcRole, RtcTokenBuilder } = agoraToken as {
  RtcRole: { PUBLISHER: number };
  RtcTokenBuilder: {
    buildTokenWithUserAccount: (
      appId: string,
      appCertificate: string,
      channelName: string,
      account: string,
      role: number,
      tokenExpire: number,
      privilegeExpire?: number,
    ) => string;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ success: false, message: 'Method not allowed' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const appID = Deno.env.get('AGORA_APP_ID') ?? '';
    const appCertificate = Deno.env.get('AGORA_APP_CERTIFICATE') ?? '';

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !appID || !appCertificate) {
      return json({ success: false, message: 'Call token service is not configured' }, 500);
    }

    const authHeader = req.headers.get('Authorization') || '';
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData?.user?.id) return json({ success: false, message: 'Unauthorized' }, 401);

    const userID = authData.user.id;
    const body = await req.json().catch(() => ({}));
    const roomID = String(body.roomID || '').trim();
    const userName = String(body.userName || 'User').slice(0, 80);
    const callType = String(body.callType || 'voice') === 'video' ? 'video' : 'voice';

    if (!/^[0-9a-f-]{36}$/i.test(roomID)) {
      return json({ success: false, message: 'Invalid call room' }, 400);
    }

    const { data: match, error: matchError } = await adminClient
      .from('matches')
      .select('id, user1_id, user2_id')
      .eq('id', roomID)
      .maybeSingle();

    if (matchError) throw matchError;
    if (!match || (match.user1_id !== userID && match.user2_id !== userID)) {
      return json({ success: false, message: 'You are not allowed to join this call' }, 403);
    }

    const expiresIn = 60 * 60;
    const now = Math.floor(Date.now() / 1000);
    const expireAt = now + expiresIn;
    const channelName = roomID;
    const token = RtcTokenBuilder.buildTokenWithUserAccount(
      appID,
      appCertificate,
      channelName,
      userID,
      RtcRole.PUBLISHER,
      expireAt,
      expireAt,
    );

    return json({
      success: true,
      provider: 'agora',
      appID,
      token,
      channelName,
      userID,
      userName,
      callType,
      expiresIn,
    });
  } catch (error) {
    console.error('agora-call-token error:', error);
    return json({ success: false, message: error.message || 'Unable to create call token' }, 500);
  }
});
