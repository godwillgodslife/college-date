import React, { useEffect, useRef, useState } from 'react';
import campusWelcomeVideo from '../assets/campus-welcome-bg.mp4';
import storyUnilagCouple from '../assets/story-unilag-couple.jpg';

/**
 * Android-Only Welcome / Landing Screen Background Video Layer.
 * Renders a subtle, premium, looping cinematic video of authentic Nigerian campus life.
 * Equipped with instant poster fallback, memory-safe lifecycle cleanup,
 * and adaptive dark gradient overlay ensuring 100% UI readability.
 */
export default function AndroidWelcomeBackground() {
  const videoRef = useRef(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [playbackFailed, setPlaybackFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let isMounted = true;

    // Immediately trigger muted inline playback
    const startPlayback = async () => {
      try {
        if (video.paused && isMounted) {
          await video.play();
        }
      } catch (err) {
        console.warn('[AndroidWelcomeBackground] Autoplay restricted or deferred:', err);
        if (isMounted) {
          setPlaybackFailed(true);
        }
      }
    };

    startPlayback();

    // App background / foreground lifecycle management
    // Ensures video decoder releases CPU/GPU resources when app is minimized
    const handleVisibilityChange = () => {
      if (!video) return;
      if (document.visibilityState === 'hidden') {
        video.pause();
      } else if (document.visibilityState === 'visible') {
        video.play().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Immediately release video hardware decode resources on Android
      try {
        video.pause();
        video.removeAttribute('src');
        video.load();
      } catch (e) {
        // Safe swallow of cleanup errors
      }
    };
  }, []);

  return (
    <div className="landing-bg" aria-hidden="true">
      {/* 1. Static Poster / Fallback Layer (Instant cold-boot display) */}
      <img
        src={storyUnilagCouple}
        alt=""
        className="landing-bg-poster"
        loading="eager"
      />

      {/* 2. Hardware-Accelerated Looping Video Layer */}
      {!playbackFailed && (
        <video
          ref={videoRef}
          src={campusWelcomeVideo}
          poster={storyUnilagCouple}
          autoPlay
          muted
          loop
          playsInline
          webkit-playsinline="true"
          preload="auto"
          onPlaying={() => setVideoLoaded(true)}
          onError={() => setPlaybackFailed(true)}
          className={`landing-bg-video ${videoLoaded ? 'is-visible' : ''}`}
        />
      )}

      {/* 3. Adaptive Dark Gradient Overlay for brand Obsidian canvas & crisp text contrast */}
      <div className="landing-bg-overlay" />

      {/* 4. Signature Brand Ambient Floating Glow Orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
    </div>
  );
}
