// Boots the game and runs the loop: fixed-step logic, render every frame.
window.OutOfMind = window.OutOfMind || {};

(function (DC) {
    'use strict';

    const C = DC.Config;

    // Long frames (a background tab, a debugger pause) are clamped so the game never
    // fast-forwards through blinks and ghost steps when the player comes back.
    const MAX_FRAME_MS = 100;

    function boot() {
        const canvas = document.getElementById('board');
        const game = new DC.Game();
        const sound = new DC.Sound();
        const renderer = new DC.Renderer(canvas, game);
        const ui = new DC.Ui(game, renderer, sound);

        if (window.ResizeObserver) new ResizeObserver(() => renderer.resize()).observe(canvas);
        else window.addEventListener('resize', () => renderer.resize());

        let last = performance.now();
        let accumulator = 0;

        function frame(now) {
            const dt = Math.min(MAX_FRAME_MS, now - last);
            last = now;
            accumulator += dt;

            while (accumulator >= C.TickMs) {
                game.tick(C.TickMs);
                accumulator -= C.TickMs;
            }

            renderer.draw(game.time + accumulator);
            ui.updateHud();
            sound.setDread(game.dread, game.isPlaying);
            requestAnimationFrame(frame);
        }

        requestAnimationFrame(frame);
        DC.instance = game;
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})(window.OutOfMind);
