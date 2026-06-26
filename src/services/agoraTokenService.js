import { supabase } from '../lib/supabase';

export async function getAgoraCallToken({ roomID, userName, callType }) {
  const { data, error } = await supabase.functions.invoke('agora-call-token', {
    body: { roomID, userName, callType },
  });

  if (error) throw error;
  if (!data?.success || !data?.token || !data?.appID || !data?.channelName || !data?.userID) {
    throw new Error(data?.message || 'Call token service returned an invalid response.');
  }

  return data;
}
