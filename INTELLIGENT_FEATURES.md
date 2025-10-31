# Newar Insights - Intelligent Features Roadmap

**Version:** 1.0
**Last Updated:** 2025-10-30
**Status:** Planning Phase

---

## 📊 Overview

O **Newar Insights** deve evoluir de um sistema de gravação simples para uma plataforma completa de **inteligência de reuniões**, oferecendo análises automáticas, insights acionáveis e recursos de busca avançados.

### Current Status
- **Implementado:** Gravação de áudio, tracking básico de participantes, auto-cleanup
- **Parcialmente Implementado:** Speaker detection
- **Não Implementado:** Transcrição, análises de IA, insights automáticos

---

## 🎯 Vision Statement

> "Transformar gravações brutas em insights acionáveis através de IA, permitindo que equipes extraiam valor máximo de cada reunião."

---

## 🚀 Feature Categories

### Categoria 1: Audio Intelligence (Foundation)
Transformar áudio em texto e metadados estruturados.

### Categoria 2: Content Analysis (Core)
Analisar o conteúdo das reuniões para extrair insights.

### Categoria 3: Interaction Intelligence (Advanced)
Entender dinâmicas de equipe e padrões de comunicação.

### Categoria 4: Automation & Recommendations (Smart)
Automatizar ações e fornecer recomendações baseadas em dados.

---

## 📋 Feature Breakdown

---

## 🎧 CATEGORIA 1: Audio Intelligence

### 1.1 Speech-to-Text Transcription
**Status:** ❌ Not Implemented
**Priority:** P0 (Critical)
**Effort:** 8 weeks
**Dependencies:** None

#### Description
Transcrever automaticamente o áudio das gravações em texto com timestamps.

#### Technical Approach

**Option A: OpenAI Whisper (Recommended)**
```typescript
// services/transcription-service/
import OpenAI from 'openai';

async function transcribe(audioPath: string): Promise<Transcription> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(audioPath),
    model: "whisper-1",
    language: "pt", // Portuguese
    response_format: "verbose_json",
    timestamp_granularities: ["word", "segment"]
  });

  return {
    text: transcription.text,
    segments: transcription.segments,
    language: transcription.language,
    duration: transcription.duration
  };
}
```

**Option B: AssemblyAI**
- Better speaker diarization
- Real-time transcription support
- Auto-detect language

**Option C: Google Cloud Speech-to-Text**
- Good for Portuguese
- Lower cost for high volume

#### Database Schema
```sql
-- migrations/010_add_transcriptions.sql
CREATE TABLE transcriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id INTEGER NOT NULL,
  full_text TEXT NOT NULL,
  language VARCHAR(10) DEFAULT 'pt',
  word_count INTEGER,
  status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
  processing_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id)
);

CREATE TABLE transcription_segments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transcription_id INTEGER NOT NULL,
  speaker_id VARCHAR(50), -- From diarization
  start_time REAL NOT NULL, -- Seconds from start
  end_time REAL NOT NULL,
  text TEXT NOT NULL,
  confidence REAL, -- 0.0 to 1.0
  words_json TEXT, -- JSON array of word-level timestamps
  FOREIGN KEY (transcription_id) REFERENCES transcriptions(id)
);

CREATE INDEX idx_transcription_meeting ON transcriptions(meeting_id);
CREATE INDEX idx_segment_transcription ON transcription_segments(transcription_id);
CREATE INDEX idx_segment_time ON transcription_segments(start_time, end_time);
```

#### API Endpoints
```go
// POST /recordings/:id/transcribe - Start transcription
// GET /recordings/:id/transcription - Get transcription
// GET /recordings/:id/transcription/segments?start=10&end=30 - Get time range
// GET /recordings/:id/transcription/search?q=budget - Search in transcription
```

#### Processing Pipeline
```
1. Meeting Completed → Trigger Transcription Job
2. Queue Job (Redis/Bull)
3. Download WebM → Convert to WAV/MP3
4. Send to Whisper API (chunked for >25MB)
5. Process Response → Save Segments
6. Generate Full Text
7. Update Meeting Status
8. Send Webhook (if configured)
```

#### Cost Estimate
- **Whisper API:** $0.006/minute
- **60 min meeting:** $0.36
- **1000 meetings/month:** $360/month

