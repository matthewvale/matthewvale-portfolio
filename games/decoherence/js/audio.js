// Every sound is synthesised with the Web Audio API, so there are no audio files to load.
window.Decoherence = window.Decoherence || {};

(function (DC) {
    'use strict';

    const MASTER_VOLUME = 0.6;

    class Sound {
        constructor() {
            this.context = null;
            this.muted = readMuted();
        }

        // #region Public Methods

        // Browsers only allow audio after a user gesture, so this is called from input handlers.
        unlock() {
            if (this.context) {
                if (this.context.state === 'suspended') this.context.resume();
                return;
            }

            const AudioContextType = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextType) return;

            try {
                this.context = new AudioContextType();
            } catch (err) {
                this.context = null;
                return;
            }
            this.initialiseGraph();
        }

        toggleMute() {
            this.muted = !this.muted;
            try { localStorage.setItem(DC.Config.MutedKey, this.muted ? '1' : '0'); } catch (err) { /* storage can be blocked */ }
            if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : MASTER_VOLUME, this.context.currentTime, 0.05);
            return this.muted;
        }

        play(name) {
            if (!this.context || this.muted) return;

            const effect = this.effects[name];
            if (effect) effect();
        }

        // amount is 0..1: how close the nearest unseen ghost is.
        setDread(amount, active) {
            if (!this.context) return;

            const t = this.context.currentTime;
            const k = amount * amount;
            this.droneGain.gain.setTargetAtTime(active ? 0.025 + 0.16 * k : 0, t, 0.3);
            this.droneFilter.frequency.setTargetAtTime(150 + 900 * k, t, 0.3);
        }

        // #endregion

        // #region Private Methods

        initialiseGraph() {
            const ctx = this.context;
            this.master = ctx.createGain();
            this.master.gain.value = this.muted ? 0 : MASTER_VOLUME;
            this.master.connect(ctx.destination);

            this.noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
            const data = this.noiseBuffer.getChannelData(0);
            for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

            this.droneFilter = ctx.createBiquadFilter();
            this.droneFilter.type = 'lowpass';
            this.droneFilter.frequency.value = 180;
            this.droneGain = ctx.createGain();
            this.droneGain.gain.value = 0;
            this.droneFilter.connect(this.droneGain);
            this.droneGain.connect(this.master);

            [55, 55.7, 82.4].forEach((frequency, k) => {
                const osc = ctx.createOscillator();
                osc.type = k === 2 ? 'sine' : 'sawtooth';
                osc.frequency.value = frequency;
                osc.connect(this.droneFilter);
                osc.start();
            });

            this.effects = {
                step: () => { this.noise(0.06, 0.18, 500 + Math.random() * 300); this.tone(85, 0.06, 'sine', 0.12); },
                bump: () => this.tone(70, 0.08, 'square', 0.06),
                gold: () => { this.tone(988, 0.09, 'triangle', 0.18); this.tone(1480, 0.22, 'triangle', 0.15, null, 0.07); },
                spike: () => { this.noise(0.18, 0.4, 2500, 'highpass'); this.tone(220, 0.25, 'sawtooth', 0.15, 60); },
                hurt: () => { this.tone(320, 0.5, 'sawtooth', 0.2, 70); this.noise(0.4, 0.25, 400, 'lowpass'); },
                blink: () => { this.tone(48, 0.45, 'sine', 0.45); this.noise(0.3, 0.12, 200, 'lowpass'); },
                tick: () => this.tone(1200, 0.04, 'square', 0.04),
                door: () => [523, 659, 784, 1047].forEach((f, k) => this.tone(f, 0.25, 'triangle', 0.14, null, k * 0.08)),
                freeze: () => { this.noise(0.35, 0.12, 7000, 'highpass'); [1760, 2349, 2637].forEach((f, k) => this.tone(f, 0.3, 'sine', 0.07, null, k * 0.04)); },
                thaw: () => { this.tone(1320, 0.2, 'sine', 0.1, 440); this.noise(0.2, 0.06, 2000); },
                deny: () => this.tone(180, 0.12, 'square', 0.06),
                crackle: () => this.noise(0.04, 0.05, 3500, 'highpass'),
                hiss: () => this.noise(0.25, 0.03, 6000, 'highpass'),
                wake: () => this.tone(110, 0.6, 'sine', 0.2, 55),
                buy: () => { this.tone(784, 0.08, 'triangle', 0.15); this.tone(1175, 0.12, 'triangle', 0.13, null, 0.06); this.tone(1568, 0.25, 'sine', 0.1, null, 0.12); },
                halloween: () => this.halloween(),
                death: () => { this.tone(220, 1.2, 'sawtooth', 0.2, 40); this.noise(1, 0.2, 300, 'lowpass'); }
            };
        }

        // A nod to Bach's Toccata in D minor on a spooky organ, resolving into a bright major fanfare,
        // then the browser's own voice wishes the player a happy Halloween.
        halloween() {
            const organ = (f, at, length, volume = 0.12) => {
                this.tone(f, length, 'sawtooth', volume * 0.5, null, at);
                this.tone(f * 2, length, 'square', volume * 0.25, null, at);
                this.tone(f / 2, length, 'sine', volume, null, at);
            };
            const toccata = [[880, 0.12], [784, 0.12], [880, 0.5], [784, 0.1], [698, 0.1], [659, 0.1], [587, 0.1], [554, 0.3], [587, 0.6]];
            let at = 0;
            for (const [f, length] of toccata) {
                organ(f, at, length + 0.05);
                at += length;
            }
            [587, 740, 880, 1175].forEach((f, k) => this.tone(f, 0.9, 'triangle', 0.13, null, at + 0.05 + k * 0.06));
            this.noise(0.6, 0.08, 6000, 'highpass');

            if (!('speechSynthesis' in window)) return;

            setTimeout(() => {
                if (this.muted) return;
                try {
                    const line = new SpeechSynthesisUtterance('Happy Halloween!');
                    line.pitch = 0.6;
                    line.rate = 0.85;
                    line.volume = 1;
                    window.speechSynthesis.cancel();
                    window.speechSynthesis.speak(line);
                } catch (err) { /* speech is a bonus, never required */ }
            }, (at + 0.4) * 1000);
        }

        tone(frequency, duration, type = 'sine', volume = 0.2, slideTo = null, delay = 0) {
            const ctx = this.context;
            const t = ctx.currentTime + delay;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(frequency, t);
            if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + duration);
            gain.gain.setValueAtTime(volume, t);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

            osc.connect(gain);
            gain.connect(this.master);
            osc.start(t);
            osc.stop(t + duration + 0.02);
        }

        noise(duration, volume = 0.2, frequency = 1000, type = 'bandpass') {
            const ctx = this.context;
            const t = ctx.currentTime;
            const source = ctx.createBufferSource();
            const filter = ctx.createBiquadFilter();
            const gain = ctx.createGain();

            source.buffer = this.noiseBuffer;
            filter.type = type;
            filter.frequency.value = frequency;
            gain.gain.setValueAtTime(volume, t);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

            source.connect(filter);
            filter.connect(gain);
            gain.connect(this.master);
            source.start(t);
            source.stop(t + duration + 0.02);
        }

        // #endregion
    }

    function readMuted() {
        try { return localStorage.getItem(DC.Config.MutedKey) === '1'; } catch (err) { return false; }
    }

    DC.Sound = Sound;
})(window.Decoherence);
