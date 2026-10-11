import { createClient } from '@supabase/supabase-js';
import { normalizeProfile, getProfilePhotos } from '../src/utils/profileData.js';

const SUPABASE_URL = 'https://gedoyoleoscgxgdqszzc.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZG95b2xlb3NjZ3hnZHFzenpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MjQ4ODcsImV4cCI6MjA4NjQwMDg4N30.pVnlTBOwxYSFgC0fQ2Wo1oEsrBWak6X2FBBeNGariys';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function testSearch(cleanTerm, currentUserId) {
    console.log(`\n=== Testing search for: "${cleanTerm}" ===`);
    let blockedIds = [];
    if (currentUserId) {
        try {
            const { data: blocks, error: bErr } = await supabase
                .from('user_blocks')
                .select('blocked_id, blocker_id')
                .or(`blocker_id.eq.${currentUserId},blocked_id.eq.${currentUserId}`);
            console.log('user_blocks error:', bErr);
            console.log('user_blocks result:', blocks);
            if (blocks) {
                blockedIds = blocks.map(b => b.blocker_id === currentUserId ? b.blocked_id : b.blocker_id);
            }
        } catch (blockErr) {
            console.warn('Error fetching blocks:', blockErr);
        }
    }

    const excludeList = [currentUserId, ...blockedIds].filter(Boolean);
    console.log('excludeList:', excludeList);

    const buildColumnFilters = (keyword) => [
        `full_name.ilike.%${keyword}%`,
        `username.ilike.%${keyword}%`,
        `university.ilike.%${keyword}%`,
        `faculty.ilike.%${keyword}%`,
        `department.ilike.%${keyword}%`
    ].join(',');

    const executeSearchQuery = async (filterString) => {
        let q = supabase
            .from('profiles')
            .select('*')
            .eq('is_shadow_banned', false)
            .eq('is_banned', false)
            .or(filterString)
            .limit(50);

        if (excludeList.length > 0) {
            q = q.not('id', 'in', `(${excludeList.join(',')})`);
        }

        return await q;
    };

    let { data, error } = await executeSearchQuery(buildColumnFilters(cleanTerm));
    console.log('Phase 1 error:', error);
    console.log('Phase 1 data count:', data?.length);

    const tokens = cleanTerm.split(' ').filter(w => w.length >= 2);
    if ((!data || data.length === 0) && tokens.length > 1) {
        console.log('Running phase 2 with tokens:', tokens);
        const multiFilter = tokens.map(t => buildColumnFilters(t)).join(',');
        const multiRes = await executeSearchQuery(multiFilter);
        console.log('Phase 2 data count:', multiRes.data?.length);
        if (multiRes.data && multiRes.data.length > 0) {
            const allTokenMatches = multiRes.data.filter(row => {
                const rowText = `${row.full_name || ''} ${row.username || ''} ${row.university || ''} ${row.faculty || ''} ${row.department || ''}`.toLowerCase();
                return tokens.every(token => rowText.includes(token.toLowerCase()));
            });
            data = allTokenMatches.length > 0 ? allTokenMatches : multiRes.data;
        }
    }

    const processed = (data || [])
        .filter(row => !row.is_shadow_banned && !row.is_banned)
        .map(row => {
            const normalized = normalizeProfile(row);
            return {
                ...normalized,
                profile_photos: getProfilePhotos(normalized)
            };
        })
        .filter(row => {
            const hasProfilePhotos = Array.isArray(row.profile_photos) && row.profile_photos.length > 0;
            const hasPhotos = Array.isArray(row.photos) && row.photos.length > 0;
            const hasAvatar = Boolean(row.avatar_url && row.avatar_url.trim());
            return hasProfilePhotos || hasPhotos || hasAvatar;
        });

    console.log('Processed profiles count:', processed.length);
    processed.slice(0, 5).forEach(p => console.log('  ->', p.full_name, `(${p.university})`));
}

async function main() {
    const { data: auth } = await supabase.auth.signInWithPassword({
        email: 'student.tester2026@gmail.com',
        password: 'CollegeDate2026!VerifiedPass'
    });
    const uid = auth.user.id;

    await testSearch('David', uid);
    await testSearch('Queen', uid);
    await testSearch('Prince', uid);
    await testSearch('Khalil', uid);
}

main().catch(console.error);
