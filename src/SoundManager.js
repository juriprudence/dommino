// SoundManager.js - Utility for managing game audio
class SoundManager {
    constructor() {
        this.sounds = {
            theme: new Audio('/sounds/theme.mp3'), // Local theme
            click: new Audio('/sounds/click.mp3'), // Local click
            win: new Audio('/sounds/win.mp3') // Local win
        };

        // Configure theme for looping
        this.sounds.theme.loop = true;
        this.sounds.theme.volume = 0.05; // Set volume to 0.05 (5%) as requested

        this.isMuted = false;

        // Listeners for mute state from localStorage or global state
        const savedMute = localStorage.getItem('gameMuted');
        if (savedMute === 'true') {
            this.setMuted(true);
        }

        // Handle browser autoplay restrictions: play theme on first interaction
        const resumeAudio = () => {
            console.log("[SoundManager] User interacted, resuming audio...");
            if (!this.isMuted && this.sounds.theme.paused) {
                this.play('theme');
            }
            window.removeEventListener('click', resumeAudio);
            window.removeEventListener('touchstart', resumeAudio);
        };
        window.addEventListener('click', resumeAudio);
        window.addEventListener('touchstart', resumeAudio);
    }

    play(soundName) {
        console.log(`[SoundManager] Playing: ${soundName}`);
        if (this.isMuted) {
            console.log(`[SoundManager] ${soundName} is muted, skipping.`);
            return;
        }
        if (!this.sounds[soundName]) {
            console.error(`[SoundManager] Sound ${soundName} not found.`);
            return;
        }

        // For sound effects, reset to start if already playing
        if (soundName !== 'theme') {
            this.sounds[soundName].currentTime = 0;
        }

        this.sounds[soundName].play().then(() => {
            console.log(`[SoundManager] ${soundName} playing successfully.`);
        }).catch(e => {
            console.warn(`[SoundManager] ${soundName} play blocked or failed:`, e);

            // Fallback for theme
            if (soundName === 'theme' && !this.sounds.theme.src.startsWith('http')) {
                console.log("[SoundManager] Attempting fallback for theme sound...");
                this.sounds.theme.src = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
                this.sounds.theme.play().catch(e2 => console.error("[SoundManager] Theme fallback failed:", e2));
            }

            // Fallback for win sound if local fails
            if (soundName === 'win' && !this.sounds.win.src.startsWith('http')) {
                console.log("[SoundManager] Attempting fallback for win sound...");
                this.sounds.win.src = 'https://www.orangefreesounds.com/wp-content/uploads/2022/01/Game-victory-sound-effect.mp3';
                this.sounds.win.play().catch(e2 => console.error("[SoundManager] Fallback failed:", e2));
            }
        });
    }

    stop(soundName) {
        if (!this.sounds[soundName]) return;
        this.sounds[soundName].pause();
        this.sounds[soundName].currentTime = 0;
    }

    setMuted(muted) {
        this.isMuted = muted;
        localStorage.setItem('gameMuted', muted);

        Object.values(this.sounds).forEach(audio => {
            audio.muted = muted;
        });

        if (muted) {
            this.sounds.theme.pause();
        } else if (this.sounds.theme.paused) {
            // Resume theme if not muted
            this.play('theme');
        }
    }

    toggleMute() {
        this.setMuted(!this.isMuted);
        return this.isMuted;
    }
}

const instance = new SoundManager();
export default instance;
