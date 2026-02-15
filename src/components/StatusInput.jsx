import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { uploadStatusMedia, createStatus } from '../services/statusService';
import { useToast } from './Toast';
import LoadingSpinner from './LoadingSpinner';
import './StatusInput.css';

export default function StatusInput({ onStatusPosted }) {
    const { currentUser } = useAuth();
    const { addToast } = useToast();
    const fileInputRef = useRef(null);

    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [caption, setCaption] = useState('');
    const [loading, setLoading] = useState(false);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreview(URL.createObjectURL(selectedFile));
        }
    };

    const handleClear = () => {
        setFile(null);
        setPreview(null);
        setCaption('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) return;

        setLoading(true);
        try {
            // 1. Upload Media
            const { url, error: uploadError } = await uploadStatusMedia(file, currentUser.id);
            if (uploadError) throw new Error('Failed to upload media');

            // 2. Create Status Record
            const { error: createError } = await createStatus(currentUser.id, url, caption);
            if (createError) throw new Error('Failed to post status');

            addToast('Status posted successfully!', 'success');
            handleClear();
            if (onStatusPosted) onStatusPosted();

        } catch (err) {
            console.error(err);
            addToast(err.message || 'Something went wrong', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="status-input-container">
            {!preview ? (
                <div
                    className="status-upload-placeholder"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <span className="upload-icon">📸</span>
                    <p>Share a moment</p>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        hidden
                    />
                </div>
            ) : (
                <div className="status-preview-container">
                    <img src={preview} alt="Preview" className="status-preview-image" />
                    <button
                        className="btn-close-preview"
                        onClick={handleClear}
                        disabled={loading}
                    >
                        ×
                    </button>

                    <form onSubmit={handleSubmit} className="status-form">
                        <input
                            type="text"
                            className="status-caption-input"
                            placeholder="Add a caption..."
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            disabled={loading}
                        />
                        <button
                            type="submit"
                            className="btn btn-primary btn-sm"
                            disabled={loading}
                        >
                            {loading ? <LoadingSpinner size="small" color="white" /> : 'Post'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