#### Implementation Steps
1. **Week 1-2:** Setup transcription service (Go microservice)
2. **Week 3:** Implement Whisper integration + chunking
3. **Week 4:** Database schema + migrations
4. **Week 5:** API endpoints + job queue
5. **Week 6:** Frontend UI for viewing transcriptions
6. **Week 7:** Testing + error handling
7. **Week 8:** Optimization + webhooks

---

### 1.2 Speaker Diarization
**Status:** 🚧 Partially Implemented
**Priority:** P1 (High)
**Effort:** 4 weeks
**Dependencies:** 1.1 Transcription

#### Description
Identificar quem falou quando, atribuindo cada segmento de áudio a um participante específico.

#### Technical Approach
```typescript
// Option 1: AssemblyAI (has built-in diarization)
const transcript = await assemblyai.transcripts.create({
  audio_url: recordingUrl,
  speaker_labels: true,
  speakers_expected: participantCount
});

// Option 2: Pyannote.audio (open-source)
import { PyannoteSpeakerDiarization } from '@pyannote/audio';

const diarization = await pipeline.apply(audioPath);
// Returns: [(start, end, speaker_id), ...]
```

#### Enhanced Schema
```sql
-- Add to transcription_segments
ALTER TABLE transcription_segments ADD COLUMN participant_id INTEGER;
ALTER TABLE transcription_segments ADD FOREIGN KEY (participant_id) REFERENCES meeting_participants(id);

-- Speaker statistics
CREATE TABLE speaker_statistics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id INTEGER NOT NULL,
  participant_id INTEGER NOT NULL,
  total_speaking_time_seconds INTEGER,
  segment_count INTEGER,
  average_segment_duration REAL,
  interruption_count INTEGER,
  words_spoken INTEGER,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id),
  FOREIGN KEY (participant_id) REFERENCES meeting_participants(id)
);
```

#### Metrics Tracked
- Total speaking time per participant
- Speaking turns
- Interruptions
- Longest monologue
- Speaking speed (words/minute)

---

### 1.3 Emotion Detection (Audio)
**Status:** ❌ Not Implemented
**Priority:** P2 (Medium)
**Effort:** 6 weeks
**Dependencies:** 1.1 Transcription

#### Description
Detectar emoções e sentimento através da análise de prosódia (tom, velocidade, volume).

#### Technical Approach
```typescript
// Using Hume AI Prosody API
import { HumeClient } from 'hume';

const client = new HumeClient({ apiKey: process.env.HUME_API_KEY });

const result = await client.empathicVoice.chat.connect({
  audioInput: audioStream,
  return_prosody: true
});

// Returns emotions: joy, sadness, anger, fear, surprise, etc.
```

#### Database Schema
```sql
CREATE TABLE emotion_segments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transcription_segment_id INTEGER NOT NULL,
  emotion VARCHAR(50) NOT NULL, -- joy, anger, sadness, neutral, etc.
  confidence REAL NOT NULL,
  intensity REAL, -- 0.0 to 1.0
  valence REAL, -- -1.0 (negative) to +1.0 (positive)
  arousal REAL, -- Energy level
  FOREIGN KEY (transcription_segment_id) REFERENCES transcription_segments(id)
);

CREATE TABLE meeting_emotion_summary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id INTEGER NOT NULL,
  dominant_emotion VARCHAR(50),
  average_valence REAL,
  emotional_volatility REAL, -- Std deviation of valence
  positive_moments_count INTEGER,
  negative_moments_count INTEGER,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id)
);
```

---

## 🧠 CATEGORIA 2: Content Analysis

### 2.1 Automatic Summarization
**Status:** ❌ Not Implemented
**Priority:** P0 (Critical)
**Effort:** 4 weeks
**Dependencies:** 1.1 Transcription

#### Description
Gerar resumos automáticos multi-nível (executivo, detalhado, bullet points).

#### Technical Approach
```typescript
import OpenAI from 'openai';

async function generateSummary(transcription: string, type: 'executive' | 'detailed' | 'bullets') {
  const openai = new OpenAI();

  const prompt = type === 'executive'
    ? "Resuma esta reunião em 3-5 frases, focando nas decisões principais."
    : type === 'detailed'
    ? "Crie um resumo detalhado da reunião, incluindo tópicos, decisões e próximos passos."
    : "Liste os principais pontos da reunião em bullet points.";

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "Você é um assistente especializado em resumir reuniões de negócios." },
      { role: "user", content: `${prompt}\n\nTranscrição:\n${transcription}` }
    ],
    temperature: 0.3
  });

  return response.choices[0].message.content;
}
```

