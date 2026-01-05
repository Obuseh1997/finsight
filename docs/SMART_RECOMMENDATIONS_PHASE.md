# Smart Recommendations - Phase 3 Planning

## Vision

**Goal**: Provide actionable, personalized spending recommendations based on user context and goals.

**Example**:
> "You spent $450 on Uber this month. You could save $150/month by using Lyft (avg $12/ride vs $18) or $300/month with a monthly bus pass ($100)."

---

## User Input Requirements

To provide smart recommendations, we need to understand:

### 1. **Financial Goals**
- Monthly savings target: `$500`
- Reason for saving: `Emergency fund`, `Vacation`, `Pay off debt`
- Timeline: `6 months`, `1 year`, `2 years`

### 2. **Budget Constraints**
- Total monthly budget: `$3,000`
- Category budgets:
  - Groceries: `$400`
  - Dining: `$200`
  - Transportation: `$300`
  - Entertainment: `$150`

### 3. **Lifestyle Context**
- **Transportation**: Do you own a car? Have access to public transit?
- **Dining**: Do you enjoy cooking? Have time to meal prep?
- **Shopping**: Are there stores nearby? Can you wait for sales?

### 4. **Merchant Preferences** (The "Why")
- **Uber**: "Need it for work commute" → Keep, don't reduce
- **Starbucks**: "Habit, could cut back" → Recommend alternatives
- **Grocery Store A**: "Only option nearby" → Can't change
- **Grocery Store B**: "Closer to work" → Could consolidate

---

## Recommendation Types

### Type 1: **Cheaper Alternative**
```
You spent $450 on Uber (25 rides @ avg $18)
💡 Consider: Lyft costs $12/ride avg = save $150/month
```

**Data needed**:
- Average cost per ride for current merchant
- Average cost per ride for alternative
- Number of transactions

### Type 2: **Bundle/Subscription Savings**
```
You spent $400 on transit (40 rides @ $10)
💡 Consider: Monthly pass costs $100 = save $300/month
```

**Data needed**:
- Transaction frequency
- Per-use cost
- Available subscription options

### Type 3: **Consolidation**
```
You spent $600 across 3 grocery stores:
- Food Basics: $250 (10 trips)
- Loblaws: $200 (5 trips)
- Metro: $150 (3 trips)

💡 Consider: Shopping at Food Basics only could save 10-15% ($60-90/month)
```

**Data needed**:
- Multiple merchants in same category
- Average per-trip spending
- Price comparison data

### Type 4: **Frequency Reduction**
```
You visited Starbucks 22 times ($5.50 avg) = $121
💡 Consider: Reducing to 10 visits/month = save $66/month
```

**Data needed**:
- Transaction frequency
- Average transaction amount
- User-set goal frequency

### Type 5: **Timing Optimization**
```
You spent $300 on shopping, mostly at full price
💡 Consider: Waiting for sales could save 20-30% ($60-90/month)
```

**Data needed**:
- Transaction timing
- Historical price data (if available)
- Seasonality patterns

---

## Implementation Approach

### Phase 3A: User Profile & Goals (NEW PAGE)

**New Page**: `/onboarding` or `/goals`

```
┌─────────────────────────────────────────┐
│ Let's Personalize Your Experience      │
├─────────────────────────────────────────┤
│                                         │
│ What's your monthly savings goal?      │
│ [$___________] 500                     │
│                                         │
│ Why are you saving?                     │
│ ○ Emergency fund                        │
│ ● Vacation                              │
│ ○ Pay off debt                         │
│ ○ Other: _____________                 │
│                                         │
│ Your Monthly Budget                     │
│ Total: [$_____] 3000                   │
│                                         │
│ Category Budgets (Optional)             │
│ Groceries:       [$___] 400            │
│ Dining:          [$___] 200            │
│ Transportation:  [$___] 300            │
│                                         │
│ [Save & Continue] →                    │
└─────────────────────────────────────────┘
```

**Data stored**:
```json
{
  "user_profile": {
    "savings_goal_monthly": 500,
    "savings_reason": "vacation",
    "timeline_months": 12,
    "total_budget": 3000,
    "category_budgets": {
      "Groceries": 400,
      "Dining": 200,
      "Transportation": 300
    }
  }
}
```

### Phase 3B: Merchant Context (IN REVIEW PAGE)

