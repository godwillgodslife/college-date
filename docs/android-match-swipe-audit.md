# The College Date — Android Match Page Swipe Card Gesture Fluidity & Swipe Physics Forensic Audit

**Target Platform:** Android (Google Play Release / Capacitor 8.1.0 Native Wrapper / Android WebView)  
**Package:** `com.collegedate.app`  
**Current Release Version:** `2.2.58` (Version Code 55) / Tested on `2.2.57` (Version Code 54, Physical Pixel 2 Lightweight Emulator)  
**Audit Scope:** Match Page (`/match`) manual finger swipe-card interaction and physics only.  
**Audit Status:** Complete Forensic Investigation & Empirical Physical Device Measurement. Zero code modifications executed.

---

## 1. Executive Summary

### Forensic Verdict: **STIFF & SEVERELY RESISTANT**

The manual finger drag interaction on the Android Match swipe card currently feels **heavily resistant, sluggish, and artificially constrained**. 

When dragging the card manually with a finger, the card does **not** follow the finger 1:1. Instead, it moves at **only 18% of the finger's physical displacement**. For every 100 pixels the user moves their finger horizontally across the phone glass, the card on screen only travels **18 pixels** (a **1 : 0.18 movement ratio**, equivalent to an **82% movement attenuation / 5.56x resistance factor**).

This creates an intense sensation of physical drag resistance, as though the card is submerged in heavy molasses or tethered to a rigid elastic anchor at the center of the screen.

### The Underlying Paradox (Visual vs Decision Threshold Disconnect)
Because of the 0.18 elastic multiplier, the swipe interaction exhibits a critical cognitive disconnect:
1. **Visual Movement:** When the user moves their finger 100px, the card only shifts 18px visually on screen (about 4mm to 5mm on a phone screen).
2. **Tilt/Rotation:** The card's rotation is mapped to its visual position `x` (`useTransform(x, [-220, 220], [-15, 15])`). At `x = 18px`, the card rotates by a microscopic **1.23 degrees**, remaining almost completely flat and lifeless.
3. **Stamp Visibility:** The "LIKE" and "NOPE" stamp overlays only begin fading in when `x >= 50px` (`useTransform(x, [50, 150], [0, 1])`). At 100px finger movement, `x = 18px`, meaning **the stamp opacity is 0.00 (completely invisible)**. The user has no visual confirmation that an action is imminent.
4. **The Release Shock:** When the user lifts their finger after dragging 105px, the card's visual displacement was only ~19px and stamps were invisible. The user expects the card to rest back at center. However, the release handler (`handleDragEnd`) inspects the **raw pointer displacement** (`info.offset.x = 105px`), which exceeds the hardcoded threshold (`SWIPE_THRESHOLD = 100px`). The card **abruptly shoots off the screen** and permanently triggers a Like or Pass!

Conversely, if a user wants to deliberately drag the card until it visually reaches a normal swipe commitment distance (e.g. 150px to see the "LIKE" stamp at full opacity), they must drag their finger across **833 physical pixels**—more than two complete screen widths on a standard 390-412px Android viewport!

---

## 2. Actual Implementation

