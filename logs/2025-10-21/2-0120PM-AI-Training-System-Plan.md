# AI Training & Improvement System Plan

**Date:** October 21, 2025
**Time:** 1:20 PM EST
**Purpose:** Design a self-improving AI proposal system through admin feedback and training

---

## Core Concept

Create a feedback loop where every proposal becomes training data:
1. AI generates proposal
2. Admin reviews and edits with explanations
3. Track outcome (won/lost)
4. AI learns from patterns and improves over time

---

## Key Requirements (From User Feedback)

✅ Portfolio pieces are global (shared)
✅ No admin approval workflow
✅ No file uploads - only links (Loom, Google Drive, Figma)
✅ No Upwork-specific tracking
🎯 **Admin must train AI by editing proposals with explanations**
🎯 **System must continuously improve proposal quality**

---

## Database Schema for AI Training

### 1. Proposal Feedback Table (`proposal_feedback`)
```sql
CREATE TABLE proposal_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE,

  -- Original AI output
  ai_generated_text TEXT NOT NULL,
  ai_prompt_used TEXT NOT NULL,
  ai_model_version TEXT, -- Track which prompt version was used

  -- Admin edits
  admin_edited_text TEXT, -- What admin changed it to
  edited_by UUID REFERENCES profiles(id),
  edited_at TIMESTAMPTZ,

  -- Structured feedback
  overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),

  -- Specific ratings
  tone_rating INTEGER CHECK (tone_rating BETWEEN 1 AND 5),
  relevance_rating INTEGER CHECK (relevance_rating BETWEEN 1 AND 5),
  personalization_rating INTEGER CHECK (personalization_rating BETWEEN 1 AND 5),
  call_to_action_rating INTEGER CHECK (call_to_action_rating BETWEEN 1 AND 5),

  -- Admin's explanations
  what_was_good TEXT, -- What AI did well
  what_was_bad TEXT, -- What AI did poorly
  why_changes_made TEXT, -- Detailed explanation of edits

  -- Learning tags
  improvement_tags TEXT[], -- e.g., ['too_formal', 'missing_client_context', 'good_opening']

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feedback_proposal ON proposal_feedback(proposal_id);
CREATE INDEX idx_feedback_rating ON proposal_feedback(overall_rating);
CREATE INDEX idx_feedback_tags ON proposal_feedback USING GIN(improvement_tags);
```

### 2. Proposal Outcomes Table (`proposal_outcomes`)
```sql
CREATE TABLE proposal_outcomes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE,

  -- Client interaction
  client_responded BOOLEAN,
  response_time_hours INTEGER,
  client_sentiment TEXT, -- 'positive', 'neutral', 'negative'
  client_message TEXT,

  -- Outcome
  status TEXT, -- 'won', 'lost', 'no_response', 'interview_scheduled'
  contract_value DECIMAL,
  won_at TIMESTAMPTZ,

  -- Post-mortem analysis
  win_loss_reason TEXT, -- Admin's analysis of why it won/lost
  learned_patterns TEXT[], -- Patterns to remember for future

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_outcomes_proposal ON proposal_outcomes(proposal_id);
CREATE INDEX idx_outcomes_status ON proposal_outcomes(status);
```

### 3. AI Prompt Versions Table (`ai_prompt_versions`)
```sql
CREATE TABLE ai_prompt_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version_name TEXT NOT NULL, -- e.g., 'v1.0', 'v1.1-more-personal'

  -- The actual prompts
  job_analysis_prompt TEXT,
  portfolio_selection_prompt TEXT,
  proposal_generation_prompt TEXT,

  -- Performance tracking
  is_active BOOLEAN DEFAULT false,
  proposals_generated_count INTEGER DEFAULT 0,
  avg_overall_rating DECIMAL,
  win_rate DECIMAL,

  -- Metadata
  created_by UUID REFERENCES profiles(id),
  notes TEXT, -- Why this version was created

  created_at TIMESTAMPTZ DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  deactivated_at TIMESTAMPTZ
);

CREATE INDEX idx_prompt_versions_active ON ai_prompt_versions(is_active);
```