#### Database Schema
```sql
CREATE TABLE meeting_summaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id INTEGER NOT NULL,
  summary_type VARCHAR(20) NOT NULL, -- executive, detailed, bullets
  content TEXT NOT NULL,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  model_used VARCHAR(50),
  token_count INTEGER,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id)
);
```

#### Summary Types
1. **Executive Summary** (3-5 sentences)
2. **Detailed Summary** (paragraphs)
3. **Bullet Points** (action items)
4. **Q&A Format** (questions discussed + answers)

---

### 2.2 Topic Extraction & Classification
**Status:** ❌ Not Implemented
**Priority:** P1 (High)
**Effort:** 3 weeks
**Dependencies:** 1.1 Transcription

#### Description
Identificar automaticamente os tópicos discutidos e classificar a reunião.

#### Technical Approach
```typescript
// Using GPT-4 with function calling
const functions = [{
  name: "extract_topics",
  description: "Extract main topics discussed in the meeting",
  parameters: {
    type: "object",
    properties: {
      main_topics: {
        type: "array",
        items: {
          type: "object",
          properties: {
            topic: { type: "string" },
            relevance: { type: "number", minimum: 0, maximum: 1 },
            duration_seconds: { type: "number" },
            timestamp_start: { type: "number" }
          }
        }
      },
      meeting_category: {
        type: "string",
        enum: ["planning", "review", "brainstorm", "status", "training", "sales", "other"]
      }
    }
  }
}];

const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: transcription }],
  functions: functions,
  function_call: { name: "extract_topics" }
});
```

#### Database Schema
```sql
CREATE TABLE meeting_topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id INTEGER NOT NULL,
  topic VARCHAR(255) NOT NULL,
  relevance REAL, -- 0.0 to 1.0
  duration_seconds INTEGER,
  timestamp_start REAL,
  keywords TEXT, -- JSON array
  FOREIGN KEY (meeting_id) REFERENCES meetings(id)
);

CREATE TABLE meeting_categories (
  meeting_id INTEGER PRIMARY KEY,
  category VARCHAR(50) NOT NULL, -- planning, review, brainstorm, etc.
  confidence REAL,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id)
);
```

---

### 2.3 Action Items & Decisions Extraction
**Status:** ❌ Not Implemented
**Priority:** P0 (Critical)
**Effort:** 4 weeks
**Dependencies:** 1.1 Transcription

#### Description
Identificar automaticamente tarefas, decisões e compromissos assumidos durante a reunião.

#### Technical Approach
```typescript
const systemPrompt = `
Você é um assistente especializado em extrair ações e decisões de reuniões.
Para cada item, identifique:
- A ação ou decisão
- Responsável (se mencionado)
- Prazo (se mencionado)
- Prioridade (se mencionada)
- Contexto relevante
`;

const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Extraia ações e decisões desta reunião:\n\n${transcription}` }
  ],
  response_format: { type: "json_object" }
});

const { action_items, decisions } = JSON.parse(response.choices[0].message.content);
```

#### Database Schema
```sql
CREATE TABLE action_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id INTEGER NOT NULL,
  description TEXT NOT NULL,
  assigned_to VARCHAR(255),
  due_date DATE,
  priority VARCHAR(20), -- high, medium, low
  status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, completed, cancelled
  timestamp_mentioned REAL, -- When it was mentioned in the meeting
  context TEXT, -- Surrounding conversation
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id)
);

CREATE TABLE decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id INTEGER NOT NULL,
  decision TEXT NOT NULL,
  decided_by VARCHAR(255),
  timestamp_mentioned REAL,
  impact_level VARCHAR(20), -- critical, major, minor
  context TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id)
);
```

#### Integration Ideas
- Export to Jira/Asana/Trello
- Send Slack notifications
- Create calendar events
- Email digests

---

### 2.4 Keyword & Entity Extraction
**Status:** ❌ Not Implemented
**Priority:** P2 (Medium)
**Effort:** 2 weeks
**Dependencies:** 1.1 Transcription

#### Description
Extrair entidades nomeadas (pessoas, empresas, produtos, valores) e keywords principais.

#### Technical Approach
```typescript
// Using spaCy NER (via Python microservice)
import spacy

