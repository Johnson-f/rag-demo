# AI Thinking Process - Collapsible UI Feature

## Overview

Added a collapsible "AI Thinking Process" section to the chat interface that allows users to view and hide the AI's reasoning before it presents the final formatted response.

## Problem

When the AI responds to queries, it sometimes includes reasoning/thinking text before the actual structured response (e.g., before "Trade-by-trade insights"). This thinking process can be valuable for understanding the AI's approach, but it can also clutter the interface.

## Solution

Implemented a collapsible section using shadcn/ui's Collapsible component that:

1. **Automatically detects thinking sections** - Parses the AI response to identify reasoning text that appears before structured content
2. **Shows a collapsible trigger** - Displays an amber-colored banner with "AI Thinking Process" label
3. **Allows expand/collapse** - Users can click to show or hide the thinking content
4. **Maintains clean UI** - The main response is always visible, with thinking as optional context

## Implementation Details

### Detection Logic

The component uses a `useEffect` hook to parse the AI response:

```typescript
// Detect where thinking ends - look for markdown headers or structured content
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  // If we find a markdown header (##) or a clear section start
  if (line.startsWith('##') || line.startsWith('# ') || 
      line.match(/^(Trade-by-trade|Portfolio|Summary|Analysis)/i)) {
    thinkingEndIndex = i;
    break;
  }
}
```

### UI Components

- **Trigger Button**: Amber-colored banner with chevron icon that rotates when expanded
- **Content Area**: Light amber background with markdown rendering
- **Icons**: Lightbulb icon to represent "thinking" + chevron for expand/collapse state

### Visual Design

- **Colors**: Amber theme (amber-50, amber-100, amber-600, amber-800) to distinguish from main content
- **Animation**: Smooth chevron rotation on expand/collapse
- **Hover States**: Subtle background color change on hover
- **Typography**: Smaller prose styling for thinking content

## Files Modified

1. **frontend/src/components/trades/chat.tsx**
   - Added state management for thinking section
   - Added parsing logic to separate thinking from response
   - Added Collapsible UI component

2. **frontend/src/components/ui/collapsible.tsx**
   - Fixed import statement for @radix-ui/react-collapsible

3. **frontend/package.json**
   - Added @radix-ui/react-collapsible dependency

## Usage

The feature works automatically:

1. User sends a message to the AI
2. AI responds with thinking + structured content
3. If thinking is detected (>50 characters before structured content):
   - Collapsible section appears above the main response
   - User can click to expand/collapse
4. If no thinking detected:
   - Only the main response is shown (no collapsible section)

## Example Scenarios

### With Thinking Section
```
User: "my last 5 trades"

AI Response:
[Thinking Section - Collapsible]
"The user says: 'my last 5 trades'. However, we have no trade data..."

[Main Response]
## Trade-by-trade insights
1. QBTS: ...
2. SNAP: ...
```

### Without Thinking Section
```
User: "What's my win rate?"

AI Response:
## Win Rate Analysis
Your win rate is 45.2%...
```

## Benefits

1. **Transparency**: Users can see how the AI reasons through problems
2. **Clean Interface**: Thinking is hidden by default to avoid clutter
3. **Educational**: Helps users understand AI decision-making
4. **Flexible**: Users choose when to view thinking details
5. **Visual Distinction**: Amber color clearly separates thinking from results

## Future Enhancements

- Add "Always show thinking" user preference
- Add thinking time/token count metrics
- Improve detection patterns for different AI models
- Add syntax highlighting for code in thinking sections
- Add export functionality for thinking + response together