### 4. Learning Patterns Table (`learning_patterns`)
```sql
CREATE TABLE learning_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Pattern identification
  pattern_type TEXT, -- 'successful_opening', 'good_portfolio_selection', 'effective_cta'
  pattern_name TEXT,
  pattern_description TEXT,

  -- Pattern content
  example_text TEXT, -- Example of this pattern in action
  when_to_use TEXT, -- Context/conditions for using this pattern

  -- Success metrics
  times_used INTEGER DEFAULT 0,
  times_won INTEGER DEFAULT 0,
  win_rate DECIMAL,
  avg_rating DECIMAL,

  -- Source
  extracted_from_proposal_id UUID REFERENCES proposals(id),
  created_by UUID REFERENCES profiles(id),

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_patterns_type ON learning_patterns(pattern_type);
CREATE INDEX idx_patterns_active ON learning_patterns(is_active);
CREATE INDEX idx_patterns_win_rate ON learning_patterns(win_rate DESC);
```

### 5. Proposal Training Examples Table (`proposal_training_examples`)
```sql
-- Store best examples to include in AI prompts
CREATE TABLE proposal_training_examples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- The example
  job_post_summary TEXT,
  winning_proposal_text TEXT,
  portfolio_pieces_used JSONB,

  -- Why it's a good example
  what_made_it_successful TEXT,
  key_techniques_used TEXT[],

  -- Metrics
  rating INTEGER,
  contract_value DECIMAL,

  -- Usage
  times_used_in_prompts INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_training_examples_active ON proposal_training_examples(is_active);
CREATE INDEX idx_training_examples_rating ON proposal_training_examples(rating DESC);
```

---

## Admin Training Interface

### 1. Proposal Review & Edit Interface (`/admin/train-ai`)

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  Proposal Review & Training                             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Job Post Details (collapsible)                         │
│  ┌────────────────────────────────────────────────┐   │
│  │ Title: Full Stack Developer Needed             │   │
│  │ Budget: $50-75/hr                               │   │
│  │ Skills: React, Node.js, PostgreSQL              │   │
│  │ [View Full Job Post]                            │   │
│  └────────────────────────────────────────────────┘   │
│                                                          │
│  Side-by-Side Comparison                                │
│  ┌───────────────────────┬──────────────────────────┐  │
│  │ AI Generated          │ Your Edits               │  │
│  │ (Original)            │ (Live editing)           │  │
│  ├───────────────────────┼──────────────────────────┤  │
│  │ Hi there,             │ Hi [Client Name],        │  │
│  │                       │                          │  │
│  │ I noticed your        │ I saw your project       │  │
│  │ project and I'm       │ and I'm excited about    │  │
│  │ interested...         │ helping with...          │  │
│  │                       │                          │  │
│  │ [Full proposal text]  │ [Edited text]            │  │
│  └───────────────────────┴──────────────────────────┘  │
│                                                          │
│  [Highlight Changes] [Accept All] [Reset]               │
│                                                          │
│  Selected Portfolio Pieces                              │
│  ┌────────────────────────────────────────────────┐   │
│  │ ✓ E-commerce Platform (Relevance: 0.92)        │   │
│  │ ✓ Dashboard UI (Relevance: 0.87)               │   │
│  │ ✗ Mobile App - [Remove?]                        │   │
│  │ + [Add Different Piece?]                        │   │
│  └────────────────────────────────────────────────┘   │
│                                                          │
│  Training Feedback Form                                  │
│  ┌────────────────────────────────────────────────┐   │
│  │ Overall Rating: ⭐⭐⭐⭐⭐                          │   │
│  │                                                  │   │
│  │ Specific Ratings:                               │   │
│  │ • Tone: ⭐⭐⭐⭐☆                                  │   │
│  │ • Relevance: ⭐⭐⭐⭐⭐                             │   │
│  │ • Personalization: ⭐⭐⭐☆☆                        │   │
│  │ • Call to Action: ⭐⭐⭐⭐☆                        │   │
│  │                                                  │   │
│  │ What did AI do well?                            │   │
│  │ ┌──────────────────────────────────────────┐  │   │
│  │ │ Good opening hook, mentioned relevant    │  │   │
│  │ │ portfolio pieces naturally...            │  │   │
│  │ └──────────────────────────────────────────┘  │   │
│  │                                                  │   │
│  │ What did AI do poorly?                          │   │
│  │ ┌──────────────────────────────────────────┐  │   │
│  │ │ Too generic greeting, didn't address     │  │   │
│  │ │ client's specific pain point about...    │  │   │
│  │ └──────────────────────────────────────────┘  │   │
│  │                                                  │   │
│  │ Why did you make these changes?                 │   │
│  │ ┌──────────────────────────────────────────┐  │   │
│  │ │ Changed greeting to use client name from │  │   │
│  │ │ job post. Added specific reference to... │  │   │
│  │ └──────────────────────────────────────────┘  │   │
│  │                                                  │   │
│  │ Quick Tags (multi-select):                      │   │
│  │ [too_generic] [missing_personalization]         │   │
│  │ [good_structure] [weak_cta] [too_long]          │   │
│  │ [excellent_opening] [portfolio_mismatch]        │   │
│  │                                                  │   │
│  │ [Save Feedback] [Save & Mark as Example]        │   │
│  └────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- Real-time diff highlighting (what changed)
- Inline commenting on specific paragraphs
- Quick tag buttons for common issues
- Option to save as "training example"
- Keyboard shortcuts for fast reviewing

