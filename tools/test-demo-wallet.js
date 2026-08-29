const fs = require('fs');
const vm = require('vm');

const memory = new Map();
const context = {
    localStorage: {
        getItem: (key) => memory.has(key) ? memory.get(key) : null,
        setItem: (key, value) => memory.set(key, value)
    },
    window: {}
};
vm.runInNewContext(fs.readFileSync('src/js/wallet/demo-wallet.js', 'utf8'), context);
const wallet = new context.window.DemoWallet();

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

assert(wallet.getBalance() === 100, 'Initial demo balance should be 100 USDT');
assert(wallet.placeWager(10) === 10, 'A valid wager should be accepted');
assert(wallet.getBalance() === 90, 'Wager should be deducted');
assert(wallet.settleWager(10, true) === 20, 'Winning payout should be 2x the wager');
assert(wallet.getBalance() === 110, 'Winning payout should be credited');
assert(wallet.placeWager(10) === 10, 'Second valid wager should be accepted');
assert(wallet.settleWager(10, false) === 0, 'Losing wager should have no payout');
assert(wallet.getBalance() === 100, 'Losing wager should not credit the wallet');
assert(wallet.placeWager(101) === false, 'Wager above balance should be rejected');

console.log('Demo wallet tests: OK');
