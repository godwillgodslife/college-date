import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSnapshots, uploadSnapshotMedia, createSnapshot, likeSnapshot, getHiddenContentCounts } from '../services/snapshotService';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import './Snapshots.css';

export default function Snapshots() {
    const { currentUser } = useAuth();
    const { addToast } = useToast();
    const fileInputRef = useRef(null);

    const [snapshots, setSnapshots] = useState([]);
    const [hiddenCount, setHiddenCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Upload state
    const [uploadFile, setUploadFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [description, setDescription] = useState('');
    const [uploading, setUploading] = useState(false);

    const loadSnapshots = async () => {
        setLoading(true);
        // 1. Get visible snapshots
        const { data, error } = await getSnapshots();
        if (error) {
            console.error('Failed to load snapshots:', error);
        } else {
            setSnapshots(data || []);
        }

        // 2. Get hidden counts
        if (currentUser) {
            const { data: counts } = await getHiddenContentCounts(currentUser.id);
            setHiddenCount(counts?.hidden_snapshots || 0);
        }

        setLoading(false);
    };

    useEffect(() => {
        loadSnapshots();
    }, []);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setUploadFile(file);
            setPreview(URL.createObjectURL(file));
            setShowModal(true);
        }
    };

    const handleUpload = async () => {
        if (!uploadFile) return;
        setUploading(true);
        try {
            const { url, error: uploadError } = await uploadSnapshotMedia(uploadFile, currentUser.id);
            if (uploadError) throw new Error('Failed to upload image');

            const { error: createError } = await createSnapshot(currentUser.id, url, description);
            if (createError) throw new Error('Failed to create snapshot');

            addToast('Snapshot shared successfully!', 'success');
            closeModal();
            loadSnapshots();
        } catch (err) {
            addToast(err.message, 'error');
        } finally {
            setUploading(false);
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setUploadFile(null);
        setPreview(null);
        setDescription('');
    };

    const handleLike = async (id) => {
        if (!currentUser) return;

        // Optimistic update
        setSnapshots(prev => prev.map(s =>
            s.id === id ? { ...s, likes_count: (s.likes_count || 0) + 1 } : s
        ));

        const { error } = await likeSnapshot(id, currentUser.id);
        if (error) {
            console.error('Like failed:', error);
        }
    };

    return (
        <div className="snapshots-page">
            <header className="snapshots-header">
                <h1>Campus Snapshots</h1>
                <button
                    className="btn-add-snapshot"
                    onClick={() => fileInputRef.current?.click()}
                >
                    + Add Snapshot
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    hidden
                />
            </header>

            {loading ? (
                <LoadingSpinner />
            ) : snapshots.length === 0 ? (
                <div className="no-snapshots">
                    <p>No snapshots yet. Be the first to post! 📸</p>
                </div>
            ) : (
                <div className="snapshots-grid">
                    {snapshots.map(snapshot => (
                        <div key={snapshot.id} className="snapshot-card animated fadeIn">
                            {/* ... existing snapshot card ... */}
                            <div className="snapshot-image-wrapper">
                                <img src={snapshot.media_url} alt="Snapshot" />
                                <div className="snapshot-overlay">
                                    <div className="snapshot-user">
                                        <img
                                            src={snapshot.profiles?.avatar_url || 'https://via.placeholder.com/30'}
                                            alt={snapshot.profiles?.full_name}
                                        />
                                        <span>{snapshot.profiles?.full_name}</span>
                                    </div>
                                    <button
                                        className="btn-like-snapshot"
                                        onClick={() => handleLike(snapshot.id)}
                                    >
                                        ❤️ {snapshot.likes_count || 0}
                                    </button>
                                </div>
                            </div>
                            {snapshot.description && (
                                <p className="snapshot-desc">{snapshot.description}</p>
                            )}
                        </div>
                    ))}

                    {hiddenCount > 0 && (
                        <div className="snapshot-card locked animated pulse infinite-once">
                            <div className="locked-image-placeholder">
                                <div className="locked-overlay-content">
                                    <span className="lock-emoji">🔒</span>
                                    <span className="lock-count">{hiddenCount} Locked Snapshots</span>
                                    <button className="btn-grid-unlock" onClick={() => window.location.href = '/discover'}>
                                        Unlock in Discover
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Upload Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content animated zoomIn">
                        <h2>New Snapshot</h2>
                        {preview && <img src={preview} alt="Preview" className="upload-preview" />}
                        <textarea
                            placeholder="Add a caption..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="snapshot-input"
                        />
                        <div className="modal-actions">
                            <button onClick={closeModal} className="btn-cancel" disabled={uploading}>Cancel</button>
                            <button onClick={handleUpload} className="btn-confirm" disabled={uploading}>
                                {uploading ? <LoadingSpinner size="small" color="white" /> : 'Post'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
