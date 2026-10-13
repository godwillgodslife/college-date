import { supabase } from '../lib/supabase';

export const REPORT_REASONS = [
    { id: 'child_safety', label: 'Child Safety / Underage Account', desc: 'Suspected minor under 18, child sexual abuse material (CSAM), or child exploitation (CSAE)' },
    { id: 'harassment', label: 'Harassment or Bullying', desc: 'Threats, abusive language, unwanted stalking' },
    { id: 'spam', label: 'Spam or Financial Scams', desc: 'Promoting products, advance fee fraud, suspicious links' },
    { id: 'impersonation', label: 'Fake Profile / Impersonation', desc: 'Using another person\'s photos or identity' },
    { id: 'sexual_misconduct', label: 'Sexual Misconduct or Nudity', desc: 'Non-consensual explicit content or solicitation' },
    { id: 'threats', label: 'Violence or Physical Threats', desc: 'Statements expressing intent to cause bodily harm' },
    { id: 'prohibited_services', label: 'Prohibited Marketplace Services', desc: 'Commercial sexual services or academic cheating' },
    { id: 'other', label: 'Other Harmful Behavior', desc: 'Any other violation of College Date community guidelines' },
];

/**
 * Submit a confidential moderation report.
 */
export async function submitUserReport({ reportedId, reason, description = '', contextType = 'chat', contextId = null }) {
    try {
        const { data, error } = await supabase.rpc('submit_user_report', {
            p_reported_id: reportedId,
            p_reason: reason,
            p_description: description,
            p_context_type: contextType,
            p_context_id: contextId
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Failed to submit report');

        return { success: true, reportId: data.report_id, message: data.message, error: null };
    } catch (err) {
        console.error('submitUserReport error:', err);
        return { success: false, error: err.message || 'Error submitting report' };
    }
}
