const { createClient } = require('@supabase/supabase-js');
// Load .env.local if present
require('dotenv').config({ path: '.env.local' });

// Load environment variables if running locally with dotenv, or manually replace
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';

if (!SUPABASE_URL || !SERVICE_KEY || SUPABASE_URL.includes('YOUR_')) {
    console.error('Error: Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const UNIVERSITIES = [
    'University of Lagos (UNILAG)',
    'University of Ibadan (UI)',
    'Obafemi Awolowo University (OAU)',
    'University of Nigeria, Nsukka (UNN)',
    'Ahmadu Bello University (ABU)',
    'University of Benin (UNIBEN)',
    'University of Ilorin (UNILORIN)',
    'Covenant University',
    'Babcock University',
    'Lagos State University (LASU)',
];

const MALE_NAMES = [
    'Chinedu Okeke', 'Tunde Bakare', 'Emeka Nnamdi', 'Yusuf Ibrahim', 'David Adebayo',
    'Femi Falana', 'Kelechi Iheanacho', 'Musa Yar\'adua', 'Segun Odegbami', 'Victor Osimhen',
    'Samuel Chukwueze', 'Wilfred Ndidi', 'Alex Iwobi', 'Taiwo Awoniyi', 'Frank Onyeka'
];

const FEMALE_NAMES = [
    'Chioma Ajunwa', 'Funke Akindele', 'Ngozi Okonjo', 'Simi Ogunleye', 'Tiwa Savage',
    'Yemi Alade', 'Zainab Ahmed', 'Adesua Etomi', 'Genevieve Nnaji', 'Omotola Jalade',
    'Rita Dominic', 'Ini Edo', 'Mercy Johnson', 'Tonto Dikeh', 'Regina Daniels'
];

const generateUser = (gender, index) => {
    const name = gender === 'male' ? MALE_NAMES[index % MALE_NAMES.length] : FEMALE_NAMES[index % FEMALE_NAMES.length];
    // Ensure unique email
    const email = `${name.toLowerCase().replace(/ /g, '.').replace(/'/g, '')}${index}${Date.now().toString().slice(-4)}@example.com`;
    const age = Math.floor(Math.random() * (26 - 18 + 1)) + 18; // 18-26
    const uni = UNIVERSITIES[Math.floor(Math.random() * UNIVERSITIES.length)];

    // Use UI avatars for placeholder images based on name
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=256&length=2`;

    return {
        email,
        password: 'password123',
        full_name: name,
        gender,
        age,
        university: uni,
        bio: `Student at ${uni}. Loves music, movies, and good vibes. Swipe right!`,
        avatar_url: avatarUrl,
        role: 'user',
        free_swipes_remaining: gender === 'male' ? 3 : 0,
        is_verified: Math.random() > 0.3,
    };
};

async function seed() {
    console.log('🌱 Starting seed...');

    // Create 15 male users
    for (let i = 0; i < 15; i++) {
        const user = generateUser('male', i);
        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: user.email,
            password: user.password,
            email_confirm: true,
            user_metadata: {
                full_name: user.full_name,
                gender: user.gender,
                age: user.age,
                university: user.university,
            },
        });

        if (authError) {
            console.error(`Error creating male user ${i}:`, authError.message);
            continue;
        }

        if (authData.user) {
            // Create profile (trigger might handle this, but explicit insert is safer if trigger not set up)
            // Check if profile exists first (trigger)
            const { data: existing } = await supabase.from('profiles').select('id').eq('id', authData.user.id).single();

            if (!existing) {
                const { error: profileError } = await supabase.from('profiles').insert({
                    id: authData.user.id,
                    email: user.email,
                    full_name: user.full_name,
                    gender: user.gender,
                    age: user.age,
                    university: user.university,
                    bio: user.bio,
                    avatar_url: user.avatar_url,
                    free_swipes_remaining: user.free_swipes_remaining,
                    is_verified: user.is_verified,
                });
                if (profileError) console.error(`Error creating profile for ${user.email}:`, profileError.message);
                else console.log(`Created male user: ${user.full_name}`);
            } else {
                console.log(`User ${user.full_name} created (profile via trigger?)`);
            }
        }
    }

    // Create 15 female users
    for (let i = 0; i < 15; i++) {
        const user = generateUser('female', i);
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: user.email,
            password: user.password,
            email_confirm: true,
            user_metadata: {
                full_name: user.full_name,
                gender: user.gender,
                age: user.age,
                university: user.university,
            },
        });

        if (authError) {
            console.error(`Error creating female user ${i}:`, authError.message);
            continue;
        }

        if (authData.user) {
            const { data: existing } = await supabase.from('profiles').select('id').eq('id', authData.user.id).single();

            if (!existing) {
                const { error: profileError } = await supabase.from('profiles').insert({
                    id: authData.user.id,
                    email: user.email,
                    full_name: user.full_name,
                    gender: user.gender,
                    age: user.age,
                    university: user.university,
                    bio: user.bio,
                    avatar_url: user.avatar_url,
                    free_swipes_remaining: user.free_swipes_remaining,
                    is_verified: user.is_verified,
                });

                if (profileError) {
                    console.error(`Error creating profile for ${user.email}:`, profileError.message);
                } else {
                    // Create wallet
                    await supabase.from('wallets').insert({ user_id: authData.user.id });
                    console.log(`Created female user: ${user.full_name} + wallet`);
                }
            } else {
                // Create wallet if not exists
                const { data: wallet } = await supabase.from('wallets').select('id').eq('user_id', authData.user.id).single();
                if (!wallet) {
                    await supabase.from('wallets').insert({ user_id: authData.user.id });
                }
                console.log(`Created female user: ${user.full_name}`);
            }
        }
    }

    console.log('✅ Seed completed!');
}

seed().catch(console.error);
