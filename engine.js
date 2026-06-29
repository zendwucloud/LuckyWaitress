// engine.js
export class SlotEngine {
    constructor(config, callbacks) {
        this.config = config;
        this.callbacks = callbacks || {}; 
        
        this.state = {
            credit: 100000,
            bet: 100,
            currentWin: 0,
            isFreeGame: false,
            freeSpinsLeft: 0,
            isSpinning: false,
            gridData: [] 
        };

        this.poolBase = [];
        this.totalWeightBase = 0;
        this.poolsFreeByReel = [[], [], [], [], []];
        this.totalWeightsFreeByReel = [0, 0, 0, 0, 0];

        this.initBasePool();
    }

    initBasePool() {
        this.poolBase = [];
        this.totalWeightBase = 0;
        for (let id in this.config.symbols) {
            let s = this.config.symbols[id];
            if (s.weightBase && s.weightBase > 0) {
                this.poolBase.push({ id: parseInt(id), weight: s.weightBase });
                this.totalWeightBase += s.weightBase;
            }
        }
    }

    updateFreeGameWeights(scatterCount) {
        this.poolsFreeByReel = [[], [], [], [], []];
        this.totalWeightsFreeByReel = [0, 0, 0, 0, 0];
        const symbolQuota = 3600; 
        const baseMultiplierQuota = 800; 

        let connectableSymbols = [1, 2, 3, 4, 5, 10, 11];
        let ratios = { 1: 100, 2: 200, 3: 300, 4: 1400, 5: 1400, 10: 142, 11: 30 };
        let ratioSum = Object.values(ratios).reduce((a, b) => a + b, 0);

        for (let c = 0; c < this.config.mechanics.cols; c++) {
            connectableSymbols.forEach(id => {
                let w = (ratios[id] / ratioSum) * symbolQuota;
                if (scatterCount === 3 && id === 10) w *= 1.2; 
                this.poolsFreeByReel[c].push({ id: id, weight: w });
                this.totalWeightsFreeByReel[c] += w;
            });

            let reelMulBoost = (c === 0) ? 3.5 : (c === 1) ? 2.0 : (c === 2) ? 1.5 : 0.5;
            let currentReelMulQuota = baseMultiplierQuota * reelMulBoost;

            let w2 = 0, w10 = 0, w25 = 0, w100 = 0;
            if (scatterCount === 3) { w2 = currentReelMulQuota * 0.95; w10 = currentReelMulQuota * 0.05; } 
            else if (scatterCount === 4) { w2 = currentReelMulQuota * 0.80; w10 = currentReelMulQuota * 0.15; w25 = currentReelMulQuota * 0.05; } 
            else { w2 = currentReelMulQuota * 0.60; w10 = currentReelMulQuota * 0.25; w25 = currentReelMulQuota * 0.10; w100 = currentReelMulQuota * 0.05; }

            if (w2 > 0) { this.poolsFreeByReel[c].push({ id: 20, weight: w2 }); this.totalWeightsFreeByReel[c] += w2; }
            if (w10 > 0) { this.poolsFreeByReel[c].push({ id: 21, weight: w10 }); this.totalWeightsFreeByReel[c] += w10; }
            if (w25 > 0) { this.poolsFreeByReel[c].push({ id: 22, weight: w25 }); this.totalWeightsFreeByReel[c] += w25; }
            if (w100 > 0) { this.poolsFreeByReel[c].push({ id: 23, weight: w100 }); this.totalWeightsFreeByReel[c] += w100; }
        }
    }

    getWeightedSymbol(reelIndex) {
        if (this.state.isFreeGame) {
            let usePool = this.poolsFreeByReel[reelIndex];
            let useTotal = this.totalWeightsFreeByReel[reelIndex];
            if (!usePool || usePool.length === 0) return 1;
            let r = Math.random() * useTotal; 
            let sum = 0;
            for (let item of usePool) { sum += item.weight; if (r <= sum) return item.id; }
            return 1;
        } else {
            let r = Math.random() * this.totalWeightBase; 
            let sum = 0;
            for (let item of this.poolBase) { sum += item.weight; if (r <= sum) return item.id; }
            return 9; 
        }
    }

