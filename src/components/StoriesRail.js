'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';

export default function StoriesRail() {
    const { user } = useAuth();
    const [stories, setStories] = useState([]);
    const supabase = createClient();

    useEffect(() => {
        const fetchStories = async () => {
            if (!user) return;

            // Fetch profiles updated in last 24h with a status
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

            const { data } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url, status_text, status_updated_at')
                .neq('id', user.id) // Exclude self (shown in input)
                .not('status_text', 'is', null)
                .gt('status_updated_at', twentyFourHoursAgo)
                .limit(10);

            if (data) setStories(data);
        };

        fetchStories();

        // Optional: Realtime subscription could go here
    }, [user, supabase]);

    if (stories.length === 0) return null;

    return (
        <div style={{
            marginBottom: '24px',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            scrollbarWidth: 'none', // Hide scrollbar Firefox
            msOverflowStyle: 'none', // Hide scrollbar IE
            paddingBottom: '4px'
        }}>
            <div style={{ display: 'inline-flex', gap: '12px', paddingLeft: '4px' }}>
                {stories.map((story) => (
                    <div key={story.id} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        width: '72px',
                        cursor: 'pointer'
                    }}>
                        <div className="avatar-ring-gradient" style={{
                            width: '64px',
                            height: '64px',
                        }}>
                            <Image
                                src={story.avatar_url || '/default-avatar.png'}
                                alt={story.full_name}
                                width={64}
                                height={64}
                                style={{
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                }}
                            />
                        </div>
                        <span style={{
                            fontSize: '0.75rem',
                            marginTop: '4px',
                            color: 'var(--text-primary)',
                            maxWidth: '70px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            textAlign: 'center'
                        }}>
                            {story.full_name.split(' ')[0]}
                        </span>

                        {/* Tooltip-like Status Bubble */}
                        {/* In a real app, clicking might open a modal. 
                            Here we just show the user has a story. */}
                    </div>
                ))}
            </div>
        </div>
    );
}
