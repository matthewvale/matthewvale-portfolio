// Game rules: light collapses the world, the unseen forgets itself, ghosts move only in the dark.
// The game knows nothing about the DOM or canvas; it announces what happened through events.
window.OutOfMind = window.OutOfMind || {};

(function (DC) {
    'use strict';

    const C = DC.Config;
    const Socket = DC.Socket;

    const Phase = Object.freeze({ Title: 'title', Playing: 'playing', Shrine: 'shrine', Over: 'over' });
    const Item = Object.freeze({ Gold: 'gold', Spike: 'spike', Freeze: 'freeze', Pumpkin: 'pumpkin' });

    class Game {
        constructor(random = Math.random) {
            this.random = random;
            this.world = new DC.World(C.GridWidth, C.GridHeight);
            this.items = new Array(this.world.size).fill(null);
            this.seen = new Float64Array(this.world.size);
            this.noItem = new Uint8Array(this.world.size);
            this.listeners = [];

            this.phase = Phase.Title;
            this.time = 0;
            this.level = 1;
            this.hp = C.StartHp;
            this.gold = 0;
            this.charges = 0;
            this.maxCharges = C.FreezeSlotsStart;
            this.ghosts = [];
            this.hurtAt = -Infinity;
            this.celebrateAt = -Infinity;
            this.shatterAt = -Infinity;
            this.shatterCell = 0;
            this.celebrateCell = 0;
            this.bestLevel = readBestLevel();

            this.startLevel();
        }

        // #region Public Properties

        get isPlaying() { return this.phase === Phase.Playing; }

        // 'off' during a blink, 'warn' when a blink is coming, otherwise 'on'.
        get lightState() {
            if (this.dark) return 'off';
            if (this.isPlaying && this.armed && C.StillMs - (this.time - this.stillSince) < C.WarnMs) return 'warn';
            return 'on';
        }

        // 0..1, how close the nearest ghost you can't see is.
        get dread() {
            if (!this.isPlaying || !this.armed) return 0;

            let nearest = Infinity;
            for (const ghost of this.ghosts) {
                if (!this.isObserved(ghost)) nearest = Math.min(nearest, this.manhattan(ghost.cell, this.player));
            }
            return Math.max(0, 1 - (nearest - 1) / 7);
        }

        // #endregion

        // #region Public Methods

        on(listener) { this.listeners.push(listener); }

        newRun() {
            this.level = 1;
            this.hp = C.StartHp;
            this.gold = 0;
            this.maxCharges = C.FreezeSlotsStart;
            this.setPhase(Phase.Playing);
            this.startLevel();
            this.say('Move when ready. Nothing stirs until you do.');
        }

        tick(dt) {
            this.time += dt;
            if (!this.isPlaying) return;

            if (!this.armed) {
                this.refreshWorld();
                return;
            }

            if (this.dark && this.time - this.blinkAt > C.BlinkMs) this.dark = false;

            const untilBlink = C.StillMs - (this.time - this.stillSince);
            if (!this.dark && untilBlink <= 0) {
                this.blink();
                if (!this.isPlaying) return;
            }
            else if (!this.dark && untilBlink < C.WarnMs) {
                this.warnBlink(untilBlink);
            }

            const changes = this.refreshWorld();
            if (changes.collapsed && this.time - this.lastCrackleAt > 60) {
                this.lastCrackleAt = this.time;
                this.sound('crackle');
            }
            if (changes.forgotten && this.time - this.lastHissAt > 300) {
                this.lastHissAt = this.time;
                this.sound('hiss');
            }

            if (this.time - this.lastGhostStep > this.ghostStepMs()) {
                this.lastGhostStep = this.time;
                this.stepGhosts();
            }
        }

        move(dir) {
            if (!this.isPlaying) return;

            if (!this.world.isOpen(this.player, dir)) {
                this.sound('bump');
                return;
            }

            const next = this.world.step(this.player, dir);
            if (next < 0) return;

            if (!this.armed) {
                this.armed = true;
                this.lastGhostStep = this.time;
                this.say('The dark wakes up.');
                this.sound('wake');
            }
            this.stillSince = this.time;
            this.warned = false;
            this.dark = false;

            const ghostIndex = this.ghostAt(next);
            if (ghostIndex >= 0) {
                if (!this.ghosts[ghostIndex].frozen) {
                    this.hurtByGhost(ghostIndex, 'You walked into a ghost.');
                    return;
                }
                this.shatter(ghostIndex);
            }

            this.player = next;
            this.sound('step');
            this.pickUp(next);
            if (!this.isPlaying) return;

            if (next === this.exit) {
                this.level++;
                this.sound('door');
                this.setPhase(Phase.Shrine);
                this.say('You found the door. Rest at the shrine.');
                return;
            }

            this.refreshWorld();
        }

        // Tapping a ghost freezes it; tapping a frozen ghost thaws it and refunds the charge.
        toggleFreeze(cell) {
            if (!this.isPlaying) return false;

            const index = this.ghostAt(cell);
            if (index < 0) return false;

            const ghost = this.ghosts[index];
            if (ghost.frozen) {
                ghost.frozen = false;
                this.charges = Math.min(this.maxCharges, this.charges + 1);
                this.sound('thaw');
                this.say('Ghost thawed. Freeze returned.');
                return true;
            }

            if (!this.isLit(cell)) {
                this.deny('You can only freeze a ghost you can see.');
                return true;
            }
            if (this.charges <= 0) {
                this.deny('No freezes. Find a snowflake to pick one up.');
                return true;
            }

            ghost.frozen = true;
            this.charges--;
            this.sound('freeze');
            this.say('Ghost frozen. It stays put, even in the dark.');
            return true;
        }

        buyHeal() {
            if (this.hp >= C.MaxHp) return this.refuse(`Health is already at the maximum of ${C.MaxHp}.`);
            if (this.gold < C.HealCost) return this.refuse('Not enough gold.');

            this.gold -= C.HealCost;
            this.hp++;
            this.sound('buy');
            return { ok: true, text: 'Restored 1 HP.' };
        }

        buyFreezeSlot() {
            if (this.maxCharges >= C.FreezeSlotsCap) return this.refuse(`You already hold the maximum of ${C.FreezeSlotsCap} freezes.`);
            if (this.gold < C.FreezeSlotCost) return this.refuse('Not enough gold.');

            this.gold -= C.FreezeSlotCost;
            this.maxCharges++;
            this.sound('buy');
            return { ok: true, text: `You can now hold ${this.maxCharges} freezes.` };
        }

        leaveShrine() {
            if (this.phase !== Phase.Shrine) return;

            this.setPhase(Phase.Playing);
            this.startLevel();
            this.say(`Level ${this.level}. Move when ready.`);
        }

        // #region Queries

        inLight(i) { return this.chebyshev(i, this.player) <= C.LightRadius; }
        isLit(i) { return !this.dark && this.inLight(i); }
        isObserved(ghost) { return ghost.frozen || this.isLit(ghost.cell); }
        ghostAt(cell) { return this.ghosts.findIndex(g => g.cell === cell); }

        // How solid a collapsed cell looks: fully lit, dimmed by a blink, or fading from memory.
        visibility(i, time) {
            if (i === this.exit || this.isLit(i)) return 1;
            if (this.dark && this.inLight(i)) return 0.35;
            return Math.max(0.15, 1 - (time - this.seen[i]) / C.ForgetMs);
        }

        manhattan(a, b) {
            const w = this.world;
            return Math.abs(w.x(a) - w.x(b)) + Math.abs(w.y(a) - w.y(b));
        }

        chebyshev(a, b) {
            const w = this.world;
            return Math.max(Math.abs(w.x(a) - w.x(b)), Math.abs(w.y(a) - w.y(b)));
        }

        // #endregion

        // #endregion

        // #region Private Methods

        emit(type, data) {
            for (const listener of this.listeners) listener(type, data);
        }

        say(text, tone = 'info') { this.emit('message', { text, tone }); }
        sound(name) { this.emit('sound', name); }

        deny(text) {
            this.sound('deny');
            this.say(text, 'danger');
        }

        refuse(text) {
            this.sound('deny');
            return { ok: false, text };
        }

        setPhase(phase) {
            this.phase = phase;
            this.emit('phase', phase);
        }

        startLevel() {
            const w = this.world;
            w.clear();
            this.items.fill(null);
            this.seen.fill(0);
            this.noItem.fill(0);

            this.buildSpawnRoom();
            this.player = w.index(Math.floor(C.GridWidth / 2), C.SpawnRoom.y1);

            const exitX = Math.floor(this.random() * C.GridWidth);
            this.exit = w.index(exitX, 0);
            w.place(this.exit, [Socket.Wall, exitX < C.GridWidth - 1 ? Socket.Room : Socket.Wall, Socket.Room, exitX > 0 ? Socket.Room : Socket.Wall]);

            this.charges = 0;
            this.pumpkinCollected = false;
            this.ghosts = [];
            this.dark = false;
            this.armed = false;
            this.warned = false;
            this.stillSince = this.time;
            this.blinkAt = -Infinity;
            this.lastGhostStep = this.time;
            this.lastWarnTickAt = -Infinity;
            this.lastCrackleAt = -Infinity;
            this.lastHissAt = -Infinity;

            this.refreshWorld();

            const count = Math.min(2 + Math.floor(this.level / 2), C.MaxGhosts);
            for (let k = 0; k < count; k++) this.ghosts.push({ cell: this.farDarkCell(), frozen: false });
        }

        // Each level starts in a large empty room with three doors, so the opening move is never forced.
        buildSpawnRoom() {
            const w = this.world;
            const r = C.SpawnRoom;
            const midX = Math.floor((r.x0 + r.x1) / 2);
            const midY = Math.floor((r.y0 + r.y1) / 2);

            for (let y = r.y0; y <= r.y1; y++) {
                for (let x = r.x0; x <= r.x1; x++) {
                    const north = y > r.y0 ? Socket.Room : (x === midX ? Socket.Door : Socket.Wall);
                    const east = x < r.x1 ? Socket.Room : (y === midY && x + 1 < C.GridWidth ? Socket.Door : Socket.Wall);
                    const south = y < r.y1 ? Socket.Room : Socket.Wall;
                    const west = x > r.x0 ? Socket.Room : (y === midY && x > 0 ? Socket.Door : Socket.Wall);
                    w.place(w.index(x, y), [north, east, south, west]);
                }
            }

            // Keep the cells just outside each door clear of hazards and loot too.
            const outside = [[midX, r.y0 - 1], [r.x0 - 1, midY], [r.x1 + 1, midY]];
            for (const [x, y] of outside) {
                if (w.inBounds(x, y)) this.noItem[w.index(x, y)] = 1;
            }
        }

        // Updates memory, forgets what has gone unseen too long, and collapses whatever the light touches.
        refreshWorld() {
            const w = this.world;
            let forgotten = 0;

            for (let i = 0; i < w.size; i++) {
                if (i === this.player || i === this.exit) continue;

                if (this.isLit(i) || !this.armed) {
                    this.seen[i] = this.time;
                }
                else if (w.isCollapsed(i) && this.time - this.seen[i] > C.ForgetMs) {
                    w.forget(i);
                    this.items[i] = null;
                    forgotten++;
                }
            }

            let collapsed = 0;
            if (!this.dark) {
                const lit = [];
                for (let i = 0; i < w.size; i++) {
                    if (!w.isCollapsed(i) && this.isLit(i)) lit.push(i);
                }

                const made = w.solve(lit, this.random);
                for (const cell of made) this.rollItem(cell);
                collapsed = made.length;
                this.clearBlockedExit();
            }

            return { collapsed, forgotten };
        }

        rollItem(i) {
            this.items[i] = null;
            if (!this.world.isFloor(i) || i === this.exit) return;

            if (this.noItem[i]) {
                this.noItem[i] = 0;
                return;
            }

            const roll = this.random();
            if (roll < C.GoldChance) {
                if (!this.nearItem(i, Item.Spike)) this.items[i] = Item.Gold;
            }
            else if (roll < C.GoldChance + C.SpikeChance) {
                if (!this.nearItem(i, Item.Gold)) this.items[i] = Item.Spike;
            }
            else if (roll < C.GoldChance + C.SpikeChance + C.FreezeChance) {
                this.items[i] = Item.Freeze;
            }
            else if (roll < C.GoldChance + C.SpikeChance + C.FreezeChance + C.PumpkinChance) {
                if (!this.pumpkinCollected && !this.items.includes(Item.Pumpkin)) this.items[i] = Item.Pumpkin;
            }
        }

        nearItem(i, item) {
            for (let d = 0; d < 4; d++) {
                const j = this.world.step(i, d);
                if (j >= 0 && this.items[j] === item) return true;
            }
            return false;
        }

        // Never let spikes seal every way out of the player's cell.
        clearBlockedExit() {
            const exits = [];
            for (let d = 0; d < 4; d++) {
                const j = this.world.step(this.player, d);
                if (j >= 0 && this.world.isOpen(this.player, d)) exits.push(j);
            }
            if (!exits.length || exits.some(j => this.items[j] !== Item.Spike)) return;

            this.items[exits[0]] = null;
        }

        pickUp(cell) {
            const item = this.items[cell];
            if (!item) return;

            // A full freeze pouch leaves the snowflake where it is, so it can be fetched later.
            if (item === Item.Freeze) {
                if (this.charges >= this.maxCharges) {
                    this.say('Your freezes are full. The snowflake stays here.');
                    return;
                }

                this.items[cell] = null;
                this.charges++;
                this.sound('pickupFreeze');
                this.say('Freeze +1. Tap a ghost in your light to use it.');
                return;
            }

            this.items[cell] = null;
            if (item === Item.Gold) {
                this.gold++;
                this.sound('gold');
                this.say('Gold.');
                return;
            }

            if (item === Item.Pumpkin) {
                this.pumpkinCollected = true;
                this.celebrateAt = this.time;
                this.celebrateCell = cell;
                this.sound('halloween');
                this.say('Happy Halloween!', 'celebrate');
                return;
            }

            this.sound('spike');
            this.damage('Spike.', 'Impaled in the noise.');
        }

        blink() {
            this.dark = true;
            this.blinkAt = this.time;
            this.stillSince = this.time;
            this.warned = false;
            this.say('Blink.', 'danger');
            this.sound('blink');
            this.stepGhosts();
        }

        warnBlink(untilBlink) {
            if (!this.warned) {
                this.warned = true;
                this.say('Your light is wavering...', 'warning');
            }

            const interval = untilBlink < 1000 ? 250 : 500;
            if (this.time - this.lastWarnTickAt > interval) {
                this.lastWarnTickAt = this.time;
                this.sound('tick');
            }
        }

        ghostStepMs() {
            return Math.max(C.GhostStepMinMs, C.GhostStepBaseMs - this.level * C.GhostStepPerLevelMs);
        }

        // Unobserved ghosts step towards the player along corridors, or drift through the noise.
        stepGhosts() {
            const w = this.world;

            for (let k = 0; k < this.ghosts.length; k++) {
                if (!this.isPlaying) return;

                const ghost = this.ghosts[k];
                if (this.isObserved(ghost)) continue;

                let best = -1;
                let bestDistance = this.manhattan(ghost.cell, this.player);
                for (const d of this.shuffledDirections()) {
                    if (!w.passable(ghost.cell, d)) continue;

                    const j = w.step(ghost.cell, d);
                    if (this.ghostAt(j) >= 0 || j === this.exit) continue;

                    const distance = this.manhattan(j, this.player);
                    if (distance < bestDistance) {
                        bestDistance = distance;
                        best = j;
                    }
                }

                if (best < 0 && this.random() < 0.4) {
                    const wander = [];
                    for (let d = 0; d < 4; d++) {
                        if (!w.passable(ghost.cell, d)) continue;

                        const j = w.step(ghost.cell, d);
                        if (this.ghostAt(j) < 0 && j !== this.exit && j !== this.player) wander.push(j);
                    }
                    if (wander.length) best = wander[Math.floor(this.random() * wander.length)];
                }

                if (best < 0) continue;

                ghost.cell = best;
                if (best === this.player) this.hurtByGhost(k, 'A ghost reached you in the blink.');
            }
        }

        shuffledDirections() {
            const dirs = [0, 1, 2, 3];
            for (let i = dirs.length - 1; i > 0; i--) {
                const j = Math.floor(this.random() * (i + 1));
                [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
            }
            return dirs;
        }

        // Walking into a frozen ghost breaks the ice: no damage, the freeze is spent, it drops gold,
        // and the ghost decoheres somewhere far away in the dark.
        shatter(index) {
            const ghost = this.ghosts[index];
            this.shatterAt = this.time;
            this.shatterCell = ghost.cell;
            ghost.frozen = false;
            ghost.cell = this.farDarkCell();
            this.gold += C.ShatterGold;
            this.sound('shatter');
            this.sound('gold');
            this.say(`Shattered! +${C.ShatterGold} gold. It will reform somewhere in the dark.`);
        }

        hurtByGhost(index, text) {
            const ghost = this.ghosts[index];
            if (ghost.frozen) {
                ghost.frozen = false;
                this.charges = Math.min(this.maxCharges, this.charges + 1);
            }
            ghost.cell = this.farDarkCell();

            this.sound('hurt');
            this.damage(text, 'Taken by the dark.');
        }

        damage(text, deathText) {
            this.hp--;
            this.hurtAt = this.time;
            this.say(text, 'danger');
            if (this.hp <= 0) this.gameOver(deathText);
        }

        gameOver(reason) {
            this.hp = 0;
            this.dark = false;
            this.deathReason = reason;
            if (this.level > this.bestLevel) {
                this.bestLevel = this.level;
                try { localStorage.setItem(C.BestLevelKey, String(this.level)); } catch (err) { /* storage can be blocked */ }
            }
            this.sound('death');
            this.say(reason, 'danger');
            this.setPhase(Phase.Over);
        }

        // Ghosts appear far away, in the dark, and never inside the spawn room.
        farDarkCell() {
            const w = this.world;
            const preferred = [];
            const fallback = [];

            for (let i = 0; i < w.size; i++) {
                if (this.isLit(i) || i === this.exit || i === this.player || this.ghostAt(i) >= 0) continue;

                fallback.push(i);
                if (this.manhattan(i, this.player) >= C.GhostMinSpawnDistance && w.y(i) < C.SpawnRoom.y0 - 1) preferred.push(i);
            }

            const pool = preferred.length ? preferred : fallback;
            return pool.length ? pool[Math.floor(this.random() * pool.length)] : 0;
        }

        // #endregion
    }

    function readBestLevel() {
        try { return parseInt(localStorage.getItem(DC.Config.BestLevelKey), 10) || 0; } catch (err) { return 0; }
    }

    DC.Phase = Phase;
    DC.Item = Item;
    DC.Game = Game;
})(window.OutOfMind);