    generateRandomGrid(isBuyFeature = false, buyTriggerType = 3) {
        let newGrid = [];
        const { cols, rows } = this.config.mechanics;
        for (let c = 0; c < cols; c++) {
            newGrid[c] = [];
            let hasWildInCol = false; 
            let forcedScatterRows = new Set();
            if (isBuyFeature) {
                let hasScatter = false;
                if (buyTriggerType === 3) hasScatter = (c === 0 || c === 2 || c === 4);
                else if (buyTriggerType === 4) hasScatter = (c !== 2); 
                else if (buyTriggerType === 5) hasScatter = true;
                if (hasScatter) forcedScatterRows.add(Math.floor(Math.random() * rows));
            }

            for (let r = 0; r < rows; r++) {
                let type;
                if (forcedScatterRows.has(r)) { type = 11; } 
                else {
                    while (true) {
                        type = this.getWeightedSymbol(c);
                        if (c === 0 && type === 10) continue;
                        if (this.state.isFreeGame && type === 10) { if (hasWildInCol) continue; hasWildInCol = true; }
                        break; 
                    }
                }
                newGrid[c].push(type);
            }
        }
        return newGrid;
    }

    async startSpin(isBuyFeature = false) {
        if (this.state.isSpinning) return;
        let cost = isBuyFeature ? this.state.bet * this.config.mechanics.featureBuyCostMulti : this.state.bet;
        
        if (!this.state.isFreeGame && this.state.credit < cost) {
            if(this.callbacks.onError) this.callbacks.onError("餘額不足！"); return;
        }

        this.state.isSpinning = true;

        if (!this.state.isFreeGame) {
            this.state.currentWin = 0;
            this.state.credit -= cost;
            if(this.callbacks.onBalanceChange) this.callbacks.onBalanceChange(this.state.credit);
        } else {
            this.state.freeSpinsLeft--;
            if(this.callbacks.onFreeSpinUpdate) this.callbacks.onFreeSpinUpdate(this.state.freeSpinsLeft);
        }

        if(this.callbacks.onSpinStart) this.callbacks.onSpinStart(isBuyFeature);

        this.state.gridData = this.generateRandomGrid(isBuyFeature);

        if(this.callbacks.playSpinAnimation) {
            await this.callbacks.playSpinAnimation(this.state.gridData);
        }

        await this.checkLogic();
    }

    async checkLogic() {
        const { matches, roundScore, spinMultipliers, scatterCount } = this.calculateWins();

        if (matches.size > 0) {
            let totalMul = spinMultipliers > 0 ? spinMultipliers : 1;
            let finalWin = roundScore * totalMul;
            
            // ★ 完美重現舊版 Max Win 保護機制 ★
            const MAX_PAYOUT_MULTIPLIER = 15000; 
            const MAX_WIN_AMOUNT = this.state.bet * MAX_PAYOUT_MULTIPLIER;
            let isMaxWin = false;

            if (this.state.currentWin + finalWin >= MAX_WIN_AMOUNT) {
                finalWin = MAX_WIN_AMOUNT - this.state.currentWin;
                this.state.currentWin = MAX_WIN_AMOUNT;
                isMaxWin = true;
            } else {
                this.state.currentWin += finalWin;
            }
            
            if(this.callbacks.playWinAnimation) { await this.callbacks.playWinAnimation(matches, finalWin, spinMultipliers, this.state.currentWin); }

            if (isMaxWin) {
                if (this.callbacks.onMaxWin) await this.callbacks.onMaxWin(this.state.currentWin);
                this.endSpin(0); // 達到最大獎直接結束，不繼續掉落
                return;
            }

            if (this.config.mechanics.enableCascading) { await this.doRefill(matches); } 
            else { this.endSpin(scatterCount); }
        } else {
            this.endSpin(scatterCount);
        }
    }

    async doRefill(matches) {
        const { cols, rows } = this.config.mechanics;
        let newGridData = JSON.parse(JSON.stringify(this.state.gridData));

        for (let c = 0; c < cols; c++) {
            let oldColData = newGridData[c];
            let survivors = [];
            for (let r = 0; r < rows; r++) {
                if (!matches.has(`${c},${r}`)) {
                    survivors.push(oldColData[r]);
                }
            }

            if (survivors.length < rows) {
                let missingCount = rows - survivors.length;
                let newSymbols = [];
                for (let k = 0; k < missingCount; k++) {
                    newSymbols.push(this.getWeightedSymbol(c));
                }
                // 剩下的往下掉(放前面)，新抽到的補在上方(放後面)
                newGridData[c] = [...survivors, ...newSymbols];
            }
        }

        this.state.gridData = newGridData;
        if (this.callbacks.playRefillAnimation) { await this.callbacks.playRefillAnimation(this.state.gridData, matches); }
        await this.checkLogic(); 
    }

