// Wave function collapse over room and corridor tiles.
// Each tile has a socket on every side (wall, door or room). Neighbouring tiles must
// agree on the socket they share, so whatever collapses always connects properly.
window.OutOfMind = window.OutOfMind || {};

(function (DC) {
    'use strict';

    // #region Tile Set

    const Socket = Object.freeze({ Wall: 0, Door: 1, Room: 2 });
    const DX = Object.freeze([0, 1, 0, -1]);                // N, E, S, W
    const DY = Object.freeze([-1, 0, 1, 0]);
    const OPPOSITE = Object.freeze([2, 3, 0, 1]);
    const SIDE_COUNT = 4;
    const TILE_COUNT = 81;                                  // 3 socket types ^ 4 sides

    const TILES = [];
    const WEIGHTS = [];
    const IS_FLOOR = [];
    const IS_ROOM = [];

    for (let n = 0; n < TILE_COUNT; n++) {
        const sockets = Object.freeze([n % 3, Math.floor(n / 3) % 3, Math.floor(n / 9) % 3, Math.floor(n / 27) % 3]);
        TILES.push(sockets);
        WEIGHTS.push(weightOf(sockets));
        IS_FLOOR.push(sockets.some(s => s !== Socket.Wall));
        IS_ROOM.push(sockets.some(s => s === Socket.Room));
    }

    function tileId(sockets) {
        return sockets[0] + sockets[1] * 3 + sockets[2] * 9 + sockets[3] * 27;
    }

    // Weights shape the architecture: room interiors are favoured so rooms keep growing,
    // corridors become short links between them, and odd shapes are nearly impossible.
    function weightOf(s) {
        let rooms = 0;
        let doors = 0;
        for (const side of s) {
            if (side === Socket.Room) rooms++;
            if (side === Socket.Door) doors++;
        }

        if (rooms > 0) {
            if (rooms === 4) return 3.2;
            if (rooms === 3) return doors ? 0.45 : 1.3;
            if (rooms === 2) {
                const opposite = (s[0] === Socket.Room && s[2] === Socket.Room) || (s[1] === Socket.Room && s[3] === Socket.Room);
                if (opposite) return 0.03;
                return doors === 0 ? 0.9 : doors === 1 ? 0.4 : 0.04;
            }
            return 0.05;
        }

        if (doors === 0) return 1.4;                        // solid rock
        if (doors === 1) return 0.15;                       // dead end
        if (doors === 2) {
            const straight = (s[0] && s[2]) || (s[1] && s[3]);
            return straight ? 0.7 : 0.5;
        }
        if (doors === 3) return 0.3;
        return 0.2;
    }

    function pickWeighted(options, random) {
        let total = 0;
        for (const t of options) total += WEIGHTS[t];

        let roll = random() * total;
        for (const t of options) {
            roll -= WEIGHTS[t];
            if (roll <= 0) return t;
        }
        return options[options.length - 1];
    }

    // #endregion

    // #region World

    class World {
        constructor(width, height) {
            this.width = width;
            this.height = height;
            this.size = width * height;
            this.tiles = new Int16Array(this.size).fill(-1);  // -1 means still in superposition
        }

        clear() { this.tiles.fill(-1); }
        x(i) { return i % this.width; }
        y(i) { return Math.floor(i / this.width); }
        index(x, y) { return y * this.width + x; }
        inBounds(x, y) { return x >= 0 && y >= 0 && x < this.width && y < this.height; }

        step(i, dir) {
            const nx = this.x(i) + DX[dir];
            const ny = this.y(i) + DY[dir];
            return this.inBounds(nx, ny) ? this.index(nx, ny) : -1;
        }

        isCollapsed(i) { return this.tiles[i] >= 0; }
        sockets(i) { return TILES[this.tiles[i]]; }
        socket(i, dir) { return TILES[this.tiles[i]][dir]; }
        isOpen(i, dir) { return this.isCollapsed(i) && this.socket(i, dir) !== Socket.Wall; }
        isFloor(i) { return this.isCollapsed(i) && IS_FLOOR[this.tiles[i]]; }
        isRoom(i) { return this.isCollapsed(i) && IS_ROOM[this.tiles[i]]; }
        place(i, sockets) { this.tiles[i] = tileId(sockets); }
        forget(i) { this.tiles[i] = -1; }

        // Strict mode keeps rooms rectangular: when two cells share a room edge, their
        // walls on the other sides must line up, which stops pillars and notches forming.
        fits(i, s, strict) {
            for (let d = 0; d < SIDE_COUNT; d++) {
                const j = this.step(i, d);
                if (j < 0) {
                    if (s[d] !== Socket.Wall) return false;
                    continue;
                }
                if (!this.isCollapsed(j)) continue;
                if (this.socket(j, OPPOSITE[d]) !== s[d]) return false;

                if (strict && s[d] === Socket.Room) {
                    const left = (d + 3) % SIDE_COUNT;
                    const right = (d + 1) % SIDE_COUNT;
                    if ((s[left] === Socket.Room) !== (this.socket(j, left) === Socket.Room)) return false;
                    if ((s[right] === Socket.Room) !== (this.socket(j, right) === Socket.Room)) return false;
                }
            }
            return true;
        }

        // The rectangle rule can occasionally box a cell in, so fall back to plain
        // socket matching rather than leaving a contradiction.
        domain(i) {
            const strict = [];
            for (let t = 0; t < TILE_COUNT; t++) {
                if (this.fits(i, TILES[t], true)) strict.push(t);
            }
            if (strict.length) return strict;

            const loose = [];
            for (let t = 0; t < TILE_COUNT; t++) {
                if (this.fits(i, TILES[t], false)) loose.push(t);
            }
            return loose;
        }

        collapse(i, random) {
            const options = this.domain(i);
            this.tiles[i] = options.length ? pickWeighted(options, random) : 0;
        }

        // Collapses every listed cell, lowest entropy first. Returns the cells it collapsed.
        solve(cells, random) {
            const pending = cells.filter(i => !this.isCollapsed(i));
            const collapsed = [];

            while (pending.length) {
                let best = 0;
                let bestScore = Infinity;
                for (let k = 0; k < pending.length; k++) {
                    const score = this.domain(pending[k]).length + random() * 0.5;
                    if (score < bestScore) {
                        bestScore = score;
                        best = k;
                    }
                }

                const cell = pending.splice(best, 1)[0];
                this.collapse(cell, random);
                collapsed.push(cell);
            }
            return collapsed;
        }

        // Uncollapsed cells never block: that's how ghosts drift through the noise.
        passable(a, dir) {
            const b = this.step(a, dir);
            if (b < 0) return false;

            const leaving = !this.isCollapsed(a) || this.socket(a, dir) !== Socket.Wall;
            const entering = !this.isCollapsed(b) || this.socket(b, OPPOSITE[dir]) !== Socket.Wall;
            return leaving && entering;
        }
    }

    // #endregion

    DC.Socket = Socket;
    DC.Direction = Object.freeze({ North: 0, East: 1, South: 2, West: 3 });
    DC.World = World;
})(window.OutOfMind);
