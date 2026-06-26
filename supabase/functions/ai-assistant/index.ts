// Supabase Edge Function: ai-assistant
// User-facing AI features for The College Date.
// Required secret: OPENROUTER_API_KEY

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TASKS = new Set([
  'profile_coach',
  'conversation_opener',
  'smart_reply',
  'compatibility',
  'date_ideas',
]);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function safeProfile(profile: Record<string, unknown> | null) {
  if (!profile) return null;
  return {
    id: profile.id,
    full_name: profile.full_name,
    age: profile.age,
    university: profile.university,
    level: profile.level,
    department: profile.department,
    faculty: profile.faculty,
    bio: profile.bio,
    interests: profile.interests,
    attraction_goal: profile.attraction_goal,
    intro_prompt: profile.intro_prompt,
    anthem: profile.anthem,
    location_status: profile.location_status,
    ai_verification_status: profile.ai_verification_status,
  };
}

function taskPrompt(task: string, me: unknown, target: unknown, context: Record<string, unknown>) {
  const base = [
    'You are the AI wingmate and safety-aware campus dating assistant for The College Date.',
    'Be warm, specific, short, and natural. Avoid manipulative, sexual, insulting, or unsafe advice.',
    'Never invent private facts. Keep everything suitable for adults 18+.',
    'Return JSON only.',
  ];

  const payload = `Current user: ${JSON.stringify(me)}\nTarget/context: ${JSON.stringify(target)}\nExtra context: ${JSON.stringify(context)}`;

  if (task === 'profile_coach') {
    return [
      ...base,
      'Task: Give practical profile improvements.',
      'JSON schema: {"summary":"one sentence","bio_suggestion":"rewritten bio under 280 chars","photo_tips":["tip"],"prompt_ideas":["prompt"],"priority_actions":["action"]}',
      payload,
    ].join('\n');
  }

  if (task === 'conversation_opener') {
    return [
      ...base,
      'Task: Generate first-message openers for this target profile.',
      'JSON schema: {"openers":["message"],"why_it_works":"short reason"}',
      payload,
    ].join('\n');
  }

  if (task === 'smart_reply') {
    return [
      ...base,
      'Task: Suggest replies to the latest chat. Match the user tone, do not be clingy.',
      'JSON schema: {"replies":["reply"],"tone_tip":"short tip"}',
      payload,
    ].join('\n');
  }

  if (task === 'compatibility') {
    return [
      ...base,
      'Task: Explain why these two profiles may or may not be compatible.',
      'JSON schema: {"score":0-100,"highlights":["highlight"],"watchouts":["watchout"],"best_opener":"message"}',
      payload,
    ].join('\n');
  }

  return [
    ...base,
    'Task: Suggest campus-friendly date ideas. Keep them safe, low-pressure, and realistic.',
    'JSON schema: {"ideas":[{"title":"idea","why":"short why","cost":"low|medium|free"}],"safety_note":"short note"}',
    payload,
  ].join('\n');
}

async function callOpenRouter(prompt: string) {
  const apiKey = Deno.env.get('OPENROUTER_API_KEY');
  const model = Deno.env.get('OPENROUTER_ASSISTANT_MODEL') ||
    Deno.env.get('OPENROUTER_PROFILE_REVIEW_MODEL') ||
    'openai/gpt-4o-mini';

  if (!apiKey) {
    return {
      provider: 'placeholder',
      model: 'local-placeholder',
      result: {
        summary: 'AI assistant is wired, but the OpenRouter key is not configured yet.',
        suggestions: [],
      },
    };
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://www.thecollegedate.com',
      'X-Title': 'The College Date',
    },
    body: JSON.stringify({
      model,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 650,
    }),
  });

  const raw = await response.json();
  if (!response.ok) {
    throw new Error(raw?.error?.message || 'OpenRouter request failed');
  }

  const content = raw?.choices?.[0]?.message?.content || '{}';
  return {
    provider: 'openrouter',
    model,
    result: JSON.parse(content),
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData?.user?.id) return jsonResponse({ error: 'Unauthorized' }, 401);

    const userId = authData.user.id;
    const body = await req.json().catch(() => ({}));
    const task = String(body.task || '');
    if (!TASKS.has(task)) return jsonResponse({ error: 'Unknown AI task' }, 400);

    const { data: me, error: meError } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (meError) throw meError;

    let target = body.targetProfile || null;
    if (body.targetProfileId) {
      const { data: targetProfile, error: targetError } = await adminClient
        .from('profiles')
        .select('*')
        .eq('id', body.targetProfileId)
        .maybeSingle();
      if (targetError) throw targetError;
      target = safeProfile(targetProfile);
    }

    const context = {
      draft: String(body.draft || '').slice(0, 800),
      recentMessages: Array.isArray(body.recentMessages)
        ? body.recentMessages.slice(-8).map((msg: Record<string, unknown>) => ({
            mine: msg.sender_id === userId,
            type: msg.type,
            content: String(msg.content || '').slice(0, 500),
          }))
        : [],
      reason: body.reason,
    };

    const prompt = taskPrompt(task, safeProfile(me), target, context);
    const { provider, model, result } = await callOpenRouter(prompt);

    await adminClient.from('ai_interactions').insert({
      user_id: userId,
      task,
      input_summary: JSON.stringify({
        targetProfileId: body.targetProfileId || target?.id || null,
        hasDraft: Boolean(body.draft),
        messageCount: context.recentMessages.length,
      }),
      result,
      provider,
      model,
    });

    return jsonResponse({ success: true, task, result });
  } catch (error) {
    console.error('ai-assistant error:', error);
    return jsonResponse({ success: false, error: error.message || 'AI assistant failed' }, 500);
  }
});
