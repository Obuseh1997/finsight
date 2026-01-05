# FinSight - Modern Banking UI Design System

## Overview
A sophisticated, modern fintech design system inspired by Mercury, Rippling, and high-end banking platforms. Built with React, Tailwind CSS v4, Radix UI, and Framer Motion.

---

## Color Palette

### Light Mode
```css
--background: 210 20% 98%     /* Slightly cool white */
--foreground: 222 47% 11%     /* Deep navy/black text */
--card: 0 0% 100%              /* Pure white surfaces */
--card-foreground: 222 47% 11%
--primary: 221 83% 53%         /* Vivid tech blue */
--primary-foreground: 210 40% 98%
--secondary: 210 40% 96%       /* Light gray */
--secondary-foreground: 222 47% 11%
--muted: 210 40% 96%
--muted-foreground: 215 16% 47%
--accent: 210 40% 96%
--accent-foreground: 222 47% 11%
--destructive: 0 84% 60%       /* Alert red */
--destructive-foreground: 210 40% 98%
--border: 214 32% 91%          /* Subtle borders */
--input: 214 32% 91%
```

### Dark Mode
```css
--background: 222 47% 11%      /* Deep navy */
--foreground: 210 40% 98%      /* Off-white text */
--card: 222 47% 13%
--card-foreground: 210 40% 98%
--primary: 217 91% 60%         /* Brighter blue for contrast */
--primary-foreground: 222 47% 11%
```

### Charts & Semantic Colors
- **Chart-1:** `221 83% 53%` - Primary blue (income, positive)
- **Chart-2:** `173 58% 39%` - Teal (secondary metrics)
- **Chart-3:** `197 37% 24%` - Navy (tertiary)
- **Chart-4:** `43 74% 66%` - Gold (accents/highlights)
- **Chart-5:** `27 87% 67%` - Orange (warnings/secondary actions)

---

## Typography

### Font Stack
- **Display Font:** `Outfit` (400, 500, 600, 700) — Modern, tech-forward headings
- **Body Font:** `Inter` (300, 400, 500, 600) — Clean, legible UI text
- **Fallback:** system fonts

### Type Scale
```
h1: 2rem (32px) - font-display, font-bold, tracking-tight
h2: 1.875rem (30px) - font-display, font-bold, tracking-tight
h3: 1.5rem (24px) - font-display, font-semibold
Body Large: 1.125rem (18px) - font-medium
Body: 1rem (16px) - font-normal
Body Small: 0.875rem (14px) - text-sm
Label: 0.75rem (12px) - text-xs, uppercase, tracking-wider
Mono: font-mono - for transaction IDs, amounts
```

### Line Height
- Headings: `1.2`
- Body: `1.6`
- Compact: `1.4`

---

## Spacing System

### Scale (Base: 0.25rem = 4px)
```
xs: 0.25rem (2px)
sm: 0.5rem (4px)
md: 1rem (8px)
lg: 1.5rem (12px)
xl: 2rem (16px)
2xl: 2.5rem (20px)
3xl: 3rem (24px)
4xl: 4rem (32px)
```

### Common Patterns
- **Card padding:** `p-6` or `p-8`
- **Section spacing:** `gap-8` or `space-y-8`
- **Component padding:** `px-3 py-2` (buttons), `px-4 py-3` (inputs)
- **Border radius:** `0.5rem` (default), `rounded-lg` for cards, `rounded-xl` for hero elements

---

## Shadow & Depth System

### Shadows
- **None:** Flat, minimal design preference
- **Subtle:** `shadow-sm` — Cards, dropdowns, subtle elevation
- **Medium:** `shadow-md` — Larger components, modals
- **Large:** `shadow-lg` — Hero sections, emphasis

### Layering Strategy
- Use **minimal shadows** by default
- Apply shadows on **interactive elevation** (hover states)
- Use **subtle backdrop blur** (`backdrop-blur-sm`) for modals and overlays

---

## Component Library

### Core Components

#### Button
```tsx
// Primary Action
<Button className="gap-2">
  <Icon className="h-4 w-4" />
  Action
</Button>

// Outline (Secondary)
<Button variant="outline" className="gap-2">
  <Icon className="h-4 w-4" />
  Action
</Button>

// Ghost (Tertiary)
<Button variant="ghost">Subtle Action</Button>
```

#### Card
```tsx
<Card className="border-border/60 shadow-sm">
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Subtitle</CardDescription>
  </CardHeader>
  <CardContent>Content here</CardContent>
</Card>
```

#### Input
```tsx
<Input 
  placeholder="Search..." 
  className="pl-9 bg-muted/30 border-transparent focus:bg-background focus:border-input transition-all" 
/>
```

#### Badge
```tsx
// Status badge
<Badge variant="secondary" className="font-normal bg-muted text-muted-foreground">
  Category
</Badge>

// Status indicator
<span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full bg-green-50 text-green-700">
  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
  Completed
</span>
```

#### Table
```tsx
<Table>
  <TableHeader className="bg-muted/20">
    <TableRow className="hover:bg-transparent">
      <TableHead>Column</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow className="group cursor-pointer hover:bg-muted/30 transition-colors">
      <TableCell>Data</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

#### Tabs
```tsx
<Tabs defaultValue="tab1">
  <TabsList className="bg-muted/30 p-1">
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
</Tabs>
```

---

## Layout Patterns

### Sidebar Navigation
```tsx
<div className="h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col fixed left-0 top-0">
  {/* Header with logo */}
  <div className="p-6 flex items-center gap-3">
    <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
      <Icon className="h-5 w-5 text-primary-foreground" />
    </div>
    <span className="font-display font-bold text-xl">FinSight</span>
  </div>

  {/* Navigation items */}
  <div className="flex-1 px-4 py-4 space-y-1">
    <NavItem active={isActive} label="Item" icon={Icon} />
  </div>

  {/* Footer with user */}
  <div className="p-4 border-t border-sidebar-border">
    <UserCard />
  </div>
