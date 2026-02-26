# AI Thinking Collapsible - UI Example

## Visual Layout

### Collapsed State (Default)

```
┌─────────────────────────────────────────────────────────────┐
│ 🔍 AI Response                                    [Copy] [Clear] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ ▶ 💡 AI Thinking Process                      Show │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ ## Trade-by-trade insights                                 │
│                                                             │
│ 1. **QBTS** ($18.85 → $18.90)                             │
│    - Profit: $0.15 (0.27%)                                │
│    - Entry: Inside day near pivot                         │
│    ...                                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Expanded State

```
┌─────────────────────────────────────────────────────────────┐
│ 🔍 AI Response                                    [Copy] [Clear] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ ▼ 💡 AI Thinking Process                      Hide │   │
│ ├─────────────────────────────────────────────────────┤   │
│ │                                                     │   │
│ │ The user says: "my last 5 trades". However, we    │   │
│ │ have no trade data from the context. The           │   │
│ │ guidelines say: If the context doesn't contain     │   │
│ │ relevant information, say so honestly.             │   │
│ │                                                     │   │
│ │ Thus we need to respond: "I don't have access to   │   │
│ │ your trade data. Could you provide details?"       │   │
│ │                                                     │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ ## Trade-by-trade insights                                 │
│                                                             │
│ 1. **QBTS** ($18.85 → $18.90)                             │
│    - Profit: $0.15 (0.27%)                                │
│    - Entry: Inside day near pivot                         │
│    ...                                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Color Scheme

### Thinking Section (Collapsed)
- Background: `bg-amber-50` (light amber)
- Border: `border-amber-200` (amber border)
- Text: `text-amber-800` (dark amber)
- Icon: `text-amber-600` (medium amber)
- Hover: `hover:bg-amber-100` (slightly darker amber)

### Thinking Section (Expanded Content)
- Background: `bg-amber-50/50` (semi-transparent amber)
- Border: `border-amber-100` (light amber border)
- Text: `text-gray-700` (readable gray)

### Main Response
- Background: White (card default)
- Text: Default prose styling

## Interactive States

### Hover
```
┌─────────────────────────────────────────────────────┐
│ ▶ 💡 AI Thinking Process                      Show │  ← Slightly darker background
└─────────────────────────────────────────────────────┘
```

### Transition
- Chevron rotates 90° when expanding
- Content slides down smoothly
- Height animates automatically

## Responsive Behavior

- **Desktop**: Full width with comfortable padding
- **Tablet**: Maintains layout, slightly reduced padding
- **Mobile**: Stacks vertically, touch-friendly tap targets

## Accessibility

- **Keyboard Navigation**: Tab to focus, Enter/Space to toggle
- **Screen Readers**: Announces "AI Thinking Process, button, collapsed/expanded"
- **Focus Indicators**: Clear focus ring on keyboard navigation
- **ARIA Attributes**: Proper `aria-expanded` and `aria-controls` attributes

## Detection Patterns

The component detects thinking sections by looking for:

1. **Markdown Headers**: Lines starting with `##` or `#`
2. **Section Keywords**: "Trade-by-trade", "Portfolio", "Summary", "Analysis"
3. **Minimum Length**: At least 50 characters before structured content

### Example Detection

```typescript
Input:
"The user says: 'my last 5 trades'...
Thus we need to respond...

## Trade-by-trade insights
1. QBTS..."

Output:
- Thinking: "The user says: 'my last 5 trades'... Thus we need to respond..."
- Response: "## Trade-by-trade insights\n1. QBTS..."
```

## Edge Cases

### No Thinking Detected
- Collapsible section doesn't appear
- Only main response is shown

### Very Short Thinking (<50 chars)
- Treated as part of main response
- No collapsible section

### All Thinking, No Structure
- Entire response shown as main content
- No collapsible section

### Streaming in Progress
- Thinking section appears once detected
- Updates in real-time as content streams
- Collapsible state persists during streaming
