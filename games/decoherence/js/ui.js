// Wires the page to the game: HUD, overlays, shrine, and keyboard, mouse and touch input.
window.Decoherence = window.Decoherence || {};

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
            this.el.shrineHpButton.addEventListener('click', () => this.onShrineResult(this.game.buyHeal()));
            this.el.shrineFreezeButton.addEventListener('click', () => this.onShrineResult(this.game.buyFreezeSlot()));
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
            this.el.shrineHpLabel.textContent = `Restore 1 HP (${g.hp}/${C.MaxHp})`;
            this.el.shrineHpButton.textContent = g.hp >= C.MaxHp ? 'Full' : `${C.HealCost} gold`;
            this.el.shrineFreezeLabel.textContent = `Extra freeze slot (${g.maxCharges}/${C.FreezeSlotsCap})`;
            this.el.shrineFreezeButton.textContent = g.maxCharges >= C.FreezeSlotsCap ? 'Maxed' : `${C.FreezeSlotCost} gold`;
        }

        // #endregion
    }

    DC.Ui = Ui;
})(window.Decoherence);
