'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';

export default function StoriesFeed() {
    const { user } = useAuth();
    const [stories, setStories] = useState([]);
    const [viewingStory, setViewingStory] = useState(null); // User object being viewed
    const [activeSnapshots, setActiveSnapshots] = useState([]);
    const supabase = createClient();

    useEffect(() => {
        const fetchStories = async () => {
            if (!user) return;

            const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();

            // 1. Fetch Profiles with Status
            const { data: statusProfiles } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url, status_text, status_updated_at')
                .neq('id', user.id)
                .not('status_text', 'is', null)
                .gt('status_updated_at', fiveHoursAgo);

            // 2. Fetch Users with Snapshots (Group by user_id is tricky in basic supabase, so we fetch all valid snapshots)
            const { data: snapshots } = await supabase
                .from('snapshots')
                .select('user_id, id, media_url, media_type, caption, created_at, profiles(id, full_name, avatar_url)')
                .gt('expires_at', new Date().toISOString())
                .order('created_at', { ascending: true });

            // 3. Merge & Deduplicate
            const storyMap = new Map();

            // Process Statuses
            (statusProfiles || []).forEach(p => {
                storyMap.set(p.id, {
                    user: p,
                    type: 'status',
                    items: [{ type: 'text', content: p.status_text, time: p.status_updated_at }]
                });
            });

            // Process Snapshots
            (snapshots || []).forEach(s => {
                if (s.user_id === user.id) return; // Skip self

                const existing = storyMap.get(s.user_id) || {
                    user: s.profiles,
                    type: 'snapshot',
                    items: []
                };

                existing.type = 'snapshot'; // Snapshots take precedence visually (gradient ring)
                existing.items.push({
                    id: s.id,
                    type: 'image',
                    url: s.media_url,
                    caption: s.caption,
                    time: s.created_at
                });

                storyMap.set(s.user_id, existing);
            });

            setStories(Array.from(storyMap.values()));
        };

        fetchStories();
    }, [user, supabase]);

    const handleStoryClick = (story) => {
        setViewingStory(story);
        setActiveSnapshots(story.items);
    };

    if (stories.length === 0) return null;

    return (
        <>
            {/* Horizontal Feed */}
            <div style={{
                marginBottom: '24px',
                overflowX: 'auto',
                whiteSpace: 'nowrap',
                scrollbarWidth: 'none',
                paddingBottom: '4px'
            }}>
                <div style={{ display: 'inline-flex', gap: '12px', paddingLeft: '4px' }}>
                    {stories.map((story) => (
                        <div key={story.user.id}
                            onClick={() => handleStoryClick(story)}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                width: '72px',
                                cursor: 'pointer'
                            }}
                        >
                            <div className={story.type === 'snapshot' ? 'avatar-ring-gradient' : 'avatar-ring-status'} style={{
                                width: '68px',
                                height: '68px',
                                padding: '3px',
                                borderRadius: '50%',
                                background: story.type === 'status' ? 'var(--primary-glow)' : 'var(--gradient-primary)'
                            }}>
                                <Image
                                    src={story.user.avatar_url || '/default-avatar.png'}
                                    alt={story.user.full_name}
                                    width={62}
                                    height={62}
                                    style={{
                                        borderRadius: '50%',
                                        objectFit: 'cover',
                                        border: '3px solid var(--bg-primary)'
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
                                {story.user.full_name.split(' ')[0]}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Story Viewer Modal */}
            {viewingStory && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'black',
                    zIndex: 100,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                }}>
                    {/* Header */}
                    <div style={{
                        position: 'absolute',
                        top: 16,
                        left: 16,
                        zIndex: 101,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <Image
                            src={viewingStory.user.avatar_url || '/default-avatar.png'}
                            alt=""
                            width={40}
                            height={40}
                            style={{ borderRadius: '50%' }}
                        />
                        <span style={{ color: 'white', fontWeight: 'bold' }}>{viewingStory.user.full_name}</span>
                    </div>

                    <button
                        onClick={() => setViewingStory(null)}
                        style={{
                            position: 'absolute',
                            top: 16,
                            right: 16,
                            background: 'none',
                            border: 'none',
                            color: 'white',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            zIndex: 101
                        }}
                    >✕</button>

                    {/* Content */}
                    <div style={{ width: '100%', height: '80%', position: 'relative' }}>
                        {activeSnapshots.map((item, idx) => (
                            <div key={idx} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '100%',
                                flexDirection: 'column'
                            }}>
                                {item.type === 'image' ? (
                                    <>
                                        <div style={{ position: 'relative', width: '100%', height: '500px' }}>
                                            <Image
                                                src={item.url}
                                                alt="Story"
                                                fill
                                                style={{ objectFit: 'contain' }}
                                            />
                                        </div>
                                        {item.caption && (
                                            <p style={{
                                                color: 'white',
                                                marginTop: '16px',
                                                textAlign: 'center',
                                                background: 'rgba(0,0,0,0.5)',
                                                padding: '8px 16px',
                                                borderRadius: '20px'
                                            }}>
                                                {item.caption}
                                            </p>
                                        )}
                                    </>
                                ) : (
                                    <div style={{
                                        padding: '40px',
                                        textAlign: 'center',
                                        background: 'var(--gradient-primary)',
                                        borderRadius: 'var(--radius-lg)',
                                        maxWidth: '80%'
                                    }}>
                                        <p style={{ fontSize: '1.5rem', color: 'white', fontWeight: 'bold' }}>
                                            "{item.content}"
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}