**Components to create:**
- `ProposalTrainingInterface.tsx` - Main interface
- `SideBySideDiff.tsx` - Comparison view
- `FeedbackForm.tsx` - Structured feedback
- `PortfolioPieceReview.tsx` - Review selected portfolio
- `QuickTagSelector.tsx` - Tag common patterns

### 2. AI Performance Dashboard (`/admin/ai-performance`)

**Metrics to Track:**
```
┌─────────────────────────────────────────────────────────┐
│  AI Performance Dashboard                               │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Overall Metrics                                         │
│  ┌────────────────────────────────────────────────┐   │
│  │ Avg Proposal Rating: 4.2 / 5 ↑ +0.3           │   │
│  │ Win Rate: 28% ↑ +5%                            │   │
│  │ Proposals This Month: 47                       │   │
│  │ Training Sessions: 23                          │   │
│  └────────────────────────────────────────────────┘   │
│                                                          │
│  Performance Over Time                                   │
│  ┌────────────────────────────────────────────────┐   │
│  │     [Line Chart]                                │   │
│  │ 5 ⭐────────────────────────────────────────   │   │
│  │ 4       ╱────╲     ╱────────                  │   │
│  │ 3   ───╱      ────╱                            │   │
│  │ 2                                              │   │
│  │ 1                                              │   │
│  │   Jan  Feb  Mar  Apr  May  Jun                │   │
│  └────────────────────────────────────────────────┘   │
│                                                          │
│  Most Common Issues (Last 30 Days)                      │
│  ┌────────────────────────────────────────────────┐   │
│  │ 1. missing_personalization (18 times)          │   │
│  │ 2. weak_cta (12 times)                         │   │
│  │ 3. too_generic (9 times)                       │   │
│  │ 4. portfolio_mismatch (7 times)                │   │
│  └────────────────────────────────────────────────┘   │
│                                                          │
│  What's Improving                                        │
│  ┌────────────────────────────────────────────────┐   │
│  │ ✅ Opening hooks (was 3.2, now 4.5)            │   │
│  │ ✅ Portfolio selection (was 3.8, now 4.3)      │   │
│  └────────────────────────────────────────────────┘   │
│                                                          │
│  What Needs Work                                         │
│  ┌────────────────────────────────────────────────┐   │
│  │ ⚠️  Personalization (still at 3.1)             │   │
│  │ ⚠️  Call to action (fluctuating)               │   │
│  └────────────────────────────────────────────────┘   │
│                                                          │
│  Prompt Version Comparison                               │
│  ┌────────────────────────────────────────────────┐   │
│  │ Version    Proposals  Avg Rating  Win Rate     │   │
│  │ v1.0       120        3.8          23%          │   │
│  │ v1.1       85         4.0          25%          │   │
│  │ v1.2 ⭐    47         4.2          28%          │   │
│  │                                                  │   │
│  │ [View Prompt History] [Create New Version]     │   │
│  └────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Components to create:**
- `AIPerformanceDashboard.tsx` - Main dashboard
- `PerformanceChart.tsx` - Line/bar charts
- `IssuesList.tsx` - Common problems
- `PromptVersionComparison.tsx` - Compare prompt versions
- `ImprovementTracker.tsx` - What's getting better/worse

---

## AI Learning System Architecture

### 1. Dynamic Prompt Builder (`services/dynamicPromptBuilder.ts`)

**Purpose:** Build prompts that include learned patterns and examples

```typescript
interface PromptBuilderContext {
  jobPost: ProcessedJobPost;
  portfolioPieces: PortfolioPiece[];
  learningPatterns: LearningPattern[];
  trainingExamples: ProposalTrainingExample[];
  recentFeedback: ProposalFeedback[];
}

