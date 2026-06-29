// config.js
const GameConfig = {
    gameId: "dragon_treasure", 
    
    // --- 核心玩法設定 ---
    mechanics: {
        cols: 5,
        rows: 3,
        enableCascading: true,      // true: 消除掉落 (火龍機制) | false: 普通旋轉
        ways: 243,
        featureBuyCostMulti: 200    // 購買特色遊戲的倍數 (200x)
    },

    // --- 素材路徑映射表 ---
    assets: {
        images: {
            bg: `background.jpg`,
            symbols: {
                1: `s1.png`, 2: `s2.png`, 3: `s3.png`, 4: `s4.png`, 5: `s5.png`,
                6: `s6.png`, 7: `s7.png`, 8: `s8.png`, 9: `s9.png`,
                10: `WILD.png`, 11: `SCATTER.png`,
                20: `x2.png`, 21: `x10.png`, 22: `x25.png`, 23: `x100.png`
            }
        },
        audio: {
            bgmMain: `bgm_main.mp3`, bgmFree: `bgm_free.mp3`,
            sfxSpin: `sfx_spin.mp3`, sfxStop: `sfx_stop.mp3`
        }
    },

    // --- 符號與機率模型 ---
    symbols: {
        1:  { type: 'high', payouts: {3: 4.0, 4: 20.0, 5: 80.0}, weightBase: 2.5, inFree: true },
        2:  { type: 'high', payouts: {3: 3.2, 4: 16.0, 5: 60.0}, weightBase: 4.0, inFree: true },
        3:  { type: 'high', payouts: {3: 2.0, 4: 10.0, 5: 40.0}, weightBase: 5.5, inFree: true },
        4:  { type: 'mid',  payouts: {3: 1.2, 4: 6.0,  5: 20.0}, weightBase: 12.0, inFree: true },
        5:  { type: 'mid',  payouts: {3: 1.2, 4: 6.0,  5: 20.0}, weightBase: 12.0, inFree: true },
        6:  { type: 'low',  payouts: {3: 0.5, 4: 2.5,  5: 10.0}, weightBase: 65.0, inFree: false },
        7:  { type: 'low',  payouts: {3: 0.5, 4: 2.5,  5: 10.0}, weightBase: 65.0, inFree: false },
        8:  { type: 'low',  payouts: {3: 0.25, 4: 1.5, 5: 5.0},  weightBase: 85.0, inFree: false },
        9:  { type: 'low',  payouts: {3: 0.25, 4: 1.5, 5: 5.0},  weightBase: 85.0, inFree: false },
        10: { type: 'wild', weightBase: 8.0, inFree: true },
        11: { type: 'scatter', weightBase: 4.85, inFree: true }, 
        20: { type: 'mul', val: 2,   weightBase: 0, inFree: true }, 
        21: { type: 'mul', val: 10,  weightBase: 0, inFree: true }, 
        22: { type: 'mul', val: 25,  weightBase: 0, inFree: true }, 
        23: { type: 'mul', val: 100, weightBase: 0, inFree: true }
    }
};

export default GameConfig;