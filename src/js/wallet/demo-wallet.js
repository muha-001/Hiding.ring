(() => {
    const STORAGE_KEY = 'hiding-ring-demo-wallet-v1';
    const INITIAL_BALANCE = 100;

    class DemoWallet {
        constructor(initialBalance = INITIAL_BALANCE) {
            this.initialBalance = initialBalance;
            this.balance = this.load();
        }

        load() {
            const stored = Number.parseFloat(localStorage.getItem(STORAGE_KEY));
            return Number.isFinite(stored) && stored >= 0
                ? this.round(stored)
                : this.initialBalance;
        }

        save() {
            localStorage.setItem(STORAGE_KEY, this.balance.toFixed(2));
        }

        round(value) {
            return Math.round((value + Number.EPSILON) * 100) / 100;
        }

        getBalance() {
            return this.balance;
        }

        canPlaceWager(amount) {
            return Number.isFinite(amount) && amount > 0 && amount <= this.balance;
        }

        placeWager(amount) {
            const normalizedAmount = this.round(amount);
            if (!this.canPlaceWager(normalizedAmount)) return false;
            this.balance = this.round(this.balance - normalizedAmount);
            this.save();
            return normalizedAmount;
        }

        settleWager(amount, won) {
            const normalizedAmount = this.round(amount);
            const payout = won ? this.round(normalizedAmount * 2) : 0;
            this.balance = this.round(this.balance + payout);
            this.save();
            return payout;
        }

        refundWager(amount) {
            const normalizedAmount = this.round(amount);
            if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) return 0;
            this.balance = this.round(this.balance + normalizedAmount);
            this.save();
            return normalizedAmount;
        }

        reset() {
            this.balance = this.initialBalance;
            this.save();
            return this.balance;
        }
    }

    window.DemoWallet = DemoWallet;
})();