class DynamicPromptBuilder {
  async buildProposalPrompt(context: PromptBuilderContext): Promise<string> {
    // Get active prompt version
    const activeVersion = await this.getActivePromptVersion();

    // Get top performing patterns for this job type
    const relevantPatterns = await this.selectRelevantPatterns(context);

    // Get best examples similar to this job
    const examples = await this.selectSimilarExamples(context);

    // Get recent feedback to avoid common mistakes
    const avoidPatterns = await this.getCommonMistakes();

    return `
      ${activeVersion.proposal_generation_prompt}

      LEARNED PATTERNS TO USE:
      ${relevantPatterns.map(p => `
        - ${p.pattern_name}: ${p.pattern_description}
        Example: "${p.example_text}"
        Use when: ${p.when_to_use}
      `).join('\n')}

      SUCCESSFUL EXAMPLES FOR REFERENCE:
      ${examples.map(e => `
        Job: ${e.job_post_summary}
        Winning Proposal: ${e.winning_proposal_text}
        Why it worked: ${e.what_made_it_successful}
      `).join('\n')}

      AVOID THESE COMMON MISTAKES:
      ${avoidPatterns.map(m => `- ${m}`).join('\n')}

      NOW GENERATE A PROPOSAL FOR:
      Job: ${context.jobPost.title}
      Description: ${context.jobPost.description}
      Skills: ${context.jobPost.skills_required.join(', ')}

      Available portfolio pieces:
      ${context.portfolioPieces.map(p => `- ${p.title}: ${p.description}`).join('\n')}
    `;
  }

  private async selectRelevantPatterns(
    context: PromptBuilderContext
  ): Promise<LearningPattern[]> {
    // Get patterns with high win rates similar to this job type
    // Filter by job category, skills, budget range, etc.
    // Return top 5 most relevant patterns
  }

  private async selectSimilarExamples(
    context: PromptBuilderContext
  ): Promise<ProposalTrainingExample[]> {
    // Find examples from similar job posts
    // Match by skills, job type, budget
    // Return top 2-3 best examples
  }

  private async getCommonMistakes(): Promise<string[]> {
    // Get most frequent negative feedback tags from last 30 days
    // Return as list of things to avoid
  }
}
```

### 2. Pattern Extraction Service (`services/patternExtractor.ts`)

**Purpose:** Automatically identify successful patterns from feedback

```typescript
class PatternExtractor {
  async extractPatternsFromFeedback(
    feedback: ProposalFeedback,
    proposal: Proposal,
    outcome: ProposalOutcome
  ): Promise<LearningPattern[]> {

    // If high rating and won
    if (feedback.overall_rating >= 4 && outcome.status === 'won') {
      const patterns: LearningPattern[] = [];

      // Extract opening line pattern
      const opening = this.extractOpening(proposal.proposal_text);
      patterns.push({
        pattern_type: 'successful_opening',
        pattern_name: `Opening: ${opening.substring(0, 30)}...`,
        pattern_description: feedback.what_was_good,
        example_text: opening,
        when_to_use: `Jobs similar to: ${proposal.jobPost.title}`
      });

      // Extract call-to-action pattern
      if (feedback.call_to_action_rating >= 4) {
        const cta = this.extractCallToAction(proposal.proposal_text);
        patterns.push({
          pattern_type: 'effective_cta',
          pattern_name: 'Successful CTA',
          example_text: cta,
          when_to_use: 'End of proposals'
        });
      }

      // Extract personalization techniques
      if (feedback.personalization_rating >= 4) {
        patterns.push(await this.extractPersonalizationPattern(proposal));
      }

      return patterns;
    }

    return [];
  }