    endSpin(scatterCount) {
        this.state.isSpinning = false;
        
        if (scatterCount >= 3 && !this.state.isFreeGame) {
            let spins = scatterCount === 3 ? 5 : (scatterCount === 4 ? 10 : 15);
            this.state.isFreeGame = true;
            this.state.freeSpinsLeft = spins;
            this.updateFreeGameWeights(scatterCount);
            if(this.callbacks.onFreeGameTrigger) this.callbacks.onFreeGameTrigger(spins, scatterCount);
            return; 
        }

        if (this.state.isFreeGame && this.state.freeSpinsLeft <= 0) {
            this.state.credit += this.state.currentWin;
            let totalWin = this.state.currentWin;
            this.state.currentWin = 0;
            this.state.isFreeGame = false;
            if(this.callbacks.onBalanceChange) this.callbacks.onBalanceChange(this.state.credit);
            if(this.callbacks.onFreeGameEnd) this.callbacks.onFreeGameEnd(totalWin);
        } else {
            if (!this.state.isFreeGame && this.state.currentWin > 0) {
                this.state.credit += this.state.currentWin;
                this.state.currentWin = 0;
                if(this.callbacks.onBalanceChange) this.callbacks.onBalanceChange(this.state.credit);
            }
            if(this.callbacks.onSpinComplete) this.callbacks.onSpinComplete(scatterCount);
        }
    }

    calculateWins(gridData = this.state.gridData) {
        let matches = new Set();
        let roundScore = 0;
        let tempMulCoords = [];
        let spinMultipliers = 0;
        let scatterCount = 0;

        const { cols, rows } = this.config.mechanics;
        const symbolsConfig = this.config.symbols;

        for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
                let id = gridData[c][r];
                let symInfo = symbolsConfig[id];
                if (!symInfo) continue;
                if (symInfo.type === 'mul') { spinMultipliers += symInfo.val; tempMulCoords.push(`${c},${r}`); }
                if (symInfo.type === 'scatter') { scatterCount++; }
            }
        }

        const regularSymbolIds = Object.keys(symbolsConfig).filter(id => ['high', 'mid', 'low'].includes(symbolsConfig[id].type)).map(Number);

        for (let targetId of regularSymbolIds) {
            let symInfo = symbolsConfig[targetId];
            if (this.state.isFreeGame && symInfo.inFree === false) continue;

            let consecutiveCols = 0;
            let currentWayCount = 1;
            let tempMatches = [];
            let hasConnectionBreak = false;

            for (let c = 0; c < cols; c++) {
                if (hasConnectionBreak) break;
                let countOnReel = 0;
                for (let r = 0; r < rows; r++) {
                    let id = gridData[c][r];
                    let isWild = symbolsConfig[id] && symbolsConfig[id].type === 'wild';
                    if (id === targetId || isWild) { countOnReel++; tempMatches.push(`${c},${r}`); }
                }
                if (countOnReel > 0) { consecutiveCols++; currentWayCount *= countOnReel; } 
                else { hasConnectionBreak = true; }
            }

            if (consecutiveCols >= 3) {
                let allWilds = true;
                for (let coord of tempMatches) {
                    let [mc, mr] = coord.split(',').map(Number);
                    if (mc < consecutiveCols && symbolsConfig[gridData[mc][mr]].type !== 'wild') { allWilds = false; break; }
                }
                if (allWilds && targetId !== 1) continue; 

                let payout = symInfo.payouts[consecutiveCols];
                if (payout) {
                    let winAmount = payout * (this.state.bet / 20) * currentWayCount;
                    roundScore += winAmount;
                    tempMatches.forEach(key => { let [mc, mr] = key.split(',').map(Number); if (mc < consecutiveCols) matches.add(key); });
                }
            }
        }

        if (matches.size > 0 && tempMulCoords.length > 0) { tempMulCoords.forEach(key => matches.add(key)); }
        return { matches, roundScore, spinMultipliers, scatterCount };
    }
}