| Layer / Aspect | Implementation Detail | Source File & Location |
| :--- | :--- | :--- |
| **Android Package** | `com.collegedate.app` | [`android/app/build.gradle`](file:///c:/college-date/android/app/build.gradle#L8) |
| **Android Entry Point** | `MainActivity.java` extending `BridgeActivity` | [`android/app/src/main/java/com/collegedate/app/MainActivity.java`](file:///c:/college-date/android/app/src/main/java/com/collegedate/app/MainActivity.java#L15) |
| **Native Wrapper** | Capacitor 8.1.0 (`@capacitor/android`, `@capacitor/app`) | [`package.json`](file:///c:/college-date/package.json#L33) & [`capacitor.config.json`](file:///c:/college-date/capacitor.config.json) |
| **Web Runtime** | Android System WebView (Chromium Blink Engine) | Android OS Platform WebView |
| **Match Page Container** | `Match.jsx` (Discovery profiles, card stack state, limit checks) | [`src/pages/Match.jsx`](file:///c:/college-date/src/pages/Match.jsx#L32) |
| **Swipe Card Component** | `SwipeCard.jsx` (Framer Motion card, transforms, stamps, actions) | [`src/components/SwipeCard.jsx`](file:///c:/college-date/src/components/SwipeCard.jsx#L23) |
| **Gesture Library** | `framer-motion` v12.34.0 / `motion` v12.38.0 | `node_modules/framer-motion` |
| **Gesture Elements** | `<MotionDiv drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.18} dragMomentum={false} />` | [`src/components/SwipeCard.jsx`](file:///c:/college-date/src/components/SwipeCard.jsx#L349-L359) |
| **Touch/Pointer Events** | Framer Motion internal `PanSession` (`pointerdown`, `pointermove`, `pointerup`) | `node_modules/framer-motion/dist/framer-motion.dev.js:11682` |
| **CSS Touch Handling** | `touch-action: none;` on `.swipe-card` | [`src/components/SwipeCard.css`](file:///c:/college-date/src/components/SwipeCard.css#L13) |
| **Animation System** | Hardware-accelerated CSS `transform: translate3d(...) rotate(...)` via Framer Motion MotionValues | `useMotionValue`, `useTransform`, `animate()` |
| **Exit Transition** | `animate(x, targetX, { type: 'tween', duration: 0.22, ease: 'easeOut' })` | [`src/components/SwipeCard.jsx`](file:///c:/college-date/src/components/SwipeCard.jsx#L19) |
| **Reset/Return Transition**| `animate(x, 0, { type: 'spring', stiffness: 520, damping: 38, mass: 0.8 })` | [`src/components/SwipeCard.jsx`](file:///c:/college-date/src/components/SwipeCard.jsx#L20) |
| **Lifecycle & Thresholds** | `SWIPE_THRESHOLD = 100`, `VELOCITY_THRESHOLD = 850`, `MIN_EXIT_DISTANCE = 520` | [`src/utils/swipeLifecycle.js`](file:///c:/college-date/src/utils/swipeLifecycle.js#L1-L14) |

---

## 3. Gesture Pipeline Trace

Below is the end-to-end event and state lifecycle of a single finger drag:

```mermaid
sequenceDiagram
    autonumber
    actor User as User Finger
    participant DOM as .swipe-card DOM Element
    participant Pan as Framer Motion PanSession
    participant VC as VisualElementDragControls
    participant MV as MotionValue (x)
    participant Transform as CSS Transform Pipeline
    participant Lifecycle as swipeLifecycle.js

    User->>DOM: Touch Glass (pointerdown)
    DOM->>Pan: PointerEvent(pointerdown) at (startX, startY)
    Note over Pan: Records initial touch point.<br/>Attaches pointermove & pointerup to window.<br/>Evaluates distanceThreshold (3px deadzone).

    loop Finger Drag (60fps / 120fps touch stream)
        User->>DOM: Moves finger horizontally by deltaX
        DOM->>Pan: PointerEvent(pointermove)
        Pan->>VC: onMove(info: { offset: { x: deltaX }, velocity })
        Note over VC: Constraints Check!<br/>dragConstraints = { left: 0, right: 0 }<br/>Point is OUT OF BOUNDS.<br/>applyConstraints() applies dragElastic: 0.18
        VC->>MV: x.set(deltaX * 0.18)
        MV->>Transform: Update transform: translate3d(x, 0, 0) rotate(x * 15 / 220)
        Note over Transform: GPU updates transform & stamps opacity.<br/>No React re-render triggered.
    end

    User->>DOM: Lifts finger from glass (pointerup)
    DOM->>Pan: PointerEvent(pointerup)
    Pan->>VC: stop() -> onDragEnd(event, info)
    VC->>Lifecycle: resolveSwipeDirection({ offsetX: info.offset.x, velocityX: info.velocity.x })

    alt Threshold NOT Reached (|info.offset.x| <= 100 and |velocityX| <= 850)
        Lifecycle-->>VC: direction = null
        VC->>MV: resetCardPosition() -> animate(x, 0, spring)
        Note over MV: Card snaps back to center (stiffness: 520, damping: 38).
    else Threshold Reached (|info.offset.x| > 100 or |velocityX| > 850)
        Lifecycle-->>VC: direction = 'right' or 'left'
        VC->>MV: completeSwipe() -> animate(x, targetX, tween: 220ms)
        Note over MV: Card flies off-screen.<br/>After 220ms, unmounts from stack.<br/>Backend records like/pass.
    end
```

### Layer-by-Layer Evaluation

1. **Hardware / Touch Screen Layer:**
   - Touch digitizer samples finger at 60Hz-120Hz. Android WebView receives raw touch packets.
   - Latency introduced: None beyond standard Android display pipeline (16ms-32ms).
2. **CSS Touch-Action Layer:**
   - `.swipe-card` has `touch-action: none;`.
   - Latency / Conflict: **Zero**. The browser immediately yields gesture ownership to JavaScript without waiting to evaluate vertical browser scroll or pull-to-refresh.
3. **Framer Motion `PanSession` Detection:**
   - Dead zone: `distanceThreshold = 3` (3 pixels).
   - Latency introduced: Negligible (< 1 frame). Distinguishes intentional tap from drag.
4. **Framer Motion Constraints Engine (`VisualElementDragControls`):**
   - **CRITICAL RESISTANCE INJECTION:**
     ```javascript
     let next = this.originPoint[axis] + offset[axis];
     if (this.constraints && this.constraints[axis]) {
         next = applyConstraints(next, this.constraints[axis], this.elastic[axis]);
     }
     ```
     Because `dragConstraints={{ left: 0, right: 0 }}` and `dragElastic={0.18}`, `applyConstraints` executes:
     $$\text{cardX} = \text{deltaX} \times 0.18$$
     This scales down user movement by **82%**.
5. **Render & Transform Layer:**
   - Driven directly via `x` MotionValue to CSS `transform: translate3d(...) rotate(...)`.
   - Latency / Frame Drops: **Zero**. No React component re-renders occur during the drag (`handleDrag` only increments a ref counter).
6. **Release & Decision Layer:**
   - Evaluates `info.offset.x` against `SWIPE_THRESHOLD` (100px).
   - Disconnect: Uses raw pointer offset while user visually saw `x = offset * 0.18`.

---

## 4. Empirical Swipe Physics (Laboratory Measurements on Real Android Emulator)

The following measurements were captured via Chrome DevTools Protocol directly connected to the active Android WebView on the running `Pixel_2_Lightweight` Android instance:

### A. Finger vs Card Displacement Matrix

| Step | Finger Movement ($\Delta X$) | Actual Card Shift ($\text{cardX}$) | Measured Ratio | Rotation Angle | LIKE Stamp Opacity | NOPE Stamp Opacity |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 1 | $+10\text{ px}$ | $+1.80\text{ px}$ | **0.180** | $+0.12^\circ$ | $0.00$ | $0.00$ |
| 2 | $+25\text{ px}$ | $+4.50\text{ px}$ | **0.180** | $+0.31^\circ$ | $0.00$ | $0.00$ |
| 3 | $+50\text{ px}$ | $+9.00\text{ px}$ | **0.180** | $+0.61^\circ$ | $0.00$ | $0.00$ |
| 4 | $+75\text{ px}$ | $+13.50\text{ px}$ | **0.180** | $+0.92^\circ$ | $0.00$ | $0.00$ |
| 5 | $+100\text{ px}$ | $+18.00\text{ px}$ | **0.180** | $+1.23^\circ$ | $0.00$ | $0.00$ |
| 6 | $+150\text{ px}$ | $+27.00\text{ px}$ | **0.180** | $+1.84^\circ$ | $0.00$ | $0.00$ |
| 7 | $+200\text{ px}$ | $+36.00\text{ px}$ | **0.180** | $+2.45^\circ$ | $0.00$ | $0.00$ |
| 8 | $+250\text{ px}$ | $+45.00\text{ px}$ | **0.180** | $+3.07^\circ$ | $0.00$ | $0.00$ |
| 9 | $+300\text{ px}$ | $+54.00\text{ px}$ | **0.180** | $+3.68^\circ$ | $0.04$ | $0.00$ |
| 10 | $-50\text{ px}$ (Left) | $-9.00\text{ px}$ | **0.180** | $-0.61^\circ$ | $0.00$ | $0.00$ |
| 11 | $-100\text{ px}$ (Left) | $-18.00\text{ px}$ | **0.180** | $-1.23^\circ$ | $0.00$ | $0.00$ |
| 12 | $-200\text{ px}$ (Left) | $-36.00\text{ px}$ | **0.180** | $-2.45^\circ$ | $0.00$ | $0.00$ |

### Mathematical Physics Summary

- **Movement Multiplier:** Exactly `0.18` (Linear rubber-band constraint).
- **Drag Resistance:** $82\%$ attenuation. The card is $5.56\times$ harder to move than natural 1:1 tracking.
- **Apparent Dead Zone:** Physical dead zone in code is $3\text{px}$, but perceived visual dead zone is $\approx 35\text{px}-50\text{px}$ because a $35\text{px}$ drag only produces $6.3\text{px}$ of card shift, which is barely perceptible on high-DPI phone screens (e.g. 420 dpi).
- **Horizontal Completion Threshold:**
  - In code: `SWIPE_THRESHOLD = 100` (evaluating pointer `info.offset.x`).
  - Visually on screen when triggered: $\text{cardX} = 100 \times 0.18 = \mathbf{18\text{px}}$.
- **Velocity Threshold:** `VELOCITY_THRESHOLD = 850` px/s. High-speed flicks ($> 850\text{px/s}$) succeed even under 100px displacement, but medium flicks ($400-700\text{px/s}$) fail and abruptly snap back.
- **Rotation Formula:** $\theta = \text{cardX} \times \left(\frac{15}{220}\right) = \text{fingerDeltaX} \times 0.18 \times 0.06818 = \mathbf{0.01227^\circ \text{ per finger pixel}}$. At 100px drag, rotation is only $1.23^\circ$.
- **Return Spring Physics:**
  - $\text{stiffness} = 520$
  - $\text{damping} = 38$
  - $\text{mass} = 0.8$
  - Undamped Natural Frequency: $\omega_0 = \sqrt{\frac{k}{m}} = \sqrt{\frac{520}{0.8}} = 25.5\text{ rad/s}$
  - Damping Ratio: $\zeta = \frac{c}{2\sqrt{km}} = \frac{38}{2\sqrt{416}} = \frac{38}{40.79} = \mathbf{0.93}$
  - The spring is nearly critically damped ($\zeta \approx 1.0$), causing an immediate, rigid snapback with zero fluid bounce or natural wobble.

---

## 5. Performance & Frame Rate Analysis

| Performance Metric | Finding | Impact / Assessment |
| :--- | :--- | :--- |
| **Rendering Approach** | GPU hardware-accelerated CSS `transform: translate3d(...) rotate(...)` | Excellent. Does not alter `left`, `top`, or layout dimensions. |
| **Component Re-renders during Drag** | **Zero**. `handleDrag` only increments an unobserved `useRef` counter (`dragMoveCountRef.current += 1`). | Excellent. Zero React reconciliation overhead during dragging. |
| **Forced Reflow / Layout Reads** | None during `pointermove`. Dimensions are measured at gesture start. | Excellent. No `getBoundingClientRect()` calls inside the drag loop. |
| **Animation Loop Overhead** | Framer Motion batches DOM updates to `requestAnimationFrame` (`frame.update`). | Excellent. Runs at vsync refresh rate. |
| **Android WebView 60fps Risk** | The underlying engine easily maintains 60fps. The *perception* of lag is not dropped frames; it is the **0.18 movement multiplier** making motion look frozen. | Perception of stiffness is mechanical, not computational. |
| **Card Stack DOM Footprint** | On native Android (`is-native-app`), `visibleProfileLimit = 2`. Exactly 2 cards exist in the DOM. | Low memory footprint; prevents garbage collection pauses on lower-end Android devices. |

---

## 6. Android Findings vs General Web Findings

### Android-Specific Realities
1. **Physical DPI & Sub-Pixel Visual Perception:**
   On desktop with a mouse cursor, a 0.18 multiplier feels weirdly stiff. On an Android mobile device with a $1080 \times 2400$ OLED screen ($400+\text{ dpi}$), dragging a finger across the glass produces sub-millimeter movement on screen. The finger slides forward while the card appears virtually stuck under the finger's tip, leading users to believe the app has frozen or missed the touch.
2. **Display Vsync & Touch Sampling Latency:**
   Android touch dispatch has an inherent hardware buffer latency of 1 to 2 frames ($16\text{ms} - 33\text{ms}$). When input latency is paired with an 82% displacement dampener, the finger leads the card by a visible distance, creating the tactile sensation of "fighting" a heavy anchor.
3. **Hardware Back Button & Navigation:**
   Native back button correctly dispatches `tcd:hardware-back` and does not cancel in-flight drag sessions.
4. **Touch-Action Shielding:**
   `touch-action: none` on `.swipe-card` functions properly in the Android Chromium WebView, completely preventing edge swipe conflicts and system pull-to-refresh interference.

### General Web Platform Behaviors
1. **Framer Motion `dragConstraints` Engine:**
   The `dragConstraints={{ left: 0, right: 0 }}` behavior is identical in both Chrome on desktop and Android WebView—it forces Framer Motion into "out-of-bounds elastic mode" on every single pixel.
2. **Threshold Mismatch:**
   Evaluating `info.offset.x` instead of visual `x` is platform-agnostic code inside `SwipeCard.jsx` and `swipeLifecycle.js`.

---

## 7. User Experience Findings

| Sensory Experience | Observed Physical Reality | Root Cause in Code |
| :--- | :--- | :--- |
| **"Card feels heavy / stuck in mud"** | Finger moves 100px, card only moves 18px. | `dragElastic={0.18}` and `dragConstraints={{ left: 0, right: 0 }}`. |
| **"Card is lifeless / doesn't react"** | Tilt is only $1.2^\circ$ at standard drag distance. | `rotate` formula maps to `x` (`18px`), producing negligible angular rotation. |
| **"No feedback whether I'm liking or passing"** | Stamps remain at 0% opacity until finger travels 278px. | Stamp fade-in range is `[50, 150]` on visual `x`. Visual `x` cannot reach 50 without 278px of finger drag. |
| **"Accidental swipes on release"** | Releasing after a 105px drag (where card only moved 19px) suddenly triggers full swipe completion. | `handleDragEnd` checks raw pointer `info.offset.x > 100px` rather than visual card position. |
| **"Short flick doesn't work unless violent"** | Medium-speed flicks ($500-700\text{px/s}$) snap back instead of completing. | `VELOCITY_THRESHOLD = 850` is set too high for natural one-handed thumb flicks. |
| **"Snapback is abrupt and rigid"** | Spring return snaps back without natural organic deceleration or soft bounce. | `stiffness: 520, damping: 38` has a damping ratio of $0.93$ (rigid overdamping). |

---

## 8. Root Causes (Ranked by Severity)

### Root Cause 1: Artificial Drag Constraints & Elastic Dampener
- **Severity:** **CRITICAL**
- **Evidence:** [`src/components/SwipeCard.jsx`](file:///c:/college-date/src/components/SwipeCard.jsx#L354-L355)
  ```javascript
  dragConstraints={{ left: 0, right: 0 }}
  dragElastic={0.18}
  ```
- **Mechanism:** In Framer Motion, defining `dragConstraints` with zero width (`{ left: 0, right: 0 }`) means any movement in either direction is considered outside constraints. Framer Motion immediately applies `dragElastic` (0.18) via `mixNumber(0, offset, 0.18)`, reducing displacement to 18% of finger movement.
- **User Impact:** Card feels completely disconnected from the finger, moving at less than one-fifth of finger speed with severe artificial resistance.

### Root Cause 2: Decision Threshold Disconnect (Raw Pointer vs Dampened Visual X)
- **Severity:** **HIGH**
- **Evidence:** [`src/components/SwipeCard.jsx`](file:///c:/college-date/src/components/SwipeCard.jsx#L234-L239) & [`src/utils/swipeLifecycle.js`](file:///c:/college-date/src/utils/swipeLifecycle.js#L5-L14)
  ```javascript
  const horizontalOffset = info.offset.x; // Raw finger offset (e.g. 105px)
  const direction = resolveSwipeDirection({ offsetX: horizontalOffset, ... });
  // But visually, the card on screen is at x = 105 * 0.18 = 18.9px!
  ```
- **Mechanism:** The visual state shows a card that has barely budged ($18.9\text{px}$), but the release handler uses the raw unattenuated pointer offset ($105\text{px} > 100\text{px}$) to trigger a permanent action.
- **User Impact:** Confusion and accidental swipes. The user thinks they are making a minor exploratory peek, lets go, and the card unexpectedly flies away.

### Root Cause 3: Dormant Stamp Opacity & Insufficient Visual Feedback
- **Severity:** **HIGH**
- **Evidence:** [`src/components/SwipeCard.jsx`](file:///c:/college-date/src/components/SwipeCard.jsx#L89-L90)
  ```javascript
  const likeOpacity = useTransform(x, [50, 150], [0, 1]);
  const nopeOpacity = useTransform(x, [-150, -50], [1, 0]);
  ```
- **Mechanism:** Because `x` is throttled by `0.18`, `x` does not cross $50\text{px}$ until finger drag reaches $278\text{px}$. At normal swipe distances ($100-150\text{px}$), the stamp opacity is **0.00**.
- **User Impact:** No visual indication of Like or Nope intent during dragging.

### Root Cause 4: Overly Demanding Velocity Threshold for Natural Flicks
- **Severity:** **MEDIUM**
- **Evidence:** [`src/utils/swipeLifecycle.js`](file:///c:/college-date/src/utils/swipeLifecycle.js#L2)
  ```javascript
  export const VELOCITY_THRESHOLD = 850;
  ```
- **Mechanism:** $850\text{ px/s}$ requires an aggressive, forceful swipe across the glass. A typical casual one-handed thumb flick on a mobile device registers between $350\text{ px/s}$ and $650\text{ px/s}$.
- **User Impact:** Casual thumb flicks that travel $60-80\text{px}$ fail to trigger and frustratingly snap back.

### Root Cause 5: Overly Stiff Return-to-Center Spring
- **Severity:** **MEDIUM**
- **Evidence:** [`src/components/SwipeCard.jsx`](file:///c:/college-date/src/components/SwipeCard.jsx#L20)
  ```javascript
  const RESET_TRANSITION = { type: 'spring', stiffness: 520, damping: 38, mass: 0.8 };
  ```
- **Mechanism:** With a damping ratio of $0.93$ and stiffness of $520$, the return animation snaps the card back instantly without organic physics, creating a harsh, mechanical feel.
- **User Impact:** The card feels unyielding and snappy rather than soft and responsive.

---

## 9. Recommended Remediation Plan (Future Implementation Pass)

> [!IMPORTANT]
> **AUDIT ONLY — DO NOT IMPLEMENT YET.**  
> The following plan is a detailed technical specification for a future implementation pass.

---

### Recommendation 1: Unconstrain Drag Axis & Eliminate 0.18 Elasticity
- **File:** [`src/components/SwipeCard.jsx`](file:///c:/college-date/src/components/SwipeCard.jsx#L354-L356)
- **Component:** `SwipeCard` -> `<MotionDiv>`
- **Current Behavior:**
  ```javascript
  drag={canInteract ? 'x' : false}
  dragListener={canInteract}
  dragConstraints={{ left: 0, right: 0 }}
  dragElastic={0.18}
  dragMomentum={false}
  ```
- **Recommended Behavior:**
  Remove `dragConstraints={{ left: 0, right: 0 }}` and `dragElastic={0.18}`. Let the top card follow the finger with true **1:1 tracking**:
  ```javascript
  drag={canInteract ? 'x' : false}
  dragListener={canInteract}
  dragConstraints={false}
  dragElastic={1}
  dragMomentum={false}
  ```
- **Why:** Eliminates the 82% resistance immediately. The card moves at exactly 1px card movement per 1px finger movement, providing frictionless, immediate tactile response.
- **Risk:** Without constraints, card position on release must be cleanly reset by `handleDragEnd` when threshold is not reached. (Existing `resetCardPosition()` already handles this cleanly).
- **Expected UX Improvement:** Instant transformation from "stiff and heavy" to "light, natural, and fluid".

---

### Recommendation 2: Harmonize DragEnd Resolution with Visual Card Position
- **File:** [`src/components/SwipeCard.jsx`](file:///c:/college-date/src/components/SwipeCard.jsx#L234-L239)
- **Component:** `handleDragEnd`
- **Current Behavior:**
  ```javascript
  const horizontalOffset = info.offset.x;
  const horizontalVelocity = info.velocity.x;
  const direction = resolveSwipeDirection({
      offsetX: horizontalOffset,
      velocityX: horizontalVelocity
  });
  ```
- **Recommended Behavior:**
  With 1:1 tracking, `x.get()` and `info.offset.x` will naturally align. Standardize `resolveSwipeDirection` to use `x.get()` (or `info.offset.x` under 1:1) with a natural threshold:
  ```javascript
  const currentX = x.get();
  const horizontalVelocity = info.velocity.x;
  const direction = resolveSwipeDirection({
      offsetX: currentX,
      velocityX: horizontalVelocity,
      threshold: SWIPE_THRESHOLD // e.g. 110px - 120px
  });
  ```
- **Why:** Guarantees 100% synchronization between what the user visually sees on screen and the decision threshold that triggers Like or Pass.
- **Risk:** Zero.
- **Expected UX Improvement:** Complete elimination of accidental swipes when the card is near center.

---

### Recommendation 3: Re-scale Stamp Opacities & Card Rotation for 1:1 Movement
- **File:** [`src/components/SwipeCard.jsx`](file:///c:/college-date/src/components/SwipeCard.jsx#L88-L94)
- **Component:** `SwipeCard` transforms
- **Current Behavior:**
  ```javascript
  const rotate = useTransform(x, [-220, 220], [-15, 15]);
  const likeOpacity = useTransform(x, [50, 150], [0, 1]);
  const nopeOpacity = useTransform(x, [-150, -50], [1, 0]);
  ```
- **Recommended Behavior:**
  Under 1:1 tracking, adjust mapping so stamps begin fading in at $30\text{px}$ and reach full opacity around $110-120\text{px}$ (matching the threshold):
  ```javascript
  const rotate = useTransform(x, [-240, 240], [-14, 14]);
  const likeOpacity = useTransform(x, [28, 110], [0, 1]);
  const nopeOpacity = useTransform(x, [-110, -28], [1, 0]);
  const likeScale = useTransform(x, [28, 110], [0.8, 1.1]);
  const nopeScale = useTransform(x, [-28, -110], [0.8, 1.1]);
  ```
- **Why:** Provides immediate, clear visual feedback as soon as the user starts nudging the card in either direction.
- **Risk:** None.
- **Expected UX Improvement:** Clear, responsive stamp cues that build confidence during the drag.

---

### Recommendation 4: Tune Velocity Threshold for Fluid Thumb Flicks
- **File:** [`src/utils/swipeLifecycle.js`](file:///c:/college-date/src/utils/swipeLifecycle.js#L1-L2)
- **Current Values:**
  ```javascript
  export const SWIPE_THRESHOLD = 100;
  export const VELOCITY_THRESHOLD = 850;
  ```
- **Recommended Values:**
  ```javascript
  export const SWIPE_THRESHOLD = 115;      // Slightly higher distance under 1:1 to prevent accidental triggers
  export const VELOCITY_THRESHOLD = 480;   // Low enough to catch natural, comfortable thumb flicks
  ```
- **Why:** A velocity threshold of $480\text{ px/s}$ allows quick, effortless one-handed flick gestures without requiring violent finger motion.
- **Risk:** Low. If a user quickly flicks their thumb by 60px, it cleanly completes rather than stuttering back.
- **Expected UX Improvement:** Natural, effortless flicking experience matching top mobile swipe apps.

---

### Recommendation 5: Soften Return-to-Center Spring Dynamics
- **File:** [`src/components/SwipeCard.jsx`](file:///c:/college-date/src/components/SwipeCard.jsx#L20)
- **Current Transition:**
  ```javascript
  const RESET_TRANSITION = { type: 'spring', stiffness: 520, damping: 38, mass: 0.8 };
  ```
- **Recommended Transition:**
  ```javascript
  const RESET_TRANSITION = { type: 'spring', stiffness: 340, damping: 26, mass: 0.9 };
  ```
- **Why:**
  - $\omega_0 = \sqrt{340 / 0.9} = 19.4\text{ rad/s}$
  - $\zeta = \frac{26}{2\sqrt{340 \times 0.9}} = \frac{26}{35.0} = \mathbf{0.74}$
  - A damping ratio of $0.74$ produces a smooth, organic return with a very subtle, satisfying deceleration rather than an abrupt mechanical halt.
- **Risk:** None.
- **Expected UX Improvement:** Card springs back smoothly like real physical paper.

---

## 10. Recommended Target Swipe Physics Specification

The table below summarizes the recommended target values for future tuning:

| Physics Parameter | Current Value | Recommended Target | Rationale |
| :--- | :---: | :---: | :--- |
| **Finger-to-Card Ratio** | $1 : 0.18$ | **$1 : 1.00$** | True direct-manipulation tracking; card stays pinned to finger. |
| **Drag Resistance** | $82\%$ attenuation | **$0\%$ attenuation** | Zero artificial friction during active drag. |
| **Drag Constraints** | `{ left: 0, right: 0 }` | **`false` (unconstrained)** | Frees the card from artificial bounding boxes. |
| **Activation Dead Zone** | $3\text{px}$ (effective $35\text{px}$) | **$4\text{px} - 6\text{px}$** | Perfect balance: immune to accidental taps, instantly responsive to drags. |
| **Completion Threshold** | $100\text{px}$ raw pointer ($18\text{px}$ visual) | **$110\text{px} - 120\text{px}$ visual** | Clear commitment distance ($~30\%$ of card width) under 1:1 tracking. |
| **Velocity Threshold** | $850\text{ px/s}$ | **$450 - 500\text{ px/s}$** | Catches natural, effortless one-handed thumb flicks. |
| **Maximum Tilt Angle** | $\pm 15^\circ$ at $220\text{px}$ | $\pm \mathbf{12^\circ - 14^\circ}$ at $240\text{px}$ | Natural, elegant rotation without excessive angular distortion. |
| **Stamp Fade-in Range** | $[50\text{px}, 150\text{px}]$ | $[\mathbf{28\text{px}, 110\text{px}}]$ | Visible cues appear immediately upon drag commitment. |
| **Spring Stiffness** | $520$ | **$320 - 350$** | Soft, organic return to center. |
| **Spring Damping** | $38$ ($\zeta = 0.93$) | **$24 - 28$ ($\zeta \approx 0.72 - 0.75$)** | Premium feel; smooth deceleration without harsh mechanical snap. |
| **Exit Tween Duration** | $220\text{ms}$ (`easeOut`) | **$200 - 220\text{ms}$ (`easeOut`)** | Fast, crisp exit off-screen. |

---

## 11. Regression Risks & Protective Boundaries

When implementing the physics improvements in a future pass, the following subsystem boundaries must be preserved:

1. **Button Action Handlers (`✕`, `⭐`, `❤️`):**
   - Must continue calling `completeSwipe(direction, type, 'button')` with programmatic exit animation.
   - Any change to `drag` props must not interfere with button click handlers (`onPointerDown={stopInteractivePointer}`).
2. **Preflight Checks (`onBeforeSwipe` / `canStartSwipe`):**
   - Free swipe exhaustion, offline validation, and Super Swipe balance checks must continue executing before the card exit animation begins.
   - If preflight is denied, `resetCardPosition()` must cleanly spring the card back to center.
3. **Card Stack Removal & Key Stability:**
   - `removeProfileFromStack` and `swipeCompletionRegistryRef` must remain unchanged to avoid duplicate backend swipe calls or stack desynchronization.
4. **Unit Test Suite Integrity:**
   - `test/swipe-lifecycle.test.mjs` (11 tests) validates `resolveSwipeDirection`, threshold gating, deduplication, and preflight denial. Any threshold change must be mirrored in unit test expectations.
5. **Photo Carousel Tapping:**
   - Left/right photo tapping (`.carousel-nav nav-left` / `nav-right`) must not be captured as card drags. Existing `e.stopPropagation()` handlers must remain intact.

---

## 12. Final Verdict

### **IMPORTANT TUNING — Swipe implementation works but has significant UX friction.**

#### Summary Rationale:
The architecture is fundamentally sound: Framer Motion v12, hardware-accelerated GPU transforms, zero React re-renders during dragging, full-screen mobile viewport, and an isolated 2-card stack on Android native.

However, the configuration of:
- `dragConstraints={{ left: 0, right: 0 }}`
- `dragElastic={0.18}`

imposes an overwhelming **82% artificial drag resistance** that cripples the physical feel of the interface. Removing this artificial elastic clamp and harmonizing the threshold, rotation, and spring return will immediately elevate the Android Match page to the fluid, natural feel of world-class dating applications—without requiring any architectural rewrite.

---

*Report compiled and verified via physical Android emulator devtools inspection on September 19, 2026.*  
*Artifact stored at:* `docs/android-match-swipe-audit.md`