</div>
```

### Main Content Area
```tsx
<main className="pl-64 container mx-auto p-8 max-w-7xl">
  {/* Page content with entry animation */}
</main>
```

### Hero/Empty State
```tsx
<Card className="relative h-96 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-8 text-center">
  <div className="absolute inset-0 z-0 opacity-40 pointer-events-none flex items-center justify-center">
    <img src={asset} className="w-64 h-64 object-contain opacity-20 blur-sm" />
  </div>

  <div className="relative z-10 bg-background/50 backdrop-blur-sm p-6 rounded-full">
    <Icon className="h-10 w-10 text-primary" />
  </div>

  <h3 className="relative z-10 text-xl font-medium mb-2">Title</h3>
  <p className="relative z-10 text-muted-foreground mb-6">Description</p>
</Card>
```

---

## Micro-interactions & Animations

### Entry Animations
```tsx
{/* Page fade-in + slide up */}
<main className="animate-in fade-in slide-in-from-bottom-4 duration-500">

{/* Card staggered entrance */}
<motion.div 
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: i * 0.1 }}
>
  Content
</motion.div>
```

### Hover States
```tsx
// Elevation on hover
className="hover:bg-muted/30 transition-colors"

// Subtle scale
className="hover:scale-[1.02] transition-transform"

// Color shift
className="hover:text-primary transition-colors"
```

### Transitions
- **Default:** `transition-colors` or `transition-all` with `duration-200`
- **Smooth:** `duration-300` for larger movements
- **Fast:** `duration-150` for micro-interactions

---

## Data Visualization

### Chart Colors (Recharts Integration)
```tsx
const colors = {
  primary: 'hsl(221 83% 53%)',     // Blue
  success: 'hsl(173 58% 39%)',     // Teal
  warning: 'hsl(43 74% 66%)',      // Gold
  danger: 'hsl(27 87% 67%)',       // Orange
};
```

### Area Chart (Cash Flow)
```tsx
<AreaChart data={data}>
  <defs>
    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
    </linearGradient>
  </defs>
  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
  <XAxis tick={{fill: 'hsl(var(--muted-foreground))'}} />
  <Area type="monotone" dataKey="income" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorIncome)" />
</AreaChart>
```

### Pie Chart (Distribution)
```tsx
<PieChart>
  <Pie
    data={data}
    innerRadius={80}
    outerRadius={110}
    paddingAngle={5}
    dataKey="value"
  >
    {data.map((entry, index) => (
      <Cell key={`cell-${index}`} fill={entry.color} />
    ))}
  </Pie>
</PieChart>
```

---

## Interaction Patterns

### Transaction Table Row
- **Hover:** Subtle background elevation (`bg-muted/30`)
- **Active:** Highlight with primary border
- **Status Indicator:** Color-coded pill (green for completed, yellow for pending)
- **Amount:** Different colors for debit (gray) vs credit (green)

### Form Input Focus
```tsx
className="bg-muted/30 border-transparent focus:bg-background focus:border-input transition-all"
```

### Filter/Action Buttons
```tsx
<Button variant="outline" size="sm" className="gap-2 h-10 border-dashed">
  <Icon className="h-3.5 w-3.5" />
  Filter
</Button>
```

---

## Responsive Design

### Breakpoints
- **Mobile:** `<640px`
- **Tablet:** `640px - 1024px`
- **Desktop:** `>1024px`

### Layout Adjustments
```tsx
// Sidebar: fixed on desktop, drawer on mobile
className="pl-64 md:pl-0"

// Grid: 1 col mobile, 2-3 cols desktop
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"

// Flex: stack mobile, row desktop
className="flex flex-col md:flex-row"
```

---

## Accessibility & Data Test IDs

### Pattern
```tsx
// Interactive elements
data-testid="button-submit"
data-testid="input-email"
data-testid="link-profile"

// Display elements
data-testid="text-username"
data-testid="status-payment"

// Lists/Dynamic content
data-testid={`card-product-${productId}`}
data-testid={`row-transaction-${index}`}
```

---

## Design Principles

1. **Clarity Over Decoration:** Information hierarchy takes precedence
2. **Minimalist Shadows:** Use elevation sparingly for emphasis
3. **Generous Whitespace:** Breathing room makes premium feel
4. **Semantic Color:** Red = danger, Green = success, Blue = primary action
5. **Smooth Transitions:** All interactive elements should feel responsive
6. **Icon + Label:** Always pair icons with text for clarity
7. **Consistent Spacing:** Use the spacing scale for rhythm

---

## Usage Instructions for AI Code Editors

1. **Copy this entire document** into your AI editor's context window
2. **Reference components** by their patterns above
3. **Use color variables** from the palette (e.g., `hsl(var(--primary))`)
4. **Follow the animation patterns** for consistent micro-interactions
5. **Maintain the sidebar + main layout** for multi-page apps
6. **Test with data** to ensure responsive behavior on all breakpoints

---

## File Structure
```
client/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   └── AppShell.tsx          (Sidebar + Layout wrapper)
│   │   └── ui/                       (Radix UI components)
│   ├── pages/
│   │   ├── Upload.tsx                (File upload with drag-drop)
│   │   ├── Review.tsx                (Transaction table)
│   │   └── Insights.tsx              (Charts dashboard)
│   ├── App.tsx                       (Route configuration)
│   └── index.css                     (Design tokens & theme)
```

---

**Last Updated:** December 2024
**Framework:** React 19 + Tailwind CSS v4 + Radix UI
