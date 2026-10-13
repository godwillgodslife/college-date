import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { getFinderStatus, searchCampusByPhoto } from '../services/campusFinderService';
import { getAvatarUrl } from '../utils/profileData';
import './CampusFinderModal.css';

export default function CampusFinderModal({ isOpen, onClose, onSelectProfile }) {
    const { currentUser, userProfile } = useAuth();
    const { addToast } = useToast();

    const [step, setStep] = useState('intro'); // 'intro' | 'camera' | 'scanning' | 'match_found' | 'no_match' | 'error'
    const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back) | 'user' (front)
    const [statusData, setStatusData] = useState(null);
    const [matchedProfile, setMatchedProfile] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');

    const videoRef = useRef(null);
    const streamRef = useRef(null);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    }, []);

    // Fetch status on open
    useEffect(() => {
        if (isOpen && currentUser?.id) {
            setStep('intro');
            getFinderStatus(currentUser.id).then(({ data }) => {
                if (data) setStatusData(data);
            });
        } else {
            stopCamera();
        }
    }, [isOpen, currentUser?.id, stopCamera]);

    const startCamera = async (mode = facingMode) => {
        stopCamera();
        try {
            const constraints = {
                video: {
                    facingMode: mode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            setStep('camera');
        } catch (err) {
            console.warn('[CampusFinder] Camera error:', err);
            addToast('Camera permission required for Campus Finder', 'error');
            setErrorMessage('Could not access camera. Please check your camera permissions.');
            setStep('error');
        }
    };

    const toggleCamera = () => {
        const nextMode = facingMode === 'environment' ? 'user' : 'environment';
        setFacingMode(nextMode);
        startCamera(nextMode);
    };

    const handleCaptureAndSearch = async () => {
        if (!videoRef.current) return;

        try {
            const video = videoRef.current;
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const queryBase64 = canvas.toDataURL('image/jpeg', 0.88);
            stopCamera();
            setStep('scanning');

            const result = await searchCampusByPhoto({
                searcherId: currentUser.id,
                queryImageBase64: queryBase64,
                university: userProfile?.university
            });

            if (result.error) {
                if (result.rateLimited) {
                    setErrorMessage(result.error);
                    setStep('error');
                } else if (result.noCredits) {
                    setErrorMessage('You have used all your free Campus Finder searches. Please top up search credits.');
                    setStep('error');
                } else {
                    setErrorMessage(result.error);
                    setStep('error');
                }
                return;
            }

            if (result.data?.match) {
                setMatchedProfile(result.data.match);
                setStep('match_found');
            } else {
                setStep('no_match');
            }

            if (result.remainingCredits !== undefined && statusData) {
                setStatusData(prev => prev ? { ...prev, total_remaining: result.remainingCredits } : prev);
            }
        } catch (err) {
            console.error('[CampusFinder] Search flow error:', err);
            setErrorMessage('An unexpected error occurred. Please try again.');
            setStep('error');
        }
    };

    const handleModalClose = () => {
        stopCamera();
        onClose();
    };

    if (!isOpen) return null;

    const remainingSearches = statusData?.total_remaining ?? 2;

    return (
        <div className="campus-finder-backdrop" onClick={handleModalClose} role="dialog" aria-modal="true">
            <div className="campus-finder-modal" onClick={(e) => e.stopPropagation()}>
                <div className="campus-finder-header">
                    <div className="campus-finder-title">
                        <span>🔍</span>
                        <h2>Campus Finder</h2>
                    </div>
                    <button 
                        type="button" 
                        className="campus-finder-close-btn" 
                        onClick={handleModalClose}
                        aria-label="Close Campus Finder"
                    >
                        &times;
                    </button>
                </div>

                <div className="campus-finder-body">
                    {/* Step 1: Intro */}
                    {step === 'intro' && (
                        <>
                            <div className="campus-finder-intro-hero">
                                <div className="campus-finder-radar-icon">
                                    <span>📸</span>
                                </div>
                                <h3>Find someone you met on campus</h3>
                                <p>Take a clear photo and we'll check if an eligible, verified student on your campus has opted into Campus Finder.</p>
                            </div>

                            <div className="campus-finder-privacy-card">
                                <span className="icon">🛡️</span>
                                <div>
                                    <strong>NDPA Privacy Safeguard:</strong> Photos captured for discovery are processed ephemerally in RAM and immediately discarded. They are never saved to your gallery or shown to anyone.
                                </div>
                            </div>

                            <div className="campus-finder-credit-pill">
                                <span>Searches Available:</span>
                                <strong>⚡ {remainingSearches} {remainingSearches === 1 ? 'Search' : 'Searches'} Remaining</strong>
                            </div>

                            <button 
                                type="button" 
                                className="campus-finder-primary-btn"
                                onClick={() => startCamera()}
                            >
                                Open Camera
                            </button>
                        </>
                    )}

                    {/* Step 2: Camera Capture */}
                    {step === 'camera' && (
                        <>
                            <div className="campus-finder-camera-box">
                                <video ref={videoRef} className="campus-finder-video" autoPlay playsInline muted />
                                <div className="campus-finder-oval-guide" />
                            </div>

                            <div className="campus-finder-camera-controls">
                                <button 
                                    type="button" 
                                    className="campus-finder-flip-btn"
                                    onClick={toggleCamera}
                                    title="Flip Camera"
                                    aria-label="Flip Camera"
                                >
                                    🔄
                                </button>
                                <button 
                                    type="button" 
                                    className="campus-finder-shutter-btn"
                                    onClick={handleCaptureAndSearch}
                                    title="Scan Person"
                                    aria-label="Capture Photo"
                                />
                                <button 
                                    type="button" 
                                    className="campus-finder-flip-btn"
                                    onClick={() => {
                                        stopCamera();
                                        setStep('intro');
                                    }}
                                    title="Back"
                                    aria-label="Back"
                                >
                                    ✕
                                </button>
                            </div>
                        </>
                    )}

                    {/* Step 3: Scanning Animation */}
                    {step === 'scanning' && (
                        <div className="campus-finder-scanning-box">
                            <div className="campus-finder-pulse-circle">
                                <span>🔍</span>
                            </div>
                            <h3>Looking for a match…</h3>
                            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.88rem' }}>
                                Scanning eligible, opted-in students on {userProfile?.university || 'campus'}…
                            </p>
                        </div>
                    )}

                    {/* Step 4A: Confident Match Found */}
                    {step === 'match_found' && matchedProfile && (
                        <>
                            <div className="campus-finder-match-card">
                                <img 
                                    src={getAvatarUrl(matchedProfile) || matchedProfile.primary_photo || matchedProfile.avatar_url || 'https://via.placeholder.com/150'} 
                                    alt={matchedProfile.full_name} 
                                    className="campus-finder-match-avatar"
                                />
                                <h3 className="campus-finder-match-name">{matchedProfile.full_name}</h3>
                                <div className="campus-finder-match-uni">
                                    {matchedProfile.department ? `${matchedProfile.department} • ` : ''}
                                    {matchedProfile.level ? `${matchedProfile.level} Level` : matchedProfile.university}
                                </div>
                                <p style={{ fontSize: '0.85rem', color: '#4ade80', margin: 0 }}>
                                    ✓ Verified student on College Date
                                </p>
                            </div>

                            <button 
                                type="button" 
                                className="campus-finder-primary-btn"
                                onClick={() => {
                                    handleModalClose();
                                    if (onSelectProfile) onSelectProfile(matchedProfile);
                                }}
                            >
                                View Profile & Connect
                            </button>
                            <button 
                                type="button" 
                                className="campus-finder-secondary-btn"
                                onClick={() => setStep('intro')}
                            >
                                Search Another Person
                            </button>
                        </>
                    )}

                    {/* Step 4B: No Match Found (Anti-Enumeration) */}
                    {step === 'no_match' && (
                        <>
                            <div className="campus-finder-intro-hero">
                                <div className="campus-finder-radar-icon" style={{ borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                                    <span>🍃</span>
                                </div>
                                <h3>No confident match found</h3>
                                <p>Try taking another photo with better lighting, or explore verified singles around your campus.</p>
                            </div>

                            <button 
                                type="button" 
                                className="campus-finder-primary-btn"
                                onClick={() => startCamera()}
                            >
                                Try Another Photo
                            </button>
                            <button 
                                type="button" 
                                className="campus-finder-secondary-btn"
                                onClick={handleModalClose}
                            >
                                Done
                            </button>
                        </>
                    )}

                    {/* Step 4C: Error / Rate Limited */}
                    {step === 'error' && (
                        <>
                            <div className="campus-finder-intro-hero">
                                <div className="campus-finder-radar-icon" style={{ borderColor: '#f87171' }}>
                                    <span>⚠️</span>
                                </div>
                                <h3>Search Unavailable</h3>
                                <p>{errorMessage || 'Could not complete the search at this time.'}</p>
                            </div>

                            <button 
                                type="button" 
                                className="campus-finder-primary-btn"
                                onClick={() => setStep('intro')}
                            >
                                Back to Campus Finder
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
