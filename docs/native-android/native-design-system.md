# Native Android Design System: The College Date

Date: 2026-08-01  
Target Framework: Jetpack Compose (Material Design 3)  
Package: `com.collegedate.app.core.designsystem`  
Scope: Authoritative design tokens, color palettes, typography scale, component library, motion principles, and accessibility rules.

---

## 1. Design System Overview

The **College Date** Native Design System adapts the brand's vibrant dark-mode visual identity into production-grade Material 3 Jetpack Compose components. It prioritizes dark aesthetics, neon accents, thumb ergonomics, fluid 120Hz micro-animations, and strict 48dp accessibility touch targets.

---

## 2. Design Tokens

### 2.1 Color System (Dark Mode Primary)

| Token Name | Hex Code | Compose Color Definition | Intended Usage |
|---|---|---|---|
| **Background Main** | `#0D0B18` | `Color(0xFF0D0B18)` | App-level canvas background |
| **Surface Dark** | `#161329` | `Color(0xFF161329)` | Primary card and container surfaces |
| **Surface Dark Glass** | `#1F1B38` | `Color(0xFF1F1B38)` | Elevated overlays, dialogs, bottom sheets |
| **Accent Primary (Violet)** | `#6C63FF` | `Color(0xFF6C63FF)` | Primary CTA buttons, active tab indicators |
| **Accent Like (Pink)** | `#FF4B72` | `Color(0xFFFF4B72)` | Like buttons, heart icons, match highlights |
| **Accent Secondary (Cyan)** | `#00F2FE` | `Color(0xFF00F2FE)` | AI badges, compatibility tags, online dots |
| **Accent Gold (Premium)** | `#FFD700` | `Color(0xFFFFD700)` | Premium crowns, Super Swipes, wallet badges |
| **Accent Success (Green)** | `#00E676` | `Color(0xFF00E676)` | Verification badges, completed indicators |
| **Accent Error (Red)** | `#FF3B30` | `Color(0xFFFF3B30)` | Destructive actions, error banners, pass icons |
| **Text Primary** | `#FFFFFF` | `Color(0xFFFFFFFF)` | Primary titles and headlines |
| **Text Secondary** | `#A09CB0` | `Color(0xFFA09CB0)` | Subtitles, body copy, timestamps |
| **Text Dim** | `#64607B` | `Color(0xFF64607B)` | Placeholder text, disabled labels |
| **Border Glass** | `#2A2548` | `Color(0xFF2A2548)` | Card borders, divider lines |

---

### 2.2 Typography Scale

The typography uses clean sans-serif typefaces (Inter / Roboto) with explicit SP scale definitions:

| Scale Name | Size (SP) | Weight | Line Height (SP) | Compose Style Definition |
|---|---|---|---|---|
| **Display Large** | 32.sp | Bold (`FontWeight.W700`) | 40.sp | `Typography.displayLarge` |
| **Headline Large** | 24.sp | Bold (`FontWeight.W700`) | 32.sp | `Typography.headlineLarge` |
| **Headline Medium** | 20.sp | SemiBold (`FontWeight.W600`) | 28.sp | `Typography.headlineMedium` |
| **Title Large** | 18.sp | SemiBold (`FontWeight.W600`) | 24.sp | `Typography.titleLarge` |
| **Title Medium** | 16.sp | Medium (`FontWeight.W500`) | 22.sp | `Typography.titleMedium` |
| **Body Large** | 16.sp | Normal (`FontWeight.W400`) | 24.sp | `Typography.bodyLarge` |
| **Body Medium** | 14.sp | Normal (`FontWeight.W400`) | 20.sp | `Typography.bodyMedium` |
| **Label Large** | 14.sp | SemiBold (`FontWeight.W600`) | 18.sp | `Typography.labelLarge` |
| **Label Small** | 11.sp | Medium (`FontWeight.W500`) | 16.sp | `Typography.labelSmall` |

---

### 2.3 Spacing & Layout Tokens

| Token Name | Value (DP) | Usage |
|---|---|---|
| `Spacing.xs` | `4.dp` | Chip padding, badge gaps |
| `Spacing.s` | `8.dp` | Icon-to-text spacing, minor gaps |
| `Spacing.m` | `12.dp` | Inner card padding, list item gaps |
| `Spacing.l` | `16.dp` | Screen horizontal margins, primary padding |
| `Spacing.xl` | `24.dp` | Section spacing, card margins |
| `Spacing.xxl` | `32.dp` | Hero element spacing |
| `Spacing.xxxl` | `48.dp` | Minimum touch target size |

---

### 2.4 Corner Radius Tokens

| Token Name | Value (DP) | Usage |
|---|---|---|
| `Radius.small` | `8.dp` | Buttons, text fields, chips |
| `Radius.medium` | `12.dp` | List item cards, toast banners |
| `Radius.large` | `16.dp` | Modals, bottom sheets, dialogs |
| `Radius.extraLarge` | `24.dp` | Profile swipe cards, hero frames |
| `Radius.full` | `999.dp` | Circular avatars, pills, FABs |

---

## 3. Core Component Library

### 3.1 Buttons
1. **Primary CTA Button (`CollegeDateButton.Primary`)**:
   - Background: Gradient `Brush.horizontalGradient(listOf(Color(0xFF6C63FF), Color(0xFFFF4B72)))`
   - Content: White text, bold 16sp
   - Shape: `RoundedCornerShape(Radius.full)`
   - Minimum Height: `52.dp`
   - Touch Target: Enforces `48.dp` minimum width & height.
