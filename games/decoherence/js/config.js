// Decoherence: every tunable number lives here so balancing never means hunting through logic.
window.Decoherence = window.Decoherence || {};

(function (DC) {
    'use strict';

    DC.Config = Object.freeze({
        // #region Board
        GridWidth: 9,
        GridHeight: 11,
        LightRadius: 2,                  // Chebyshev distance, so the light is a 5x5 square
        SpawnRoom: Object.freeze({ x0: 1, x1: 7, y0: 8, y1: 10 }),
        // #endregion

        // #region Timing (milliseconds of game time)
        TickMs: 80,
        ForgetMs: 1000,                  // how long an unseen cell survives before it decoheres
        StillMs: 5000,                   // standing still this long makes the light blink
        WarnMs: 2000,                    // warning ticks start this long before a blink
        BlinkMs: 350,
        GhostStepBaseMs: 520,
        GhostStepPerLevelMs: 40,
        GhostStepMinMs: 260,
        // #endregion

        // #region Player
        StartHp: 3,
        MaxHp: 10,
        FreezeSlotsStart: 2,
        FreezeSlotsCap: 4,
        // #endregion

        // #region Shrine
        HealCost: 5,
        FreezeSlotCost: 10,
        // #endregion

        // #region Spawning
        MaxGhosts: 3,
        GhostMinSpawnDistance: 6,
        GoldChance: 0.06,
        SpikeChance: 0.07,
        // #endregion

        BestLevelKey: 'decoherence.bestLevel',
        MutedKey: 'decoherence.muted'
    });
})(window.Decoherence);