nlp = spacy.load("pt_core_news_lg") // Portuguese model

doc = nlp(transcription)

entities = {
  'persons': [ent.text for ent in doc.ents if ent.label_ == 'PER'],
  'organizations': [ent.text for ent in doc.ents if ent.label_ == 'ORG'],
  'locations': [ent.text for ent in doc.ents if ent.label_ == 'LOC'],
  'dates': [ent.text for ent in doc.ents if ent.label_ == 'DATE'],
  'money': [ent.text for ent in doc.ents if ent.label_ == 'MONEY']
}

// For keywords: TF-IDF or KeyBERT
from keybert import KeyBERT
kw_model = KeyBERT()
keywords = kw_model.extract_keywords(transcription, top_n=10)
```

#### Database Schema
```sql
CREATE TABLE meeting_entities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id INTEGER NOT NULL,
  entity_type VARCHAR(50) NOT NULL, -- person, organization, location, date, money, product
  entity_value VARCHAR(500) NOT NULL,
  mention_count INTEGER DEFAULT 1,
  first_mentioned_at REAL,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id)
);

CREATE TABLE meeting_keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id INTEGER NOT NULL,
  keyword VARCHAR(255) NOT NULL,
  relevance_score REAL,
  frequency INTEGER,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id)
);
```

---

## 👥 CATEGORIA 3: Interaction Intelligence

### 3.1 Participation Analytics
**Status:** 🚧 Partially Implemented (tracker exists)
**Priority:** P1 (High)
**Effort:** 3 weeks
**Dependencies:** 1.2 Speaker Diarization

#### Description
Analisar padrões de participação e engajamento de cada membro.

#### Metrics to Track
```typescript
interface ParticipationMetrics {
  // Speaking metrics
  totalSpeakingTime: number; // seconds
  speakingPercentage: number; // % of meeting
  turnCount: number; // number of times they spoke
  averageTurnDuration: number; // seconds
  longestMonologue: number; // seconds

  // Engagement metrics
  questionsAsked: number;
  questionsAnswered: number;
  interruptions: number;
  interruptedCount: number;

  // Communication style
  speakingSpeed: number; // words per minute
  vocabularyDiversity: number; // unique words / total words
  sentimentTrend: 'positive' | 'neutral' | 'negative';

  // Attention indicators (future: video analysis)
  likelyAttentive: boolean;
}
```

#### Insights Generated
- "João dominated the conversation (65% speaking time)"
- "Maria asked 8 questions but spoke only 5% of the time"
- "Pedro was interrupted 12 times"
- "Ana's speaking time decreased 40% compared to last meeting"

#### Visualization
- Speaking time pie chart
- Timeline of who spoke when
- Interruption matrix
- Engagement heatmap

---

### 3.2 Meeting Dynamics Analysis
**Status:** ❌ Not Implemented
**Priority:** P2 (Medium)
**Effort:** 4 weeks
**Dependencies:** 3.1 Participation Analytics

#### Description
Analisar a dinâmica geral da reunião e identificar padrões de equipe.

#### Metrics
```typescript
interface MeetingDynamics {
  // Structure
  actualDuration: number;
  scheduledDuration: number;
  overrunPercentage: number;

  // Balance
  participationBalance: number; // 0 = monopolized, 1 = perfectly balanced
  turnTakingFairness: number;

  // Energy
  speakingRateOverTime: number[]; // words/min by time segment
  emotionalTrajectory: EmotionPoint[];
  engagementLevel: 'high' | 'medium' | 'low';

  // Effectiveness
  decisionsMade: number;
  actionItemsCreated: number;
  topicsDiscussed: number;
  offtopicPercentage: number;

  // Collaboration
  crossTalkInstances: number; // people building on others' ideas
  agreementRate: number;
  conflictInstances: number;
}
```

#### Red Flags Detected
- "Meeting went 45% over time"
- "Only 2 people spoke, 8 others silent"
- "No decisions or action items created"
- "High conflict detected in last 15 minutes"
- "Emotional energy dropped significantly mid-meeting"

---

### 3.3 Question-Answer Mapping
**Status:** ❌ Not Implemented
**Priority:** P2 (Medium)
**Effort:** 3 weeks
**Dependencies:** 1.1 Transcription

#### Description
Identificar perguntas feitas e suas respectivas respostas.

#### Technical Approach
```typescript
// Using GPT-4 to map Q&A
const prompt = `
Identifique todas as perguntas feitas na reunião e suas respostas.
Para cada pergunta:
- Quem perguntou
- Timestamp
- A pergunta
- Quem respondeu
- A resposta
- Se a resposta foi satisfatória
- Se ficou alguma pendência
`;

