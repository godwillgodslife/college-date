import React, { useRef, useState, useEffect } from 'react';
import './ConfessionMediaEditorModal.css';

const STICKERS = ['🔥', '😂', '💘', '🎓', '👑', '👻', '👀', '🤫'];
const TEXT_COLORS = ['#ffffff', '#facc15', '#ec4899', '#38bdf8', '#4ade80'];

export default function ConfessionMediaEditorModal({ imageFile, onSave, onCancel }) {
    const canvasRef = useRef(null);
    const [aspectRatio, setAspectRatio] = useState('1:1'); // '1:1', '4:5', '16:9'
    const [captionText, setCaptionText] = useState('');
    const [textColor, setTextColor] = useState('#ffffff');
    const [selectedStickers, setSelectedStickers] = useState([]);
    const [imageObj, setImageObj] = useState(null);

    // Load file into an Image object
    useEffect(() => {
        if (!imageFile) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => setImageObj(img);
            img.src = e.target.result;
        };
        reader.readAsDataURL(imageFile);
    }, [imageFile]);

    // Redraw canvas whenever ratio, caption, color, or stickers change
    useEffect(() => {
        if (!imageObj || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        let targetW = 1080;
        let targetH = 1080;
        if (aspectRatio === '4:5') {
            targetW = 1080;
            targetH = 1350;
        } else if (aspectRatio === '16:9') {
            targetW = 1080;
            targetH = 608;
        }

        canvas.width = targetW;
        canvas.height = targetH;

        // Draw image covering the canvas (object-fit: cover)
        const imgRatio = imageObj.width / imageObj.height;
        const targetRatio = targetW / targetH;
        let sx = 0, sy = 0, sWidth = imageObj.width, sHeight = imageObj.height;

        if (imgRatio > targetRatio) {
            // image is wider than target
            sWidth = imageObj.height * targetRatio;
            sx = (imageObj.width - sWidth) / 2;
        } else {
            // image is taller than target
            sHeight = imageObj.width / targetRatio;
            sy = (imageObj.height - sHeight) / 2;
        }

        ctx.drawImage(imageObj, sx, sy, sWidth, sHeight, 0, 0, targetW, targetH);

        // Optional subtle bottom gradient for text contrast
        if (captionText || selectedStickers.length > 0) {
            const shadowGrad = ctx.createLinearGradient(0, targetH * 0.6, 0, targetH);
            shadowGrad.addColorStop(0, 'transparent');
            shadowGrad.addColorStop(1, 'rgba(0,0,0,0.65)');
            ctx.fillStyle = shadowGrad;
            ctx.fillRect(0, targetH * 0.6, targetW, targetH * 0.4);
        }

        // Draw caption text
        if (captionText.trim()) {
            ctx.save();
            ctx.font = 'bold 52px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Text shadow/stroke
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 6;
            ctx.strokeText(captionText.trim(), targetW / 2, targetH * 0.82);

            ctx.fillStyle = textColor;
            ctx.fillText(captionText.trim(), targetW / 2, targetH * 0.82);
            ctx.restore();
        }

        // Draw stickers along the top or bottom
        if (selectedStickers.length > 0) {
            ctx.save();
            ctx.font = '64px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const startX = targetW / 2 - ((selectedStickers.length - 1) * 80) / 2;
            selectedStickers.forEach((stk, i) => {
                ctx.fillText(stk, startX + i * 80, 100);
            });
            ctx.restore();
        }
    }, [imageObj, aspectRatio, captionText, textColor, selectedStickers]);

    const handleAddSticker = (emoji) => {
        if (selectedStickers.length < 5) {
            setSelectedStickers(prev => [...prev, emoji]);
        }
    };

    const handleClearStickers = () => {
        setSelectedStickers([]);
    };

    const handleApply = () => {
        if (!canvasRef.current) return;
        canvasRef.current.toBlob((blob) => {
            if (blob) {
                const editedFile = new File([blob], `confession_${Date.now()}.jpg`, { type: 'image/jpeg' });
                onSave(editedFile);
            }
        }, 'image/jpeg', 0.9);
    };

    return (
        <div className="editor-modal-overlay" onClick={onCancel}>
            <div className="editor-modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="editor-modal-header">
                    <h3>📷 Photo Editor</h3>
                    <button type="button" className="editor-close-btn" onClick={onCancel}>✕</button>
                </div>

                {/* Canvas Canvas Preview */}
                <div className="editor-preview-stage">
                    <canvas ref={canvasRef} className="editor-canvas" />
                </div>

                {/* Controls */}
                <div className="editor-controls-box">
                    {/* Aspect Ratio Row */}
                    <div className="editor-control-group">
                        <label>Crop / Aspect Ratio</label>
                        <div className="editor-btn-row">
                            {['1:1', '4:5', '16:9'].map((r) => (
                                <button
                                    key={r}
                                    type="button"
                                    className={`ratio-btn ${aspectRatio === r ? 'active' : ''}`}
                                    onClick={() => setAspectRatio(r)}
                                >
                                    {r === '1:1' ? 'Square 1:1' : r === '4:5' ? 'Portrait 4:5' : 'Wide 16:9'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Text Overlay */}
                    <div className="editor-control-group">
                        <label>Add Text Overlay</label>
                        <div className="editor-text-input-row">
                            <input
                                type="text"
                                className="editor-caption-input"
                                placeholder="Add bold text on photo..."
                                value={captionText}
                                onChange={(e) => setCaptionText(e.target.value)}
                                maxLength={40}
                            />
                            <div className="editor-color-pickers">
                                {TEXT_COLORS.map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        className={`color-pill ${textColor === c ? 'active' : ''}`}
                                        style={{ backgroundColor: c }}
                                        onClick={() => setTextColor(c)}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Emoji Stickers */}
                    <div className="editor-control-group">
                        <div className="stickers-header">
                            <label>Emoji Stickers ({selectedStickers.length}/5)</label>
                            {selectedStickers.length > 0 && (
                                <button type="button" className="btn-clear-stickers" onClick={handleClearStickers}>Clear</button>
                            )}
                        </div>
                        <div className="stickers-picker-row">
                            {STICKERS.map((stk) => (
                                <button
                                    key={stk}
                                    type="button"
                                    className="sticker-btn"
                                    onClick={() => handleAddSticker(stk)}
                                >
                                    {stk}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="editor-modal-footer">
                    <button type="button" className="editor-btn-cancel" onClick={onCancel}>
                        Discard
                    </button>
                    <button type="button" className="editor-btn-apply" onClick={handleApply}>
                        ✓ Attach to Post
                    </button>
                </div>
            </div>
        </div>
    );
}