2. **Secondary Outline Button (`CollegeDateButton.Secondary`)**:
   - Border: `BorderStroke(1.dp, Color(0xFF2A2548))`
   - Background: `Color(0xFF161329)`
   - Content: Primary Violet text (`Color(0xFF6C63FF)`)
3. **Destructive Button (`CollegeDateButton.Destructive`)**:
   - Background: `Color(0x22FF3B30)`
   - Border: `BorderStroke(1.dp, Color(0xFFFF3B30))`
   - Content: Red text (`Color(0xFFFF3B30)`)
4. **Thumb-Zone Action Buttons**:
   - `PassButton`: Circular 60dp, Red icon (`✕`), Dark Surface background with Red border.
   - `LikeButton`: Circular 60dp, Green/Pink Heart icon (`❤️`), Dark Surface background with Pink border.
   - `SuperSwipeButton`: Circular 50dp, Gold Star icon (`⭐`), Dark Surface with Gold border.

---

### 3.2 Input Fields (`CollegeDateTextField`)
- **Container**: `OutlinedTextField`
- **Background**: `Color(0xFF161329)`
- **Border**: Unfocused `Color(0xFF2A2548)`, Focused `Color(0xFF6C63FF)`
- **Shape**: `RoundedCornerShape(Radius.medium)`
- **Keyboard Handling**: Accompanies `WindowInsets.ime` padding automatically.

---

### 3.3 Status Badges & Pills
1. **Live Badge (`LiveBadge`)**:
   - Background: Red gradient pill `Color(0xFFFF3B30)`
   - Icon: Pulsing Red Dot (`🔴`)
   - Text: `"LIVE"`
2. **Online Status Dot (`OnlineDot`)**:
   - Size: `10.dp`
   - Color: Green `Color(0xFF00E676)`
   - Border: `2.dp` solid `Color(0xFF0D0B18)`
3. **AI Verification Badge (`AIBadge`)**:
   - Color: Cyan `Color(0xFF00F2FE)`
   - Icon: Blue Checkmark Badge (`💙`)
4. **Campus Verification Badge (`CampusBadge`)**:
   - Color: Violet `Color(0xFF6C63FF)`
   - Icon: Graduation Cap (`🎓`)

---

### 3.4 Cards
1. **Swipe Profile Card (`SwipeCard`)**:
   - Shape: `RoundedCornerShape(24.dp)`
   - Image: Full-bleed Coil `AsyncImage` with bottom gradient scrim (`Brush.verticalGradient`)
   - Text: White bold title, age, campus tag, distance pill
2. **Account Hub Grid Tile (`AccountTileCard`)**:
   - Surface: `Color(0xFF161329)`
   - Border: `BorderStroke(1.dp, Color(0xFF2A2548))`
   - Content: Icon (32dp), Label (14sp), optional badge
3. **Confession Gist Card (`ConfessionCard`)**:
   - Surface: `Color(0xFF161329)`
   - Header: Anonymous avatar, campus tag, timestamp
   - Footer: Reaction breakdown strip (`Row` of emoji chips with reaction counts)

---

### 3.5 Navigation Elements
1. **Bottom Navigation Bar (`CollegeDateBottomBar`)**:
   - Surface: Glass dark `Color(0xFF161329)` with `Modifier.blur(16.dp)` background elevation
   - Items: Home, Swipe, Explore, Inbox (with unread badge), Profile
   - Selected Tint: `Color(0xFF6C63FF)`
   - Unselected Tint: `Color(0xFFA09CB0)`
2. **Top App Bar (`CollegeDateTopBar`)**:
   - Title: Brand typography or screen title
   - Actions: Notification Bell (with unread red badge), Wallet Pill (`₦X,XXX.XX`)

---

### 3.6 Modals & Bottom Sheets
1. **Modal Bottom Sheet (`CollegeDateBottomSheet`)**:
   - Container: `ModalBottomSheet`
   - Sheet Shape: `RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)`
   - Surface: `Color(0xFF1F1B38)`
   - Drag Handle: `Surface(color = Color(0xFFA09CB0), shape = CircleShape)`
2. **Alert Dialog (`CollegeDateAlertDialog`)**:
   - Shape: `RoundedCornerShape(20.dp)`
   - Container: `Color(0xFF1F1B38)`
   - Title/Text: White text, explicit action buttons

---

## 4. Animation & Motion Principles

1. **Easing Curves**:
   - Standard Motion: `FastOutSlowInEasing` (`CubicBezierEasing(0.4f, 0.0f, 0.2f, 1.0f)`)
   - Entrance: `LinearOutSlowInEasing`
   - Exit: `FastOutLinearInEasing`
2. **Swipe Card Drag Spec**:
   - Rotation angle proportional to drag offset (`offset.x / 20f`)
   - Velocity threshold: `1000.dp/s` for automatic fling swipe completion
3. **Tab Transitions**:
   - `Crossfade` or `AnimatedContent` with `fadeIn(tween(200))` and `fadeOut(tween(200))`

---

## 5. Accessibility Guidelines

1. **Touch Target Size**: Every interactive component enforces a minimum touch target of **48dp x 48dp**.
2. **Color Contrast**: Text colors maintain minimum **4.5:1** contrast ratio against dark background surfaces (`#0D0B18` & `#161329`).
3. **Screen Reader Semantics**: All icons and non-text elements include explicit `contentDescription` or `clearAndSetSemantics`.

---

## 6. Verification & Compliance Notes

- **Design Tokens, Typography Scale, Spacing, Radius, Component Library, Motion, and Accessibility fully documented.**
- **Stage 9 Native Design System Complete.**
