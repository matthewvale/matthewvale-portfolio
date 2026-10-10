// Draws the board onto a canvas. Reads game state only, never changes it.
window.Decoherence = window.Decoherence || {};

(function (DC) {
    'use strict';

    const C = DC.Config;
    const Socket = DC.Socket;

    const Colour = Object.freeze({
        Void: '#070b12',
        Wall: '#141924',
        RoomFloor: '#2c3548',
        CorridorFloor: '#232b3b',
        FloorLine: 'rgba(255, 255, 255, 0.035)',
        ExitFloor: '#14352f',
        Exit: '#3ddc97',
        Player: '#2BA5E2',
        PlayerDim: '#1c72be',
        Ghost: '#ff60ff',
        GhostEyes: '#2a0b2a',
        Frozen: '#9ad8ff',
        FrozenEyes: '#0b2a40',
        Gold: '#f5c542',
        GoldEdge: '#a8781a',
        Spike: '#ff4d6d',
        Pumpkin: '#ff8a1f',
        PumpkinRib: '#c85a00',
        PumpkinStem: '#4caf50',
        PumpkinFace: '#2a1200',
        Celebrate: '#ff8a1f',
        LightFrame: 'rgba(43, 165, 226, 0.35)'
    });

    const WALL_THICKNESS = 0.14;
    const DOOR_START = 0.36;
    const DOOR_END = 0.64;
    const CORRIDOR_START = 0.3;
    const CORRIDOR_END = 0.7;
    const NOISE_REFRESH_MS = 110;
    const HURT_FLASH_MS = 350;
    const CELEBRATE_MS = 2600;
    const SHATTER_MS = 600;
    const CONFETTI_COLOURS = Object.freeze(['#ff8a1f', '#ff60ff', '#2BA5E2', '#f5c542', '#9b5cff']);

    class Renderer {
        constructor(canvas, game) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.game = game;
            this.noise = new Float32Array(game.world.size);
            this.noiseAt = -Infinity;
            this.cssWidth = 0;
            this.cssHeight = 0;
            this.resize();
        }

        // #region Public Methods

        resize() {
            const rect = this.canvas.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 3);
            this.cssWidth = Math.max(1, rect.width);
            this.cssHeight = Math.max(1, rect.height);
            this.canvas.width = Math.round(this.cssWidth * dpr);
            this.canvas.height = Math.round(this.cssHeight * dpr);
            this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            this.cellWidth = this.cssWidth / C.GridWidth;
            this.cellHeight = this.cssHeight / C.GridHeight;
        }

        // Converts a point in CSS pixels (relative to the canvas) into a cell index.
        cellAt(px, py) {
            const x = Math.floor(px / this.cellWidth);
            const y = Math.floor(py / this.cellHeight);
            const w = this.game.world;
            return w.inBounds(x, y) ? w.index(x, y) : -1;
        }

        draw(time) {
            const ctx = this.ctx;
            const game = this.game;
            const w = game.world;

            if (time - this.noiseAt > NOISE_REFRESH_MS) {
                this.noiseAt = time;
                for (let i = 0; i < this.noise.length; i++) this.noise[i] = Math.random();
            }

            ctx.save();
            const sinceHurt = time - game.hurtAt;
            if (sinceHurt < HURT_FLASH_MS) {
                const shake = 4 * (1 - sinceHurt / HURT_FLASH_MS);
                ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
            }

            ctx.globalAlpha = 1;
            ctx.fillStyle = Colour.Void;
            ctx.fillRect(-8, -8, this.cssWidth + 16, this.cssHeight + 16);

            for (let i = 0; i < w.size; i++) {
                const r = this.rect(i);
                if (!w.isCollapsed(i)) {
                    this.drawStatic(i, r);
                    continue;
                }

                ctx.globalAlpha = game.visibility(i, time);
                this.drawTile(i, r);
                if (i === game.exit) this.drawExit(r, time);
                else if (game.items[i] === DC.Item.Gold) this.drawGold(r);
                else if (game.items[i] === DC.Item.Spike) this.drawSpikes(r);
                else if (game.items[i] === DC.Item.Pumpkin) this.drawPumpkin(r);
                else if (game.items[i] === DC.Item.Freeze) this.drawSnowflake(r, time);
            }
            ctx.globalAlpha = 1;

            if (game.isPlaying && !game.dark) this.drawLightFrame();

            for (const ghost of game.ghosts) {
                const r = this.rect(ghost.cell);
                if (game.isObserved(ghost)) this.drawGhost(r, ghost.frozen);
                else this.drawGhostHint(r, ghost.cell);
            }

            this.drawPlayer(this.rect(game.player), game.dark);

            if (game.dark) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
                ctx.fillRect(-8, -8, this.cssWidth + 16, this.cssHeight + 16);
            }
            const sinceShatter = time - game.shatterAt;
            if (sinceShatter >= 0 && sinceShatter < SHATTER_MS) this.drawShatter(sinceShatter);
            const sinceCelebrate = time - game.celebrateAt;
            if (sinceCelebrate >= 0 && sinceCelebrate < CELEBRATE_MS) this.drawCelebration(sinceCelebrate);
            if (sinceHurt < HURT_FLASH_MS) {
                ctx.fillStyle = `rgba(255, 60, 90, ${0.3 * (1 - sinceHurt / HURT_FLASH_MS)})`;
                ctx.fillRect(-8, -8, this.cssWidth + 16, this.cssHeight + 16);
            }
            ctx.restore();
        }

        // #endregion

        // #region Private Methods

        // Rounded cell edges so neighbouring cells meet exactly, with no hairline seams.
        rect(i) {
            const w = this.game.world;
            const x0 = Math.round(w.x(i) * this.cellWidth);
            const y0 = Math.round(w.y(i) * this.cellHeight);
            const x1 = Math.round((w.x(i) + 1) * this.cellWidth);
            const y1 = Math.round((w.y(i) + 1) * this.cellHeight);
            return { x: x0, y: y0, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, s: Math.min(x1 - x0, y1 - y0) };
        }

        drawStatic(i, r) {
            const ctx = this.ctx;
            const n = this.noise[i];
            ctx.globalAlpha = 1;
            ctx.fillStyle = `rgba(110, 135, 180, ${0.04 + n * 0.1})`;
            ctx.fillRect(r.x, r.y, r.w, r.h);

            ctx.fillStyle = `rgba(170, 190, 230, ${0.08 + n * 0.12})`;
            const dot = Math.max(1, r.s * 0.06);
            ctx.fillRect(r.x + r.w * ((n * 7.3) % 1), r.y + r.h * ((n * 3.1) % 1), dot, dot);
            ctx.fillRect(r.x + r.w * ((n * 13.7) % 1), r.y + r.h * ((n * 5.9) % 1), dot, dot);
        }

        drawTile(i, r) {
            const ctx = this.ctx;
            const w = this.game.world;

            if (!w.isFloor(i)) {
                ctx.fillStyle = Colour.Wall;
                ctx.fillRect(r.x, r.y, r.w, r.h);
                return;
            }

            const s = w.sockets(i);
            const floor = i === this.game.exit ? Colour.ExitFloor : (w.isRoom(i) ? Colour.RoomFloor : Colour.CorridorFloor);

            if (w.isRoom(i)) {
                ctx.fillStyle = floor;
                ctx.fillRect(r.x, r.y, r.w, r.h);
                ctx.strokeStyle = Colour.FloorLine;
                ctx.lineWidth = 1;
                ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);

                for (let d = 0; d < 4; d++) {
                    if (s[d] === Socket.Room) continue;

                    ctx.fillStyle = Colour.Wall;
                    this.fillSide(r, d, 0, 1);
                    if (s[d] === Socket.Door) {
                        ctx.fillStyle = floor;
                        this.fillSide(r, d, DOOR_START, DOOR_END);
                    }
                }
                return;
            }

            ctx.fillStyle = Colour.Wall;
            ctx.fillRect(r.x, r.y, r.w, r.h);
            ctx.fillStyle = floor;
            this.fillPart(r, CORRIDOR_START, CORRIDOR_START, CORRIDOR_END, CORRIDOR_END);
            if (s[0]) this.fillPart(r, CORRIDOR_START, 0, CORRIDOR_END, CORRIDOR_START + 0.01);
            if (s[1]) this.fillPart(r, CORRIDOR_END - 0.01, CORRIDOR_START, 1, CORRIDOR_END);
            if (s[2]) this.fillPart(r, CORRIDOR_START, CORRIDOR_END - 0.01, CORRIDOR_END, 1);
            if (s[3]) this.fillPart(r, 0, CORRIDOR_START, CORRIDOR_START + 0.01, CORRIDOR_END);
        }

        // Fills a strip along one side of a cell, between `from` and `to` along that side.
        fillSide(r, dir, from, to) {
            const t = WALL_THICKNESS;
            if (dir === 0) this.fillPart(r, from, 0, to, t);
            else if (dir === 1) this.fillPart(r, 1 - t, from, 1, to);
            else if (dir === 2) this.fillPart(r, from, 1 - t, to, 1);
            else this.fillPart(r, 0, from, t, to);
        }

        fillPart(r, fx0, fy0, fx1, fy1) {
            const x0 = r.x + Math.round(r.w * fx0);
            const y0 = r.y + Math.round(r.h * fy0);
            const x1 = r.x + Math.round(r.w * fx1);
            const y1 = r.y + Math.round(r.h * fy1);
            this.ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
        }

        drawLightFrame() {
            const game = this.game;
            const w = game.world;
            const px = w.x(game.player);
            const py = w.y(game.player);
            const x0 = Math.max(0, px - C.LightRadius);
            const y0 = Math.max(0, py - C.LightRadius);
            const x1 = Math.min(C.GridWidth, px + C.LightRadius + 1);
            const y1 = Math.min(C.GridHeight, py + C.LightRadius + 1);

            const ctx = this.ctx;
            ctx.strokeStyle = Colour.LightFrame;
            ctx.lineWidth = 1.5;
            this.roundRect(x0 * this.cellWidth + 1, y0 * this.cellHeight + 1, (x1 - x0) * this.cellWidth - 2, (y1 - y0) * this.cellHeight - 2, 6);
            ctx.stroke();
        }

        drawPlayer(r, dim) {
            const ctx = this.ctx;
            const radius = r.s * 0.26;
            ctx.save();
            ctx.shadowColor = Colour.Player;
            ctx.shadowBlur = dim ? 4 : 14;
            ctx.fillStyle = dim ? Colour.PlayerDim : Colour.Player;
            ctx.beginPath();
            ctx.arc(r.cx, r.cy, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(r.cx, r.cy, radius * 0.38, 0, Math.PI * 2);
            ctx.fill();
        }

        drawGhost(r, frozen) {
            const ctx = this.ctx;
            const radius = r.s * 0.27;
            const top = r.cy - radius * 0.25;
            const bottom = r.cy + radius * 1.0;
            const left = r.cx - radius;
            const right = r.cx + radius;
            const colour = frozen ? Colour.Frozen : Colour.Ghost;

            ctx.save();
            ctx.shadowColor = colour;
            ctx.shadowBlur = 12;
            ctx.fillStyle = colour;
            ctx.beginPath();
            ctx.arc(r.cx, top, radius, Math.PI, 0);
            ctx.lineTo(right, bottom);
            const bumps = 3;
            const bumpWidth = (right - left) / bumps;
            for (let b = 0; b < bumps; b++) {
                const x = right - b * bumpWidth;
                ctx.quadraticCurveTo(x - bumpWidth / 2, bottom - radius * 0.35, x - bumpWidth, bottom);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            ctx.fillStyle = frozen ? Colour.FrozenEyes : Colour.GhostEyes;
            const eye = radius * 0.17;
            ctx.beginPath();
            ctx.arc(r.cx - radius * 0.38, top, eye, 0, Math.PI * 2);
            ctx.arc(r.cx + radius * 0.38, top, eye, 0, Math.PI * 2);
            ctx.fill();

            if (frozen) {
                ctx.strokeStyle = Colour.Frozen;
                ctx.lineWidth = 2;
                this.roundRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4, 5);
                ctx.stroke();
            }
        }

        // A ghost you can't see shows as a faint flicker in the noise: enough to learn from, not enough to rely on.
        drawGhostHint(r, cell) {
            const ctx = this.ctx;
            ctx.globalAlpha = 0.1 + this.noise[cell] * 0.18;
            ctx.fillStyle = Colour.Ghost;
            ctx.fillRect(r.x, r.y, r.w, r.h);
            ctx.globalAlpha = 1;
        }

        drawGold(r) {
            const ctx = this.ctx;
            const radius = r.s * 0.15;
            ctx.fillStyle = Colour.Gold;
            ctx.beginPath();
            ctx.arc(r.cx, r.cy, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = Colour.GoldEdge;
            ctx.lineWidth = Math.max(1, radius * 0.25);
            ctx.beginPath();
            ctx.arc(r.cx, r.cy, radius * 0.6, 0, Math.PI * 2);
            ctx.stroke();
        }

        drawSpikes(r) {
            const ctx = this.ctx;
            const half = r.s * 0.1;
            const base = r.cy + r.s * 0.16;
            const peak = r.cy - r.s * 0.18;
            ctx.fillStyle = Colour.Spike;
            ctx.beginPath();
            for (const offset of [-2, 0, 2]) {
                const cx = r.cx + offset * half;
                ctx.moveTo(cx - half, base);
                ctx.lineTo(cx, peak);
                ctx.lineTo(cx + half, base);
            }
            ctx.fill();
        }

        drawSnowflake(r, time) {
            const ctx = this.ctx;
            const arm = r.s * 0.2;
            const twig = arm * 0.35;

            ctx.save();
            ctx.translate(r.cx, r.cy);
            ctx.rotate(time / 2500);
            ctx.shadowColor = Colour.Frozen;
            ctx.shadowBlur = 10;
            ctx.strokeStyle = Colour.Frozen;
            ctx.lineWidth = Math.max(1.5, r.s * 0.04);
            ctx.lineCap = 'round';
            ctx.beginPath();
            for (let k = 0; k < 6; k++) {
                const a = (k * Math.PI) / 3;
                const ex = Math.cos(a) * arm;
                const ey = Math.sin(a) * arm;
                ctx.moveTo(0, 0);
                ctx.lineTo(ex, ey);
                for (const side of [-1, 1]) {
                    const b = a + side * 0.6;
                    ctx.moveTo(ex * 0.6, ey * 0.6);
                    ctx.lineTo(ex * 0.6 + Math.cos(b) * twig, ey * 0.6 + Math.sin(b) * twig);
                }
            }
            ctx.stroke();
            ctx.restore();
        }

        drawPumpkin(r) {
            const ctx = this.ctx;
            const rx = r.s * 0.24;
            const ry = r.s * 0.19;
            const cy = r.cy + r.s * 0.04;

            ctx.fillStyle = Colour.PumpkinStem;
            ctx.fillRect(r.cx - r.s * 0.03, cy - ry - r.s * 0.09, r.s * 0.06, r.s * 0.1);

            ctx.fillStyle = Colour.Pumpkin;
            ctx.beginPath();
            ctx.ellipse(r.cx, cy, rx, ry, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = Colour.PumpkinRib;
            ctx.lineWidth = Math.max(1, r.s * 0.025);
            for (const k of [-0.45, 0, 0.45]) {
                ctx.beginPath();
                ctx.ellipse(r.cx + rx * k, cy, rx * 0.35, ry * 0.95, 0, 0, Math.PI * 2);
                ctx.stroke();
            }

            ctx.fillStyle = Colour.PumpkinFace;
            const eye = r.s * 0.05;
            for (const side of [-1, 1]) {
                ctx.beginPath();
                ctx.moveTo(r.cx + side * rx * 0.45 - eye, cy - ry * 0.1);
                ctx.lineTo(r.cx + side * rx * 0.45, cy - ry * 0.5);
                ctx.lineTo(r.cx + side * rx * 0.45 + eye, cy - ry * 0.1);
                ctx.fill();
            }
            ctx.beginPath();
            ctx.ellipse(r.cx, cy + ry * 0.35, rx * 0.5, ry * 0.2, 0, 0, Math.PI);
            ctx.fill();
        }

        // Ice shards flying out from where the frozen ghost stood.
        drawShatter(elapsed) {
            const ctx = this.ctx;
            const origin = this.rect(this.game.shatterCell);
            const t = elapsed / 1000;
            const fade = 1 - elapsed / SHATTER_MS;

            ctx.fillStyle = Colour.Frozen;
            for (let p = 0; p < 18; p++) {
                const angle = (p * 2.399) % (Math.PI * 2);
                const speed = 90 + ((p * 53) % 80);
                const x = origin.cx + Math.cos(angle) * speed * t;
                const y = origin.cy + Math.sin(angle) * speed * t + 120 * t * t;
                const size = 3 + (p % 3) * 2;
                ctx.globalAlpha = Math.max(0, fade);
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(angle + t * 8);
                ctx.beginPath();
                ctx.moveTo(0, -size);
                ctx.lineTo(size * 0.5, size);
                ctx.lineTo(-size * 0.5, size);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
            ctx.globalAlpha = 1;
        }

        // Confetti bursting from the pumpkin plus a banner. Particle paths come from the
        // particle's index, so they stay stable from frame to frame with no stored state.
        drawCelebration(elapsed) {
            const ctx = this.ctx;
            const origin = this.rect(this.game.celebrateCell);
            const t = elapsed / 1000;
            const fade = 1 - elapsed / CELEBRATE_MS;

            for (let p = 0; p < 48; p++) {
                const angle = (p * 2.399) % (Math.PI * 2);
                const speed = 60 + ((p * 37) % 90);
                const x = origin.cx + Math.cos(angle) * speed * t;
                const y = origin.cy + Math.sin(angle) * speed * t + 90 * t * t;
                ctx.globalAlpha = Math.max(0, fade);
                ctx.fillStyle = CONFETTI_COLOURS[p % CONFETTI_COLOURS.length];
                ctx.fillRect(x, y, 4, 4);
            }

            const pop = Math.min(1, elapsed / 220);
            const size = Math.round(Math.min(this.cssWidth / 11, 34) * (0.7 + 0.3 * pop));
            ctx.globalAlpha = Math.max(0, Math.min(1, fade * 1.6));
            ctx.font = `700 ${size}px Poppins, system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.lineWidth = Math.max(3, size * 0.16);
            ctx.strokeStyle = '#1a0a00';
            ctx.strokeText('Happy Halloween!', this.cssWidth / 2, this.cssHeight * 0.3);
            ctx.fillStyle = Colour.Celebrate;
            ctx.fillText('Happy Halloween!', this.cssWidth / 2, this.cssHeight * 0.3);
            ctx.globalAlpha = 1;
        }

        drawExit(r, time) {
            const ctx = this.ctx;
            const pulse = 0.6 + 0.4 * Math.sin(time / 300);
            const width = r.s * 0.36;
            const height = r.s * 0.5;
            const x = r.cx - width / 2;
            const y = r.cy - height / 2 + r.s * 0.04;

            ctx.save();
            ctx.globalAlpha = 1;
            ctx.shadowColor = Colour.Exit;
            ctx.shadowBlur = 8 + 8 * pulse;
            ctx.fillStyle = Colour.Exit;
            ctx.beginPath();
            ctx.moveTo(x, y + height);
            ctx.lineTo(x, y + width / 2);
            ctx.arc(r.cx, y + width / 2, width / 2, Math.PI, 0);
            ctx.lineTo(x + width, y + height);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        roundRect(x, y, w, h, radius) {
            const ctx = this.ctx;
            const r = Math.min(radius, w / 2, h / 2);
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.arcTo(x + w, y, x + w, y + h, r);
            ctx.arcTo(x + w, y + h, x, y + h, r);
            ctx.arcTo(x, y + h, x, y, r);
            ctx.arcTo(x, y, x + w, y, r);
            ctx.closePath();
        }

        // #endregion
    }

    DC.Renderer = Renderer;
})(window.Decoherence);