// Or use BERT Question Answering model
```

#### Use Cases
- Create FAQ from meetings
- Track unanswered questions
- Measure response quality
- Identify knowledge gaps

---

## 🤖 CATEGORIA 4: Automation & Recommendations

### 4.1 Smart Meeting Briefs
**Status:** ❌ Not Implemented
**Priority:** P1 (High)
**Effort:** 3 weeks
**Dependencies:** 2.1 Summarization, 2.3 Action Items

#### Description
Gerar automaticamente um email/documento com o resumo completo da reunião.

#### Template
```markdown
# Meeting Brief: [Meeting Title]

**Date:** [Date]
**Duration:** [Duration]
**Participants:** [List]
**Recording:** [Link]

## Executive Summary
[3-5 sentence summary]

## Key Topics Discussed
1. [Topic 1] - [Duration]
2. [Topic 2] - [Duration]
3. ...

## Decisions Made
- [Decision 1] - Decided by [Person]
- [Decision 2] - Decided by [Team]

## Action Items
- [ ] [Task 1] - Assigned to [Person] - Due: [Date]
- [ ] [Task 2] - Assigned to [Person] - Due: [Date]

## Next Steps
- [Next meeting scheduled]
- [Follow-up required]

## Full Transcript
[Link to searchable transcript]
```

#### Distribution
- Email to all participants
- Slack channel post
- Save to Notion/Confluence
- Export to PDF

---

### 4.2 Intelligent Search
**Status:** ❌ Not Implemented
**Priority:** P1 (High)
**Effort:** 5 weeks
**Dependencies:** 1.1 Transcription

#### Description
Busca semântica avançada em todas as gravações.

#### Search Capabilities
```typescript
// 1. Full-text search
searchMeetings("budget approval") // Traditional keyword search

// 2. Semantic search (using embeddings)
searchMeetingsSemantic("como reduzir custos?")
// Returns meetings about cost reduction, budget cuts, efficiency, etc.

// 3. Speaker-specific search
searchByPerson("João", "product roadmap")

// 4. Time-bound search
searchInTimeRange("2024-01-01", "2024-03-31", "marketing strategy")

// 5. Cross-meeting insights
findPattern("What decisions were made about the new feature?")
// Searches across ALL meetings
```

#### Technical Implementation
```typescript
// Vector database: Pinecone, Qdrant, or Weaviate
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const openai = new OpenAI();

// 1. Create embeddings for transcript segments
async function embedTranscript(segments: TranscriptSegment[]) {
  for (const segment of segments) {
    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: segment.text
    });

    await pinecone.index('meetings').upsert([{
      id: `${segment.meeting_id}_${segment.id}`,
      values: embedding.data[0].embedding,
      metadata: {
        meeting_id: segment.meeting_id,
        speaker: segment.speaker_id,
        timestamp: segment.start_time,
        text: segment.text
      }
    }]);
  }
}

// 2. Semantic search
async function semanticSearch(query: string, topK: number = 10) {
  const queryEmbedding = await openai.embeddings.create({
    model: "text-embedding-3-large",
    input: query
  });

  const results = await pinecone.index('meetings').query({
    vector: queryEmbedding.data[0].embedding,
    topK: topK,
    includeMetadata: true
  });

  return results.matches;
}
```

#### UI Features
- Auto-suggest as user types
- Filter by date, speaker, category
- Jump to exact timestamp in recording
- Highlight matching text
- Show context (surrounding text)

---

### 4.3 Meeting Quality Score
**Status:** ❌ Not Implemented
**Priority:** P2 (Medium)
**Effort:** 2 weeks
**Dependencies:** 3.1 Participation, 3.2 Dynamics

#### Description
Atribuir uma nota de 0-100 para cada reunião baseada em múltiplos fatores.

#### Scoring Algorithm
```typescript
interface MeetingScore {
  overallScore: number; // 0-100
  breakdown: {
    structureScore: number; // Started on time, had agenda, ended on time
    participationScore: number; // Balanced speaking time
    productivityScore: number; // Decisions made, actions created
    engagementScore: number; // Speaking rate, questions asked
    emotionalScore: number; // Positive emotions, low conflict
  };
  recommendations: string[];
}