  private extractOpening(text: string): string {
    // Get first 1-2 sentences
    const sentences = text.split(/[.!?]+/);
    return sentences.slice(0, 2).join('. ') + '.';
  }

  private extractCallToAction(text: string): string {
    // Get last 1-2 sentences
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    return sentences.slice(-2).join('. ') + '.';
  }
}
```

### 3. Feedback Analysis Service (`services/feedbackAnalyzer.ts`)

**Purpose:** Analyze feedback trends and suggest improvements

```typescript
class FeedbackAnalyzer {
  async analyzeRecentFeedback(days: number = 30): Promise<Analysis> {
    const feedback = await this.getRecentFeedback(days);

    return {
      avgRatings: this.calculateAverageRatings(feedback),
      trendingIssues: this.identifyTrendingIssues(feedback),
      improvingAreas: this.identifyImprovements(feedback),
      degradingAreas: this.identifyDegradations(feedback),
      suggestions: await this.generateSuggestions(feedback)
    };
  }

  private identifyTrendingIssues(
    feedback: ProposalFeedback[]
  ): TrendingIssue[] {
    // Count frequency of improvement tags
    const tagCounts = {};
    feedback.forEach(f => {
      f.improvement_tags?.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    // Return top issues
    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));
  }

  private async generateSuggestions(
    feedback: ProposalFeedback[]
  ): Promise<string[]> {
    // Use AI to analyze feedback and suggest prompt improvements
    const issues = this.identifyTrendingIssues(feedback);
    const commonComplaints = feedback
      .map(f => f.what_was_bad)
      .filter(Boolean)
      .join('\n');

    const prompt = `
      Based on this feedback from proposal reviews, suggest 5 specific
      improvements to make to the AI prompt:

      Common issues:
      ${issues.map(i => `- ${i.tag} (${i.count} times)`).join('\n')}

      Common complaints:
      ${commonComplaints}

      Return as a JSON array of specific, actionable suggestions.
    `;

    // Call AI and return suggestions
    return await this.getAISuggestions(prompt);
  }
}
```

### 4. Prompt Version Manager (`services/promptVersionManager.ts`)

**Purpose:** Manage different prompt versions and A/B testing

```typescript
class PromptVersionManager {
  async createNewVersion(
    basedOn: string, // Previous version ID
    changes: string,
    notes: string,
    createdBy: string
  ): Promise<AIPromptVersion> {
    const baseVersion = await this.getVersion(basedOn);

    const newVersion = {
      version_name: this.generateVersionName(baseVersion),
      job_analysis_prompt: baseVersion.job_analysis_prompt,
      portfolio_selection_prompt: baseVersion.portfolio_selection_prompt,
      proposal_generation_prompt: baseVersion.proposal_generation_prompt,
      notes: notes,
      created_by: createdBy
    };

    return await this.saveVersion(newVersion);
  }

  async activateVersion(versionId: string): Promise<void> {
    // Deactivate all other versions
    await this.deactivateAllVersions();

    // Activate this version
    await this.setVersionActive(versionId, true);
  }

  async compareVersions(
    versionA: string,
    versionB: string
  ): Promise<VersionComparison> {
    const [statsA, statsB] = await Promise.all([
      this.getVersionStats(versionA),
      this.getVersionStats(versionB)
    ]);

    return {
      versionA: { ...statsA },
      versionB: { ...statsB },
      difference: {
        rating: statsB.avg_rating - statsA.avg_rating,
        winRate: statsB.win_rate - statsA.win_rate,
        proposalCount: statsB.count - statsA.count
      }
    };
  }