**Enhanced Review Page**: Add context for each merchant

```
┌──────────────────────────────────────────┐
│ Uber ($450, 25 transactions)             │
│                                          │
│ Why do you use Uber?                     │
│ ● Essential for work commute             │
│ ○ Convenience, could use alternatives    │
│ ○ Rarely use, can eliminate              │
│                                          │
│ Are there alternatives you'd consider?   │
│ ☑ Lyft                                   │
│ ☑ Public transit                         │
│ ☐ Carpooling                            │
│ ☐ None                                  │
└──────────────────────────────────────────┘
```

**Data stored with merchant**:
```json
{
  "merchant": "uber",
  "necessity": "essential",
  "alternatives_considered": ["lyft", "public_transit"],
  "willing_to_reduce": false
}
```

### Phase 3C: Recommendations Engine (BACKEND)

**New Python script**: `generate_recommendations.py`

```python
def generate_recommendations(
    transactions,
    user_profile,
    merchant_contexts
):
    recommendations = []

    # Analyze by category
    for category, spending in category_spending.items():
        budget = user_profile['category_budgets'].get(category)

        if budget and spending > budget:
            # Over budget!
            overage = spending - budget

            # Find merchants in this category
            merchants = get_merchants_in_category(category)

            for merchant in merchants:
                context = merchant_contexts.get(merchant)

                if context['necessity'] != 'essential':
                    # Generate recommendations
                    recs = analyze_merchant_alternatives(
                        merchant,
                        context,
                        overage
                    )
                    recommendations.extend(recs)

    return recommendations
```

### Phase 3D: Recommendations Page (NEW PAGE)

**New Page**: `/recommendations`

```
┌─────────────────────────────────────────────────────┐
│ 💡 Smart Recommendations                            │
├─────────────────────────────────────────────────────┤
│ Based on your goal to save $500/month:              │
│                                                      │
│ 🎯 You're $150 away from your goal!                │
│                                                      │
│ Top Opportunities to Save:                          │
│                                                      │
│ ┌─────────────────────────────────────────────┐   │
│ │ 🚗 Transportation: Save $150/month          │   │
│ │                                             │   │
│ │ You spent $450 on Uber (25 rides)          │   │
│ │                                             │   │
│ │ ✅ Switch to Lyft                          │   │
│ │    Avg $12/ride vs $18 = -$150/month       │   │
│ │    [I'll try this] [Not for me]            │   │
│ │                                             │   │
│ │ ✅ Monthly transit pass                    │   │
│ │    $100/month vs $450 = -$350/month        │   │
│ │    ⚠️  Requires lifestyle change            │   │
│ │    [I'll try this] [Not for me]            │   │
│ └─────────────────────────────────────────────┘   │
│                                                      │
│ ┌─────────────────────────────────────────────┐   │
│ │ ☕ Dining: Save $66/month                   │   │
│ │                                             │   │
│ │ You visited Starbucks 22 times ($121)      │   │
│ │                                             │   │
│ │ ✅ Reduce to 10 visits/month               │   │
│ │    Same enjoyment, less frequency          │   │
│ │    = -$66/month                            │   │
│ │    [Set goal] [Not for me]                 │   │
│ └─────────────────────────────────────────────┘   │
│                                                      │
│ [View All Recommendations]                          │
└─────────────────────────────────────────────────────┘
```

---

## Data Architecture

### User Profile (localStorage)
```typescript
interface UserProfile {
  savings_goal_monthly: number;
  savings_reason: string;
  timeline_months: number;
  total_budget: number;
  category_budgets: {
    [category: string]: number;
  };
  created_at: string;
  updated_at: string;
}
```

### Merchant Context (localStorage + merchant_dictionary)
```typescript
interface MerchantContext {
  merchant_id: string;
  necessity: 'essential' | 'nice-to-have' | 'can-eliminate';
  alternatives_considered: string[];
  willing_to_reduce: boolean;
  notes?: string;
}
```

### Recommendation
```typescript
interface Recommendation {
  id: string;
  type: 'cheaper_alternative' | 'bundle' | 'consolidation' | 'frequency_reduction' | 'timing';
  category: string;
  merchant_current: string;

  // Current state
  current_monthly_spend: number;
  current_frequency: number;

  // Recommendation
  recommendation_text: string;
  alternative_merchant?: string;
  estimated_savings_monthly: number;
  effort_level: 'low' | 'medium' | 'high';

  // User action
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  accepted_at?: string;
}
```