function calculateMeetingScore(meeting: Meeting): MeetingScore {
  const structure = scoreStructure(meeting); // 0-20
  const participation = scoreParticipation(meeting); // 0-20
  const productivity = scoreProductivity(meeting); // 0-30
  const engagement = scoreEngagement(meeting); // 0-20
  const emotional = scoreEmotional(meeting); // 0-10

  const overall = structure + participation + productivity + engagement + emotional;

  return {
    overallScore: overall,
    breakdown: { structure, participation, productivity, engagement, emotional },
    recommendations: generateRecommendations(overall, breakdown)
  };
}
```

#### Recommendations Generated
- "Consider limiting meeting to 30 minutes next time"
- "Encourage Maria and Pedro to participate more"
- "Create action items at end of meeting"
- "Schedule follow-up to review decisions"

---

### 4.4 Predictive Insights
**Status:** ❌ Not Implemented
**Priority:** P3 (Low)
**Effort:** 6 weeks
**Dependencies:** All previous features

#### Description
Usar machine learning para prever outcomes e fazer recomendações proativas.

#### Predictions
1. **Meeting Duration Prediction**
   - "Based on the agenda, this meeting will likely take 45 minutes"

2. **Attendance Prediction**
   - "João has missed 3 similar meetings, 70% chance of no-show"

3. **Outcome Prediction**
   - "Similar meetings resulted in 2-3 action items on average"

4. **Conflict Prediction**
   - "Budget discussions historically lead to disagreements"

5. **Follow-up Prediction**
   - "80% of action items from this meeting type are completed late"

#### ML Models Needed
- Time series forecasting (duration)
- Classification (outcome prediction)
- Anomaly detection (unusual patterns)
- Clustering (meeting types)

---

## 🗺️ Implementation Roadmap

### Phase 1: Foundation (Q1 2025) - 12 weeks
**Goal:** Enable basic intelligence on top of recordings

- ✅ **Week 1-8:** Transcription service (1.1)
- ✅ **Week 9-12:** Summarization (2.1)
- **Deliverable:** Users can read transcripts and summaries

### Phase 2: Core Intelligence (Q2 2025) - 12 weeks
**Goal:** Extract actionable insights

- ✅ **Week 1-4:** Speaker diarization (1.2)
- ✅ **Week 5-8:** Action items extraction (2.3)
- ✅ **Week 9-12:** Topic extraction (2.2)
- **Deliverable:** Automated action item tracking

### Phase 3: Advanced Analysis (Q3 2025) - 12 weeks
**Goal:** Team dynamics and engagement

- ✅ **Week 1-3:** Participation analytics (3.1)
- ✅ **Week 4-7:** Meeting dynamics (3.2)
- ✅ **Week 8-10:** Smart meeting briefs (4.1)
- ✅ **Week 11-12:** Meeting quality score (4.3)
- **Deliverable:** Team performance insights

### Phase 4: Smart Features (Q4 2025) - 12 weeks
**Goal:** Proactive automation

- ✅ **Week 1-5:** Intelligent search (4.2)
- ✅ **Week 6-9:** Emotion detection (1.3)
- ✅ **Week 10-11:** Q&A mapping (3.3)
- ✅ **Week 12:** Entity extraction (2.4)
- **Deliverable:** Complete intelligence platform

### Phase 5: Predictive AI (Q1 2026) - 8 weeks
**Goal:** Machine learning predictions

- ✅ **Week 1-8:** Predictive insights (4.4)
- **Deliverable:** AI-powered recommendations

---

## 💰 Cost Analysis

### Per-Meeting Costs

| Feature | Service | Cost/Meeting (60min) |
|---------|---------|---------------------|
| Transcription | OpenAI Whisper | $0.36 |
| Speaker Diarization | AssemblyAI | $0.65 |
| Summarization | GPT-4o | $0.15 |
| Action Items | GPT-4o | $0.10 |
| Topic Extraction | GPT-4o | $0.08 |
| Embeddings | OpenAI | $0.05 |
| **Total** | | **$1.39/meeting** |

### Monthly Costs (1000 meetings)

| Component | Cost |
|-----------|------|
| AI Processing | $1,390 |
| Vector Database (Pinecone) | $70 |
| Storage (100GB transcripts) | $10 |
| **Total** | **$1,470/month** |

### Cost Optimization Strategies
1. Batch processing for non-urgent meetings
2. Use smaller models (GPT-4o-mini) for simple tasks
3. Cache frequent queries
4. Implement tiered features (basic vs pro)

---

## 📊 Success Metrics

### Adoption Metrics
- % of meetings transcribed
- % of meetings with summaries viewed
- Action items completion rate
- Search queries per user per week

### Quality Metrics
- Transcription accuracy (WER < 10%)
- Summary relevance score (user ratings)
- Action item accuracy (false positive rate < 5%)
- Search result relevance (nDCG > 0.8)

### Business Metrics
- Time saved per user per week
- Meeting productivity increase
- User satisfaction (NPS > 50)
- Feature usage retention

---

## 🔧 Technical Architecture

### New Services

```
services/
├── transcription-service/   # Whisper API integration
├── nlp-service/             # Python microservice for spaCy, etc.
├── analytics-service/       # Compute meeting metrics
├── search-service/          # Vector search with Pinecone
└── ml-service/              # ML models for predictions

