// Direct test of Toast priority, bounding, and deduplication logic
const PRIORITY_LEVELS = { HIGH: 3, MEDIUM: 2, LOW: 1 };
const MAX_QUEUE_SIZE = 3;
const DEDUPE_WINDOW_MS = 3000;

function inferPriority(type, message, options = {}) {
    if (options.priority) {
        const p = String(options.priority).toUpperCase();
        if (PRIORITY_LEVELS[p]) return PRIORITY_LEVELS[p];
    }
    const msgLower = String(message || '').toLowerCase();
    if (type === 'error' || msgLower.includes('match') || msgLower.includes('security') || msgLower.includes('blocked')) {
        return PRIORITY_LEVELS.HIGH;
    }
    if (msgLower.includes('super swipe') || msgLower.includes('message') || type === 'warning') {
        return PRIORITY_LEVELS.MEDIUM;
    }
    return PRIORITY_LEVELS.LOW;
}

class ToastTester {
    constructor() {
        this.activeToast = null;
        this.queue = [];
        this.recentMessages = new Map();
        this.displayedCount = 0;
        this.suppressedCount = 0;
        this.preemptedCount = 0;
    }

    addToast(message, type = "info", duration = 3500, options = {}) {
        const now = Date.now();
        const normKey = `${type}:${String(message).trim().toLowerCase()}`;

        // 1. Deduplication
        const lastSeen = this.recentMessages.get(normKey);
        if (lastSeen && (now - lastSeen) < DEDUPE_WINDOW_MS) {
            this.suppressedCount++;
            return;
        }
        this.recentMessages.set(normKey, now);

        const priority = inferPriority(type, message, options);

        // 2. Preemption
        if (priority === PRIORITY_LEVELS.HIGH && this.activeToast && this.activeToast.priority < PRIORITY_LEVELS.HIGH) {
            this.preemptedCount++;
            this.activeToast = null;
        }

        // 3. Queue Management
        if (this.queue.length >= MAX_QUEUE_SIZE) {
            const lowestIdx = this.queue.findIndex(item => item.priority === PRIORITY_LEVELS.LOW);
            if (lowestIdx !== -1) {
                this.queue.splice(lowestIdx, 1);
            } else {
                this.queue.shift();
            }
        }

        const newToast = { id: Math.random(), message, type, priority, timestamp: now };
        if (!this.activeToast) {
            this.activeToast = newToast;
            this.displayedCount++;
        } else {
            this.queue.push(newToast);
        }
    }
}

const tester = new ToastTester();

console.log("=== NOTIFICATION STRESS TEST SIMULATION ===");
// 1. Burst of 10 identical informational toasts
for (let i = 0; i < 10; i++) {
    tester.addToast("Profile saved successfully.", "info");
}
console.log("After 10 identical toasts:");
console.log("  Displayed:", tester.displayedCount);
console.log("  Suppressed:", tester.suppressedCount);
if (tester.displayedCount === 1 && tester.suppressedCount === 9) {
    console.log("  PASS: Identical toasts correctly deduplicated!");
}

// 2. Burst of 10 distinct low-priority toasts (Testing queue boundedness)
for (let i = 0; i < 10; i++) {
    tester.addToast(`Tip #${i}: Swipe right to like!`, "info");
}
console.log("Queue size after 10 distinct low-priority toasts:", tester.queue.length);
if (tester.queue.length <= MAX_QUEUE_SIZE) {
    console.log("  PASS: Queue bounded at MAX_QUEUE_SIZE (<= 3)!");
}

// 3. High priority preemption
tester.activeToast = { message: "Normal tip", priority: PRIORITY_LEVELS.LOW };
tester.addToast("It's a Match! Alex liked you back.", "success");
console.log("After high priority Match event:");
console.log("  Preempted count:", tester.preemptedCount);
console.log("  Active toast message:", tester.activeToast.message);
if (tester.activeToast.message.includes("Match")) {
    console.log("  PASS: High priority Match event preempted lower priority toast!");
}
