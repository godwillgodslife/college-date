import { createClient } from '@supabase/supabase-js';
import { searchProfilesByName } from '../src/services/swipeService.js';
import { supabase } from '../src/lib/supabase.js';

async function main() {
    const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
        email: 'student.tester2026@gmail.com',
        password: 'CollegeDate2026!VerifiedPass'
    });
    if (authErr) throw authErr;
    console.log('Signed in as:', auth.user.email, auth.user.id);

    console.log('Testing searchProfilesByName("David")...');
    const resDavid = await searchProfilesByName('David', auth.user.id, null, { gender: 'All' });
    console.log('David results count:', resDavid.length);
    if (resDavid.length > 0) {
        console.log('First David:', resDavid[0].full_name);
    }

    console.log('Testing searchProfilesByName("Queen")...');
    const resQueen = await searchProfilesByName('Queen', auth.user.id, null, { gender: 'All' });
    console.log('Queen results count:', resQueen.length);
    if (resQueen.length > 0) {
        console.log('First Queen:', resQueen[0].full_name);
    }

    console.log('Testing searchProfilesByName("Khalil")...');
    const resKhalil = await searchProfilesByName('Khalil', auth.user.id, null, { gender: 'All' });
    console.log('Khalil results count:', resKhalil.length);
    if (resKhalil.length > 0) {
        console.log('First Khalil:', resKhalil[0].full_name);
    }
}

main().catch(console.error);