  // A/B Testing: randomly assign versions to proposals
  async selectVersionForProposal(): Promise<AIPromptVersion> {
    const activeVersions = await this.getActiveVersions();

    if (activeVersions.length === 1) {
      return activeVersions[0];
    }

    // If multiple active, randomly select (for A/B testing)
    const random = Math.random();
    return activeVersions[Math.floor(random * activeVersions.length)];
  }
}
```

---

## Employee Experience with AI Training

Even though employees don't train the AI, they benefit from it:

### 1. Confidence Indicators
Show employees how confident the AI is:
```typescript
interface ProposalWithConfidence {
  proposalText: string;
  confidenceScore: number; // 0-1
  confidenceReasons: string[];
  warnings?: string[];
}
```

**Display:**
```
┌────────────────────────────────────────────────────┐
│ AI-Generated Proposal                              │
├────────────────────────────────────────────────────┤
│                                                     │
│ Confidence: ⭐⭐⭐⭐☆ (4.3/5)                         │
│                                                     │
│ Why this score:                                    │
│ ✓ Found 3 highly relevant portfolio pieces         │
│ ✓ Similar to 5 previous winning proposals          │
│ ⚠ Client's budget is higher than our typical range │
│                                                     │
│ [View Proposal]                                    │
└────────────────────────────────────────────────────┘
```

### 2. Learning Insights
Show employees what the AI learned recently:
```
┌────────────────────────────────────────────────────┐
│ 💡 Recent AI Improvements                          │
├────────────────────────────────────────────────────┤
│ • Now personalizes opening based on client info    │
│ • Better at matching portfolio to job skills       │
│ • Improved calls-to-action (win rate +5%)          │
│                                                     │
│ Last trained: 2 days ago                           │
└────────────────────────────────────────────────────┘
```

---

## Implementation Priorities

### Phase 1: Basic Feedback Loop (MVP)
1. Admin can view AI proposal vs edited version
2. Simple rating system (1-5 stars)
3. Text fields for "what was good" and "what was bad"
4. Store all feedback in database
5. Manual prompt editing by admin

### Phase 2: Structured Learning
1. Add detailed rating categories
2. Add improvement tags
3. Extract patterns from winning proposals
4. Build learning patterns table
5. Show patterns in admin dashboard

### Phase 3: Dynamic Prompts
1. Build dynamic prompt builder
2. Include learned patterns in prompts
3. Include successful examples in prompts
4. Add "avoid these mistakes" section
5. Track prompt performance

### Phase 4: Intelligent Analysis
1. Automatic pattern extraction
2. AI-powered feedback analysis
3. Automatic prompt suggestions
4. Trend identification
5. Performance predictions

### Phase 5: Advanced Features
1. Prompt version management
2. A/B testing framework
3. Automatic version creation based on trends
4. Employee confidence indicators
5. Continuous learning pipeline

---

## Key Metrics for AI Improvement

### Short-term Metrics (per proposal)
- Admin rating (1-5)
- Edit distance (how much admin changed)
- Portfolio selection accuracy
- Response time

### Medium-term Metrics (per week/month)
- Average rating trend
- Common issue frequency
- Pattern win rates
- Prompt version performance

### Long-term Metrics (per quarter)
- Win rate trend
- Revenue per proposal
- Time saved vs manual writing
- Employee satisfaction with AI

---

## What Makes This System Effective

### 1. Structured Feedback
- Not just "good" or "bad"
- Specific ratings for different aspects
- Explanations required
- Tags for quick categorization

### 2. Outcome Tracking
- Link feedback to actual results (won/lost)
- Track contract values
- Measure response rates
- Analyze client sentiment

### 3. Pattern Recognition
- Automatically extract what works
- Store reusable patterns
- Apply patterns to similar jobs
- Version control for patterns

### 4. Continuous Improvement
- Every proposal is training data
- Prompts evolve based on feedback
- System gets smarter over time
- Transparent improvement tracking

### 5. Admin Control
- Admin can always override AI
- Manual prompt editing available
- Version management for safety
- Rollback to previous versions if needed

---

## Questions to Clarify

1. **Feedback Frequency**: Should admin review EVERY proposal, or only a sample?
2. **Auto-Apply Edits**: Should AI automatically learn from edits without explicit feedback?
3. **Prompt Editing**: Should admin be able to directly edit prompts, or just provide feedback?
4. **Pattern Approval**: Should patterns be auto-applied, or require admin approval first?
5. **Training Examples**: How many examples should be shown to AI in each prompt (affects cost)?
6. **Confidence Threshold**: Should proposals below certain confidence need admin review before sending?

---

## Next Steps

Once approved:
1. Update main plan with training system
2. Add training tables to database schema
3. Design admin training interface
4. Build feedback collection system
5. Implement basic learning loop
6. Gradually add advanced features