---

## Alternative Data Sources

To provide accurate alternatives, we need data:

### Option 1: Manual Curated Database
Create a simple JSON with common alternatives:

```json
{
  "uber": {
    "alternatives": [
      {
        "name": "Lyft",
        "avg_cost_per_ride": 12,
        "availability": "most cities"
      },
      {
        "name": "Public Transit",
        "avg_cost_per_ride": 3.25,
        "availability": "urban areas"
      }
    ]
  },
  "starbucks": {
    "alternatives": [
      {
        "name": "Tim Hortons",
        "avg_cost": 3.50
      },
      {
        "name": "Home brew",
        "avg_cost": 0.50
      }
    ]
  }
}
```

### Option 2: User-Generated
Let users suggest alternatives during review

### Option 3: API Integration (Future)
- Price comparison APIs
- Transit API for routes/costs
- Merchant deals/coupons

---

## UI/UX Flow

### Complete User Journey

```
1. Upload PDF → Extract transactions
   ↓
2. Review Page → Assign categories + merchant context
   ↓
3. Onboarding Page → Set goals & budgets
   ↓
4. Insights Page → See spending breakdown
   ↓
5. Recommendations Page → Get personalized suggestions
   ↓
6. Track Progress → See savings over time
```

---

## MVP Scope (Phase 3A)

**Must Have**:
1. ✅ User profile page (goals, budget)
2. ✅ Merchant context in review page
3. ✅ Basic recommendations engine
4. ✅ Recommendations display page

**Data Sources**:
- ✅ User input (profile, context)
- ✅ Transaction history
- ✅ Simple alternatives database (curated JSON)

**Recommendation Types**:
- ✅ Frequency reduction (easy)
- ✅ Cheaper alternative (if in database)
- ⚠️ Bundle/subscription (needs research)

**Nice to Have** (Future):
- ❌ Price comparison API
- ❌ Historical tracking
- ❌ Goal progress visualization

---

## Technical Implementation

### New Files Needed

**Frontend**:
- `/pdf-insights-app/app/profile/page.tsx` - User goals & budget
- `/pdf-insights-app/app/recommendations/page.tsx` - Show recommendations
- `/pdf-insights-app/lib/user-profile.ts` - Profile utilities

**Backend**:
- `generate_recommendations.py` - Recommendations engine
- `alternatives_database.json` - Curated alternatives
- `/pdf-insights-app/app/api/recommendations/route.ts` - API endpoint

**Data**:
- Update localStorage schema for user profile
- Add merchant_context to review page

---

## Open Questions

1. **How detailed should budget tracking be?**
   - Per-category only?
   - Per-merchant within category?

2. **Should we track recommendation acceptance?**
   - Yes → Can show progress over time
   - No → Just one-time suggestions

3. **How to handle seasonal spending?**
   - Holiday shopping spikes
   - Summer vacation costs

4. **Multi-month analysis?**
   - Show trends: "You spent 20% more on dining this month"
   - Requires storing historical data

5. **Should alternatives be editable by user?**
   - Let users add their own alternatives
   - Crowdsourced alternative suggestions

---

## Next Steps

### Week 1: User Profile
1. Design profile page UI
2. Create localStorage schema
3. Build profile form
4. Add to navigation

### Week 2: Merchant Context
1. Add context questions to review page
2. Store context with merchant dictionary
3. UI for quick context capture

### Week 3: Recommendations Engine
1. Build `generate_recommendations.py`
2. Create alternatives database JSON
3. Implement recommendation logic
4. Test with sample data

### Week 4: Recommendations UI
1. Design recommendations page
2. Build recommendation cards
3. Add accept/reject actions
4. Show savings potential

---

## Success Metrics

**How we know it's working**:
1. ✅ Users complete profile onboarding: >80%
2. ✅ Users add merchant context: >50%
3. ✅ Recommendations generated: >3 per user
4. ✅ Recommendations accepted: >30%
5. ✅ Actual savings tracked: Show month-over-month

---

*Phase 3 Planning Document*
*Created: 2025-12-29*
*Status: Ready for Implementation*
