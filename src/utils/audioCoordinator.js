/**
 * AudioCoordinator
 * Coordinates audio playback across the app so only ONE voice note/audio stream
 * can play at any given time. Starting any audio immediately pauses and resets
 * any previously active audio element.
 */
class AudioCoordinator {
    constructor() {
        this.activeAudio = null;
        this.activeResetCallback = null;
    }

    /**
     * Registers and plays an audio element, stopping any previously playing audio.
     * @param {HTMLAudioElement} audioElement 
     * @param {Function} [onStop] - Callback invoked when this audio is stopped by another audio
     */
    play(audioElement, onStop = null) {
        if (this.activeAudio && this.activeAudio !== audioElement) {
            try {
                this.activeAudio.pause();
            } catch (err) {
                console.warn('[AudioCoordinator] Failed to pause previous audio:', err);
            }
            if (typeof this.activeResetCallback === 'function') {
                try {
                    this.activeResetCallback();
                } catch (err) {
                    console.warn('[AudioCoordinator] Error in reset callback:', err);
                }
            }
        }

        this.activeAudio = audioElement;
        this.activeResetCallback = onStop;
    }

    /**
     * Explicitly unregisters an audio element if it was the active one.
     * @param {HTMLAudioElement} audioElement 
     */
    stop(audioElement) {
        if (this.activeAudio === audioElement) {
            this.activeAudio = null;
            this.activeResetCallback = null;
        }
    }

    /**
     * Gets currently active audio element.
     */
    getActiveAudio() {
        return this.activeAudio;
    }

    /**
     * Pauses whatever audio is currently playing across the app.
     */
    stopAll() {
        if (this.activeAudio) {
            try {
                this.activeAudio.pause();
            } catch (err) {
                // ignore
            }
            if (typeof this.activeResetCallback === 'function') {
                try {
                    this.activeResetCallback();
                } catch (err) {
                    // ignore
                }
            }
            this.activeAudio = null;
            this.activeResetCallback = null;
        }
    }
}

export const audioCoordinator = new AudioCoordinator();
export default audioCoordinator;
