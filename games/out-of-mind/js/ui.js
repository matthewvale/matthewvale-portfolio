// Wires the page to the game: HUD, overlays, shrine, and keyboard, mouse and touch input.
window.OutOfMind = window.OutOfMind || {};

(function (DC) {
    'use strict';

    const C = DC.Config;
    const Phase = DC.Phase;
    const Direction = DC.Direction;

    const SWIPE_DISTANCE = 24;
    const KEY_DIRECTIONS = Object.freeze({
        ArrowUp: Direction.North, KeyW: Direction.North,
        ArrowRight: Direction.East, KeyD: Direction.East,
        ArrowDown: Direction.South, KeyS: Direction.South,
        ArrowLeft: Direction.West, KeyA: Direction.West
    });

    class Ui {
        constructor(game, renderer, sound) {
            this.game = game;
            this.renderer = renderer;
            this.sound = sound;
            this.hudCache = {};
            this.confetti = [];
            this.confettiRunning = false;

            this.el = {
                canvas: document.getElementById('board'),
                level: document.getElementById('hud-level'),
                hp: document.getElementById('hud-hp'),
                gold: document.getElementById('hud-gold'),
                freeze: document.getElementById('hud-freeze'),
                light: document.getElementById('hud-light'),
                message: document.getElementById('message'),
                mute: document.getElementById('mute'),
                titleOverlay: document.getElementById('overlay-title'),
                shrineOverlay: document.getElementById('overlay-shrine'),
                overOverlay: document.getElementById('overlay-over'),
                titleBest: document.getElementById('title-best'),
                shrineGold: document.getElementById('shrine-gold'),
                shrineHpLabel: document.getElementById('shrine-hp-label'),
                shrineHpButton: document.getElementById('shrine-heal'),
                shrineFreezeLabel: document.getElementById('shrine-freeze-label'),
                shrineFreezeButton: document.getElementById('shrine-freeze'),
                shrineMessage: document.getElementById('shrine-message'),
                shrineFreezeRow: document.getElementById('shrine-freeze-row'),
                fx: document.getElementById('fx'),
                overReason: document.getElementById('over-reason'),
                overStats: document.getElementById('over-stats')
            };

            this.bindGameEvents();
            this.bindButtons();
            this.bindKeyboard();
            this.bindPointer();
            this.updateMuteButton();
            this.showPhase(game.phase);
        }

        // #region Public Methods

        // Called every frame; only touches the DOM when a value actually changes.
        updateHud() {
            const g = this.game;
            this.setText('level', `${g.level}`);
            this.setText('hp', `${Math.max(g.hp, 0)}/${C.MaxHp}`);
            this.setText('gold', `${g.gold}`);
            this.setText('freeze', `${g.charges}/${g.maxCharges}`);

            const light = g.lightState;
            if (this.hudCache.light !== light) {
                this.hudCache.light = light;
                this.el.light.dataset.state = light;
                this.el.light.setAttribute('aria-label', light === 'off' ? 'Light: blinking' : light === 'warn' ? 'Light: wavering' : 'Light: steady');
            }
        }

        // #endregion

        // #region Private Methods

        setText(key, value) {
            if (this.hudCache[key] === value) return;

            this.hudCache[key] = value;
            this.el[key].textContent = value;
        }

        bindGameEvents() {
            this.game.on((type, data) => {
                if (type === 'sound') this.sound.play(data);
                else if (type === 'message') this.showMessage(data.text, data.tone);
                else if (type === 'phase') this.showPhase(data);
            });
        }

        bindButtons() {
            document.getElementById('start').addEventListener('click', () => this.onStartPressed());
            document.getElementById('again').addEventListener('click', () => this.onStartPressed());
            document.getElementById('shrine-continue').addEventListener('click', () => this.game.leaveShrine());
            this.el.shrineHpButton.addEventListener('click', e => this.onShrinePressed(e, () => this.game.buyHeal(), this.healMaxed()));
            this.el.shrineFreezeButton.addEventListener('click', e => this.onShrinePressed(e, () => this.game.buyFreezeSlot(), this.freezeMaxed()));
            this.el.mute.addEventListener('click', () => this.onMutePressed());

            document.querySelectorAll('[data-dir]').forEach(button => {
                button.addEventListener('pointerdown', e => {
                    e.preventDefault();
                    this.sound.unlock();
                    this.game.move(Number(button.dataset.dir));
                });
            });
        }

        bindKeyboard() {
            document.addEventListener('keydown', e => {
                if (e.altKey || e.ctrlKey || e.metaKey) return;

                const dir = KEY_DIRECTIONS[e.code];
                if (dir !== undefined && this.game.isPlaying) {
                    e.preventDefault();
                    this.sound.unlock();
                    this.game.move(dir);
                    return;
                }

                if (e.code === 'KeyM') {
                    this.onMutePressed();
                    return;
                }

                const isConfirm = e.code === 'Enter' || e.code === 'Space';
                if (!isConfirm || e.target instanceof HTMLButtonElement) return;

                if (this.game.phase === Phase.Title || this.game.phase === Phase.Over) {
                    e.preventDefault();
                    this.onStartPressed();
                }
                else if (this.game.phase === Phase.Shrine) {
                    e.preventDefault();
                    this.game.leaveShrine();
                }
            });
        }

        // A tap on a ghost freezes it, a tap next to the player steps there, and a swipe moves.
        bindPointer() {
            const canvas = this.el.canvas;
            let start = null;

            canvas.addEventListener('pointerdown', e => {
                this.sound.unlock();
                start = { x: e.clientX, y: e.clientY };
            });

            canvas.addEventListener('pointerup', e => {
                if (!start || !this.game.isPlaying) return;

                const dx = e.clientX - start.x;
                const dy = e.clientY - start.y;
                start = null;

                if (Math.max(Math.abs(dx), Math.abs(dy)) >= SWIPE_DISTANCE) {
                    if (Math.abs(dx) > Math.abs(dy)) this.game.move(dx > 0 ? Direction.East : Direction.West);
                    else this.game.move(dy > 0 ? Direction.South : Direction.North);
                    return;
                }

                const rect = canvas.getBoundingClientRect();
                const cell = this.renderer.cellAt(e.clientX - rect.left, e.clientY - rect.top);
                if (cell < 0) return;
                if (this.game.toggleFreeze(cell)) return;

                const dir = this.adjacentDirection(cell);
                if (dir >= 0) this.game.move(dir);
            });

            canvas.addEventListener('pointercancel', () => { start = null; });
        }

        adjacentDirection(cell) {
            const w = this.game.world;
            for (let d = 0; d < 4; d++) {
                if (w.step(this.game.player, d) === cell) return d;
            }
            return -1;
        }

        onStartPressed() {
            this.sound.unlock();
            this.game.newRun();
        }

        onMutePressed() {
            this.sound.unlock();
            this.sound.toggleMute();
            this.updateMuteButton();
        }

        healMaxed() { return this.game.hp >= C.MaxHp; }
        freezeMaxed() { return this.game.maxCharges >= C.FreezeSlotsCap; }

        // A maxed upgrade turns its button into a coin toss.
        onShrinePressed(e, buy, maxed) {
            this.sound.unlock();
            const result = maxed ? this.game.tossCoin() : buy();
            if (result.celebrate) this.burstConfetti(e.currentTarget);
            this.onShrineResult(result);
        }

        onShrineResult(result) {
            this.el.shrineMessage.textContent = result.text;
            this.el.shrineMessage.dataset.tone = result.ok ? 'info' : 'danger';
            this.refreshShrine();
        }

        updateMuteButton() {
            const muted = this.sound.muted;
            this.el.mute.dataset.muted = muted ? 'true' : 'false';
            this.el.mute.setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound');
            this.el.mute.setAttribute('aria-pressed', muted ? 'true' : 'false');
        }

        showMessage(text, tone) {
            this.el.message.textContent = text;
            this.el.message.dataset.tone = tone;
        }

        showPhase(phase) {
            if (phase === Phase.Playing) this.sound.playMusic(1);
            else if (phase === Phase.Shrine) this.sound.playMusic(0.45);
            else this.sound.stopMusic();

            this.el.titleOverlay.hidden = phase !== Phase.Title;
            this.el.shrineOverlay.hidden = phase !== Phase.Shrine;
            this.el.overOverlay.hidden = phase !== Phase.Over;

            if (phase === Phase.Title) {
                const best = this.game.bestLevel;
                this.el.titleBest.textContent = best > 0 ? `Best: level ${best}` : '';
            }
            else if (phase === Phase.Shrine) {
                this.el.shrineMessage.textContent = 'The dark waits while you shop.';
                this.el.shrineMessage.dataset.tone = 'info';
                this.refreshShrine();
                document.getElementById('shrine-continue').focus({ preventScroll: true });
            }
            else if (phase === Phase.Over) {
                const g = this.game;
                this.el.overReason.textContent = g.deathReason || 'Taken by the dark.';
                this.el.overStats.textContent = `You reached level ${g.level} with ${g.gold} gold. Best: level ${g.bestLevel}.`;
                document.getElementById('again').focus({ preventScroll: true });
            }
        }

        refreshShrine() {
            const g = this.game;
            this.el.shrineGold.textContent = `You have ${g.gold} gold`;
            const tossLabel = 'Toss a coin to the shrine';
            const tossPrice = `${C.TossCost} gold`;
            const healMaxed = this.healMaxed();
            const freezeMaxed = this.freezeMaxed();

            this.el.shrineHpLabel.textContent = healMaxed ? tossLabel : `Restore 1 HP (${g.hp}/${C.MaxHp})`;
            this.el.shrineHpButton.textContent = healMaxed ? tossPrice : `${C.HealCost} gold`;
            this.el.shrineFreezeLabel.textContent = freezeMaxed ? tossLabel : `Extra freeze slot (${g.maxCharges}/${C.FreezeSlotsCap})`;
            this.el.shrineFreezeButton.textContent = freezeMaxed ? tossPrice : `${C.FreezeSlotCost} gold`;

            // With both upgrades maxed, one toss button is plenty.
            this.el.shrineFreezeRow.hidden = healMaxed && freezeMaxed;
            this.el.shrineHpButton.classList.toggle('toss', healMaxed);
            this.el.shrineFreezeButton.classList.toggle('toss', freezeMaxed);
        }

        // Confetti on its own canvas above the overlays, bursting from the pressed button.
        burstConfetti(button) {
            const fx = this.el.fx;
            const stage = fx.getBoundingClientRect();
            const from = button.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 3);
            if (fx.width !== Math.round(stage.width * dpr)) {
                fx.width = Math.round(stage.width * dpr);
                fx.height = Math.round(stage.height * dpr);
            }

            const x = from.left + from.width / 2 - stage.left;
            const y = from.top + from.height / 2 - stage.top;
            const colours = ['#ff8a1f', '#ff60ff', '#2BA5E2', '#f5c542', '#9ad8ff', '#3ddc97'];
            for (let i = 0; i < 80; i++) {
                const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
                const speed = 260 + Math.random() * 380;
                this.confetti.push({
                    x, y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    spin: (Math.random() - 0.5) * 14,
                    rotation: Math.random() * Math.PI,
                    size: 5 + Math.random() * 5,
                    colour: colours[i % colours.length],
                    life: 1.6 + Math.random() * 0.6
                });
            }

            if (this.confettiRunning) return;
            this.confettiRunning = true;
            let last = performance.now();
            const ctx = fx.getContext('2d');

            const step = now => {
                const dt = Math.min(0.05, (now - last) / 1000);
                last = now;
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                ctx.clearRect(0, 0, stage.width, stage.height);

                for (const p of this.confetti) {
                    p.vy += 900 * dt;
                    p.vx *= 0.99;
                    p.x += p.vx * dt;
                    p.y += p.vy * dt;
                    p.rotation += p.spin * dt;
                    p.life -= dt;

                    ctx.save();
                    ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
                    ctx.translate(p.x, p.y);
                    ctx.rotate(p.rotation);
                    ctx.fillStyle = p.colour;
                    ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
                    ctx.restore();
                }

                this.confetti = this.confetti.filter(p => p.life > 0 && p.y < stage.height + 40);
                if (this.confetti.length) {
                    requestAnimationFrame(step);
                    return;
                }

                ctx.clearRect(0, 0, stage.width, stage.height);
                this.confettiRunning = false;
            };
            requestAnimationFrame(step);
        }

        // #endregion
    }

    DC.Ui = Ui;
})(window.OutOfMind);
