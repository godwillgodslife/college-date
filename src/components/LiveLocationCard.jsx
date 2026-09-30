import { useState, useEffect } from 'react';
import { getActiveLiveLocation, stopLiveLocation } from '../services/locationService';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';
import './LiveLocationCard.css';

export default function LiveLocationCard({ matchId, message, currentUserId, isSender }) {
    const sessionId = message.metadata?.live_location_id;
    const [locationSession, setLocationSession] = useState(null);
    const [timeLeft, setTimeLeft] = useState('');
    const [isStopping, setIsStopping] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        let isMounted = true;

        const loadSession = async () => {
            if (sessionId) {
                const { data } = await supabase
                    .from('live_location_shares')
                    .select('*')
                    .eq('id', sessionId)
                    .maybeSingle();
                if (isMounted && data) setLocationSession(data);
            } else if (matchId) {
                const { data } = await getActiveLiveLocation(matchId);
                if (isMounted && data) setLocationSession(data);
            }
        };

        loadSession();

        // Realtime subscription on live location updates
        const channel = supabase
            .channel(`live_loc:${sessionId || matchId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'live_location_shares',
                    filter: sessionId ? `id=eq.${sessionId}` : `match_id=eq.${matchId}`
                },
                (payload) => {
                    if (isMounted) setLocationSession(payload.new);
                }
            )
            .subscribe();

        return () => {
            isMounted = false;
            supabase.removeChannel(channel);
        };
    }, [sessionId, matchId]);

    // Timer countdown
    useEffect(() => {
        if (!locationSession?.expires_at || !locationSession.is_active) {
            setTimeLeft('Ended');
            return;
        }

        const updateTimer = () => {
            const diff = new Date(locationSession.expires_at).getTime() - Date.now();
            if (diff <= 0) {
                setTimeLeft('Ended');
            } else {
                const mins = Math.floor(diff / 60000);
                const secs = Math.floor((diff % 60000) / 1000);
                setTimeLeft(`${mins}m ${secs}s`);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [locationSession]);

    const handleStopSharing = async () => {
        setIsStopping(true);
        try {
            const { success, error } = await stopLiveLocation(matchId);
            if (!success) throw new Error(error);
            addToast('Live location sharing stopped', 'info');
            setLocationSession(prev => prev ? { ...prev, is_active: false } : null);
        } catch (err) {
            addToast(err.message || 'Failed to stop live location', 'error');
        } finally {
            setIsStopping(false);
        }
    };

    const isLive = locationSession?.is_active && timeLeft !== 'Ended';
    const lat = locationSession?.latitude ?? 6.5244; // Default to Lagos coords if pending
    const lon = locationSession?.longitude ?? 3.3792;

    // OpenStreetMap static tile url
    const mapTileUrl = `https://static-maps.yandex.ru/1.x/?ll=${lon},${lat}&z=15&l=map&size=340,160&pt=${lon},${lat},pm2rdm`;

    return (
        <div className={`live-location-card ${isLive ? 'active-sharing' : 'ended-sharing'}`}>
            <div className="loc-card-header">
                <div className="loc-title-group">
                    <span className="loc-pin-icon">📍</span>
                    <div>
                        <span className="loc-card-title">{isLive ? 'Live Location Sharing' : 'Live Location Ended'}</span>
                        <span className="loc-status-sub">
                            {isLive ? `⚡ Live • ${timeLeft} remaining` : 'Sharing session terminated'}
                        </span>
                    </div>
                </div>
                {isLive && <span className="loc-live-indicator"><span className="pulse-dot" /> LIVE</span>}
            </div>

            <div className="loc-map-preview-container">
                <iframe
                    title="Live Location Map"
                    className="loc-map-iframe"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.005}%2C${lat - 0.005}%2C${lon + 0.005}%2C${lat + 0.005}&layer=mapnik&marker=${lat}%2C${lon}`}
                    loading="lazy"
                />
                <div className="loc-center-pin-overlay">
                    <div className="pin-pulse" />
                    <span className="pin-marker">📍</span>
                </div>
            </div>

            <div className="loc-card-footer">
                <div className="loc-coords-badge">
                    GPS: {lat.toFixed(4)}°, {lon.toFixed(4)}°
                    {locationSession?.accuracy && ` (±${Math.round(locationSession.accuracy)}m)`}
                </div>

                {isSender && isLive && (
                    <button
                        type="button"
                        className="btn-stop-sharing"
                        onClick={handleStopSharing}
                        disabled={isStopping}
                    >
                        {isStopping ? 'Stopping...' : 'Stop Sharing'}
                    </button>
                )}
            </div>
        </div>
    );
}
