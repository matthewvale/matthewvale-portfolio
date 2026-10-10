// Background music: an original, looping spooky-comedy tune. A plucked harpsichord carries a
// minor-key melody over a bouncing chiptune bass, with finger snaps on the off-beats.
// Everything is synthesised and scheduled ahead of time on the audio clock so it never drifts.
window.OutOfMind = window.OutOfMind || {};

(function (DC) {
    'use strict';

    const BPM = 132;
    const STEP_SECONDS = 60 / BPM / 2;          // one step is an eighth note
    const STEPS_PER_BAR = 8;
    const LOOKAHEAD_SECONDS = 0.15;
    const SCHEDULER_MS = 25;
    const FULL_LEVEL = 0.24;

    // #region Score

    // Eight bars in D minor, one MIDI note (or null for a rest) per eighth.
    const MELODY = [
        69, null, 65, 62, 64, 65, 67, null,      // Dm
        69, null, 74, null, 72, 70, 69, null,    // Dm
        70, null, 67, 62, 65, 67, 70, null,      // Gm
        73, null, 69, 64, 67, null, 61, null,    // A7
        74, null, 77, 74, 69, null, 65, null,    // Dm
        70, 72, 74, null, 77, null, 74, null,    // Bb
        70, null, 67, null, 73, 72, 71, 70,      // Gm, then a sly chromatic slide over A7
        69, null, null, null, 62, null, null, null // Dm
    ];

    // Bass root for each half bar; the bass hops between root and octave on every eighth.
    const BASS_ROOTS = [38, 38, 38, 38, 43, 43, 45, 45, 38, 38, 46, 46, 43, 45, 38, 38];

    // #endregion

    class Music {
        constructor(context, destination, noiseBuffer) {
            this.context = context;
            this.noiseBuffer = noiseBuffer;
            this.output = context.createGain();
            this.output.gain.value = 0;
            this.output.connect(destination);
            this.timer = null;
            this.step = 0;
            this.nextStepTime = 0;
        }

        // #region Public Methods

        start(level = 1) {
            this.setLevel(level);
            if (this.timer) return;

            this.step = 0;
            this.nextStepTime = this.context.currentTime + 0.05;
            this.timer = setInterval(() => this.schedule(), SCHEDULER_MS);
        }

        stop() {
            this.setLevel(0);
            if (!this.timer) return;

            clearInterval(this.timer);
            this.timer = null;
        }

        setLevel(level) {
            this.output.gain.setTargetAtTime(FULL_LEVEL * level, this.context.currentTime, 0.4);
        }

        // #endregion

        // #region Private Methods

        schedule() {
            const now = this.context.currentTime;

            // A throttled background tab can leave the clock far behind; skip ahead rather than burst.
            if (this.nextStepTime < now - 0.2) this.nextStepTime = now + 0.05;

            while (this.nextStepTime < now + LOOKAHEAD_SECONDS) {
                this.playStep(this.step, this.nextStepTime);
                this.step = (this.step + 1) % MELODY.length;
                this.nextStepTime += STEP_SECONDS;
            }
        }

        playStep(step, time) {
            const inBar = step % STEPS_PER_BAR;
            const root = BASS_ROOTS[Math.floor(step / (STEPS_PER_BAR / 2))];

            this.bass(midiToHz(inBar % 2 === 0 ? root : root + 12), time);
            if (MELODY[step] !== null) this.harpsichord(midiToHz(MELODY[step]), time);
            if (inBar === 2 || inBar === 6) this.snap(time);
            if (inBar % 2 === 1) this.hat(time);
        }

        harpsichord(frequency, time) {
            const ctx = this.context;
            const filter = ctx.createBiquadFilter();
            const gain = ctx.createGain();
            filter.type = 'lowpass';
            filter.frequency.value = 3200;
            gain.gain.setValueAtTime(0.0001, time);
            gain.gain.exponentialRampToValueAtTime(0.32, time + 0.005);
            gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.4);

            for (const [type, multiple, level] of [['sawtooth', 1, 0.6], ['square', 2, 0.25]]) {
                const osc = ctx.createOscillator();
                const voice = ctx.createGain();
                osc.type = type;
                osc.frequency.value = frequency * multiple;
                voice.gain.value = level;
                osc.connect(voice);
                voice.connect(filter);
                osc.start(time);
                osc.stop(time + 0.45);
            }
            filter.connect(gain);
            gain.connect(this.output);
        }

        bass(frequency, time) {
            const ctx = this.context;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.value = frequency;
            gain.gain.setValueAtTime(0.16, time);
            gain.gain.setValueAtTime(0.16, time + STEP_SECONDS * 0.7);
            gain.gain.exponentialRampToValueAtTime(0.0001, time + STEP_SECONDS * 0.95);
            osc.connect(gain);
            gain.connect(this.output);
            osc.start(time);
            osc.stop(time + STEP_SECONDS);
        }

        snap(time) {
            this.noiseHit(time, 0.06, 0.5, 2600, 'bandpass');
        }

        hat(time) {
            this.noiseHit(time, 0.025, 0.08, 8000, 'highpass');
        }

        noiseHit(time, duration, volume, frequency, type) {
            const ctx = this.context;
            const source = ctx.createBufferSource();
            const filter = ctx.createBiquadFilter();
            const gain = ctx.createGain();
            source.buffer = this.noiseBuffer;
            filter.type = type;
            filter.frequency.value = frequency;
            gain.gain.setValueAtTime(volume, time);
            gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
            source.connect(filter);
            filter.connect(gain);
            gain.connect(this.output);
            source.start(time, Math.random() * 0.5);
            source.stop(time + duration + 0.02);
        }

        // #endregion
    }

    function midiToHz(note) {
        return 440 * Math.pow(2, (note - 69) / 12);
    }

    DC.Music = Music;
})(window.OutOfMind);