shared/
├── embeddings/              # Embedding generation utilities
├── prompts/                 # LLM prompt templates
└── ml-models/               # Trained models
```

### Database Extensions

```sql
-- New tables: 19 tables total
transcriptions (6 tables)
  - transcriptions
  - transcription_segments
  - emotion_segments
  - speaker_statistics

analysis (7 tables)
  - meeting_summaries
  - meeting_topics
  - meeting_categories
  - action_items
  - decisions
  - meeting_entities
  - meeting_keywords

intelligence (6 tables)
  - participation_metrics
  - meeting_dynamics
  - qa_mappings
  - meeting_scores
  - embeddings
  - ml_predictions
```

---

## 🚦 Feature Priority Matrix

### Must Have (P0) - MVP
- ✅ Transcription
- ✅ Summarization
- ✅ Action items extraction

### Should Have (P1) - Launch
- ✅ Speaker diarization
- ✅ Topic extraction
- ✅ Participation analytics
- ✅ Intelligent search
- ✅ Smart briefs

### Nice to Have (P2) - Growth
- ✅ Meeting quality score
- ✅ Emotion detection
- ✅ Q&A mapping
- ✅ Meeting dynamics

### Future (P3) - Innovation
- ✅ Predictive insights
- ✅ Advanced ML models

---

## 📚 Resources & References

### AI Services
- **OpenAI Whisper:** https://platform.openai.com/docs/guides/speech-to-text
- **AssemblyAI:** https://www.assemblyai.com/
- **Pinecone:** https://www.pinecone.io/
- **Hume AI:** https://www.hume.ai/

### Open Source Tools
- **spaCy:** https://spacy.io/
- **Pyannote:** https://github.com/pyannote/pyannote-audio
- **KeyBERT:** https://github.com/MaartenGr/KeyBERT

### Research Papers
- Speaker Diarization: "End-to-End Neural Speaker Diarization"
- Emotion Recognition: "Speech Emotion Recognition using Deep Learning"
- Meeting Summarization: "Abstractive Meeting Summarization via Hierarchical Adaptive Segmental Network"

---

## 🎬 Getting Started

### Step 1: Enable Transcription (Week 1)
```bash
# Setup transcription service
cd services/transcription-service
npm install
npm run build

# Set environment variables
export OPENAI_API_KEY=sk-...

# Start service
docker-compose up transcription-service
```

### Step 2: Test API
```bash
# Transcribe a meeting
curl -X POST http://localhost:8083/transcribe \
  -H "Content-Type: application/json" \
  -d '{"meeting_id": 1}'

# Check status
curl http://localhost:8083/transcriptions/1
```

### Step 3: Frontend Integration
```typescript
// Add to frontend
const transcription = await api.getTranscription(meetingId);
// Display in UI
```

---

## 📝 Notes

- All features são modulares e podem ser implementadas independentemente
- Priorize features baseadas em feedback dos usuários
- Considere começar com 1-2 features MVP antes de escalar
- Monitore custos de AI APIs continuamente
- Implemente rate limiting e quotas por usuário
- Considere compliance (LGPD/GDPR) ao processar gravações

---

**Last Updated:** 2025-10-30
**Next Review:** 2025-11-15
**Owner:** Development Team
