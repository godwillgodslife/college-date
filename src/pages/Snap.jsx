import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom'; // Add useLocation
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { getReceivedSnaps, sendSnap, openSnap } from '../services/snapService';
import { getConversations } from '../services/chatService'; // To pick recipients
import LoadingSpinner from '../components/LoadingSpinner';
import './Snapshots.css'; // Re-use styling

export default function Snap() {
    const { currentUser } = useAuth();
    const { addToast } = useToast();

    const location = useLocation(); // Get location

    // State
    const [viewMode, setViewMode] = useState(location.state?.recipient ? 'camera' : 'inbox'); // Default to camera if recipient passed
    const [snaps, setSnaps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [friends, setFriends] = useState([]);

    // Camera/Upload State
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [selectedFriend, setSelectedFriend] = useState(location.state?.recipient ? { other_user: location.state.recipient } : null);
    const [sending, setSending] = useState(false);

    // Viewing State
    const [activeSnap, setActiveSnap] = useState(null);
    const [timeLeft, setTimeLeft] = useState(10);

    const fileInputRef = useRef(null);

    useEffect(() => {
        if (currentUser) {
            loadInbox();
            loadFriends();
        }
    }, [currentUser]);

    // Timer for active snap
    useEffect(() => {
        let timer;
        if (activeSnap && timeLeft > 0) {
            timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
        } else if (activeSnap && timeLeft === 0) {
            handleCloseSnap();
        }
        return () => clearTimeout(timer);
    }, [activeSnap, timeLeft]);

    const loadInbox = async () => {
        setLoading(true);
        const { data } = await getReceivedSnaps(currentUser.id);
        setSnaps(data || []);
        setLoading(false);
    };

    const loadFriends = async () => {
        const { data } = await getConversations(currentUser.id);
        setFriends(data || []);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSend = async () => {
        if (!selectedFile || !selectedFriend) return;

        setSending(true);
        const { error } = await sendSnap(currentUser.id, selectedFriend.other_user.id, selectedFile);

        if (error) {
            addToast('Failed to send snap', 'error');
        } else {
            addToast('Snap sent!', 'success');
            // Reset
            setSelectedFile(null);
            setPreviewUrl(null);
            setSelectedFriend(null);
            setViewMode('inbox');
        }
        setSending(false);
    };

    const handleOpenSnap = (snap) => {
        setActiveSnap(snap);
        setTimeLeft(10); // 10 seconds to view
    };

    const handleCloseSnap = async () => {
        if (!activeSnap) return;

        // Mark as opened in background
        await openSnap(activeSnap.id);

        // Remove from list
        setSnaps(prev => prev.filter(s => s.id !== activeSnap.id));
        setActiveSnap(null);
    };

    if (loading) return <LoadingSpinner fullScreen />;

    return (
        <div className="snap-page">
            {/* View Snap Overlay */}
            {activeSnap && (
                <div className="snap-viewer-overlay" onClick={handleCloseSnap}>
                    <div className="snap-timer-bar">
                        <div className="timer-fill" style={{ width: `${(timeLeft / 10) * 100}%` }}></div>
                    </div>
                    <img src={activeSnap.media_url} alt="Snap" className="snap-viewer-media" />
                    <div className="snap-sender-info">
                        <img src={activeSnap.sender?.avatar_url} alt="Sender" />
                        <span>{activeSnap.sender?.full_name}</span>
                    </div>
                </div>
            )}

            <header className="snap-header">
                <h1>👻 Snap</h1>
                <div className="snap-actions">
                    <button
                        className={`btn-snap-action ${viewMode === 'inbox' ? 'active' : ''}`}
                        onClick={() => setViewMode('inbox')}
                    >
                        📥 {snaps.length > 0 && <span className="badge">{snaps.length}</span>}
                    </button>
                    <button
                        className={`btn-snap-action ${viewMode === 'camera' ? 'active' : ''}`}
                        onClick={() => setViewMode('camera')}
                    >
                        📷
                    </button>
                </div>
            </header>

            <div className="snap-content">
                {viewMode === 'inbox' ? (
                    <div className="snap-inbox">
                        {snaps.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">📮</div>
                                <p>No new snaps.</p>
                                <button className="btn-primary" onClick={() => setViewMode('camera')}>
                                    Send a Snap
                                </button>
                            </div>
                        ) : (
                            <ul className="snap-list">
                                {snaps.map(snap => (
                                    <li key={snap.id} className="snap-item" onClick={() => handleOpenSnap(snap)}>
                                        <div className="snap-avatar-ring">
                                            <img src={snap.sender?.avatar_url || 'https://via.placeholder.com/40'} alt="Sender" />
                                        </div>
                                        <div className="snap-info">
                                            <span className="snap-sender">{snap.sender?.full_name}</span>
                                            <span className="snap-time">
                                                New Snap • {new Date(snap.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="snap-indicator">🔴</div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                ) : (
                    <div className="snap-compose">
                        {!previewUrl ? (
                            <div className="camera-placeholder" onClick={() => fileInputRef.current?.click()}>
                                <input
                                    type="file"
                                    hidden
                                    ref={fileInputRef}
                                    accept="image/*"
                                    capture="environment"
                                    onChange={handleFileSelect}
                                />
                                <div className="camera-icon">📸</div>
                                <p>Tap to take a photo or upload</p>
                            </div>
                        ) : (
                            <div className="snap-preview-container">
                                <img src={previewUrl} alt="Preview" className="snap-preview" />
                                <button className="btn-close-preview" onClick={() => {
                                    setPreviewUrl(null);
                                    setSelectedFile(null);
                                }}>&times;</button>

                                <div className="snap-send-controls">
                                    <select
                                        className="friend-selector"
                                        value={selectedFriend?.id || ''}
                                        onChange={(e) => {
                                            const friend = friends.find(f => f.id === e.target.value);
                                            setSelectedFriend(friend);
                                        }}
                                    >
                                        <option value="">Select Recipient...</option>
                                        {friends.map(f => (
                                            <option key={f.id} value={f.id}>{f.other_user?.full_name}</option>
                                        ))}
                                    </select>

                                    <button
                                        className="btn-send-snap"
                                        disabled={!selectedFriend || sending}
                                        onClick={handleSend}
                                    >
                                        {sending ? 'Sending...' : 'Send ➤'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
