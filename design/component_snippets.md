# FinSight Component Snippets

Copy these snippets directly into your AI code editor for reference.

## Page Structure Template

```tsx
import { Layout } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";

export default function PageName() {
  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-display font-bold text-foreground">Page Title</h1>
          <p className="text-muted-foreground">Description of the page purpose.</p>
        </div>

        {/* Content goes here */}
      </div>
    </Layout>
  );
}
```

## KPI Card Component

```tsx
<Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
  <CardHeader className="flex flex-row items-center justify-between pb-2">
    <CardTitle className="text-sm font-medium text-muted-foreground">Label</CardTitle>
    <Icon className="h-4 w-4 text-primary" />
  </CardHeader>
  <CardContent>
    <div className="text-3xl font-bold font-display">$124,592.00</div>
    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
      <span className="text-green-600 flex items-center"><TrendingUp className="h-3 w-3 mr-1" /> +12.5%</span> from last month
    </p>
  </CardContent>
</Card>
```

## Drag-Drop Upload Zone

```tsx
const [isDragging, setIsDragging] = useState(false);
const [file, setFile] = useState<File | null>(null);

const handleDragOver = (e: React.DragEvent) => {
  e.preventDefault();
  setIsDragging(true);
};

const handleDrop = (e: React.DragEvent) => {
  e.preventDefault();
  setIsDragging(false);
  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
    setFile(e.dataTransfer.files[0]);
  }
};

return (
  <Card
    className={`
      relative h-96 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-8 text-center transition-all duration-300 overflow-hidden
      ${isDragging ? "border-primary bg-primary/5 scale-[1.02]" : "border-border hover:border-primary/50 hover:bg-muted/30"}
    `}
    onDragOver={handleDragOver}
    onDragLeave={() => setIsDragging(false)}
    onDrop={handleDrop}
  >
    {!file ? (
      <>
        <div className="relative z-10 bg-background/50 backdrop-blur-sm p-6 rounded-full mb-6">
          <UploadCloud className="h-10 w-10 text-primary" />
        </div>
        <h3 className="relative z-10 text-xl font-medium mb-2">Drag & Drop Files</h3>
        <p className="relative z-10 text-muted-foreground mb-6">Upload your PDF statements</p>
      </>
    ) : (
      <div className="flex flex-col items-center">
        <p className="text-lg font-semibold">{file.name}</p>
      </div>
    )}
  </Card>
);
```

## Transaction Table

```tsx
<Table>
  <TableHeader className="bg-muted/20">
    <TableRow className="hover:bg-transparent">
      <TableHead>Date</TableHead>
      <TableHead>Merchant</TableHead>
      <TableHead>Category</TableHead>
      <TableHead>Status</TableHead>
      <TableHead className="text-right">Amount</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {transactions.map((tx) => (
      <TableRow key={tx.id} className="group cursor-pointer hover:bg-muted/30 transition-colors">
        <TableCell className="font-mono text-xs text-muted-foreground">{tx.date}</TableCell>
        <TableCell className="font-medium">
          <div className="flex items-center gap-3">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
              tx.type === 'credit' ? 'bg-green-100 text-green-700' : 'bg-muted'
            }`}>
              {tx.type === 'credit' ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
            </div>
            {tx.merchant}
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="secondary" className="font-normal">
            {tx.category}
          </Badge>
        </TableCell>
        <TableCell>
          <span className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded-full ${
            tx.status === 'Completed' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
          }`}>
            {tx.status}
          </span>
        </TableCell>
        <TableCell className="text-right font-mono font-medium">
          {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)}
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

## Recharts Area Chart (Cash Flow)

```tsx
<ResponsiveContainer width="100%" height="100%">
  <AreaChart data={CASHFLOW_DATA} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
    <defs>
      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
      </linearGradient>
      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
        <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
      </linearGradient>
    </defs>
    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))'}} />
    <YAxis axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))'}} tickFormatter={(value) => `$${value/1000}k`} />
    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))' }} />
    <Area type="monotone" dataKey="income" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
    <Area type="monotone" dataKey="expense" stroke="hsl(var(--destructive))" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
  </AreaChart>
</ResponsiveContainer>
```

## Search Input with Icon

```tsx
<div className="relative w-full">
  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
  <Input 
    placeholder="Search merchants or amounts..."
    className="pl-9 bg-muted/30 border-transparent focus:bg-background focus:border-input transition-all"
  />
</div>
```

## Filter Button Group

```tsx
<div className="flex gap-2">
  <Button variant="outline" size="sm" className="gap-2 h-10 border-dashed">
    <Filter className="h-3.5 w-3.5" />
    Category
  </Button>
  <Button variant="outline" size="sm" className="gap-2 h-10 border-dashed">
    <SlidersHorizontal className="h-3.5 w-3.5" />
    Amount
  </Button>
</div>
```

## Framer Motion Entry Animation

```tsx
import { motion } from "framer-motion";

<motion.div 
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: index * 0.1, duration: 0.3 }}
  className="your-classes"
>
  Content
</motion.div>
```

## Tab Navigation (Charts)

```tsx
<Tabs defaultValue="cashflow">
  <TabsList className="bg-muted/30 p-1">
    <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
    <TabsTrigger value="categories">Categories</TabsTrigger>
  </TabsList>
  
  <TabsContent value="cashflow" className="mt-6">
    {/* Chart content */}
  </TabsContent>
  
  <TabsContent value="categories" className="mt-6">
    {/* Different chart content */}
  </TabsContent>
</Tabs>
```

## Pie Chart (Distribution)

```tsx
<Pie
  data={CATEGORY_DATA}
  innerRadius={80}
  outerRadius={110}
  paddingAngle={5}
  dataKey="value"
>
  {CATEGORY_DATA.map((entry, index) => (
    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
  ))}
</Pie>
```

## AI Insight Box

```tsx
<div className="mt-8 p-4 bg-muted/30 rounded-lg border border-border/50">
  <h4 className="font-semibold mb-2 text-sm">AI Insight</h4>
  <p className="text-xs text-muted-foreground">
    Your operations spending is 15% higher than industry average. Consider reviewing subscriptions.
  </p>
</div>
```

## Responsive Grid

```tsx
{/* 1 col on mobile, 3 cols on desktop */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  {/* Grid items */}
</div>

{/* 1 col on mobile, 2 cols on desktop */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  {/* Grid items */}
</div>
```

## Sidebar Navigation Item

```tsx
<Link href={item.href}>
  <div
    className={cn(
      "flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 cursor-pointer",
      isActive
        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
        : "text-sidebar-foreground/70 hover:bg-sidebar-accent"
    )}
  >
    <item.icon className="h-4 w-4" />
    <span className="font-medium text-sm">{item.label}</span>
  </div>
</Link>
```

## User Card (Sidebar Footer)

```tsx
<div className="p-4 border-t border-sidebar-border">
  <div className="flex items-center gap-3 p-2 rounded-md hover:bg-sidebar-accent transition-colors cursor-pointer">
    <Avatar className="h-8 w-8 border border-sidebar-border">
      <AvatarImage src="url" />
      <AvatarFallback>JD</AvatarFallback>
    </Avatar>
    <div className="flex-1 overflow-hidden">
      <p className="text-sm font-medium truncate">Jane Doe</p>
      <p className="text-xs text-muted-foreground truncate">jane@email.com</p>
    </div>
  </div>
</div>
```

---

**Use these snippets as building blocks** - Mix and match patterns to create new pages and components while maintaining design consistency.
