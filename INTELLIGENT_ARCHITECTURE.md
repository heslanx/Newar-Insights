# Newar Insights - Intelligent Features Architecture

**Visual Architecture Overview**

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js 15)                        │
├─────────────────────────────────────────────────────────────────────┤
│  /recordings/:id/transcript    │  /recordings/:id/insights          │
│  /recordings/:id/summary       │  /search                           │
│  /analytics/team               │  /analytics/meetings               │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                            REST API (JSON)
                                   │
┌─────────────────────────────────────────────────────────────────────┐
│                    API GATEWAY (Port 8080)                           │
│                    Authentication & Rate Limiting                     │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                ┌──────────────────┼──────────────────┐
                │                  │                  │
                ▼                  ▼                  ▼
┌───────────────────────┐ ┌───────────────────┐ ┌──────────────────┐
│   BOT MANAGER         │ │  TRANSCRIPTION    │ │  ANALYTICS       │
│   (Port 8082)         │ │  SERVICE          │ │  SERVICE         │
│                       │ │  (Port 8083)      │ │  (Port 8084)     │
│ • Spawn bots          │ │                   │ │                  │
│ • Recording mgmt      │ │ • Whisper API     │ │ • Participation  │
│ • Finalization        │ │ • Diarization     │ │ • Dynamics       │
│                       │ │ • Summarization   │ │ • Scoring        │
└───────────────────────┘ └───────────────────┘ └──────────────────┘
                │                  │                  │
                │                  │                  │
                ▼                  ▼                  ▼
┌───────────────────────┐ ┌───────────────────┐ ┌──────────────────┐
│   NLP SERVICE         │ │  SEARCH SERVICE   │ │  ML SERVICE      │
│   (Port 8085)         │ │  (Port 8086)      │ │  (Port 8087)     │
│   Python              │ │  Go + Vector DB   │ │  Python          │
│                       │ │                   │ │                  │
│ • spaCy NER           │ │ • Embeddings      │ │ • Predictions    │
│ • KeyBERT             │ │ • Semantic search │ │ • Models         │
│ • Entity extraction   │ │ • Indexing        │ │ • Training       │
└───────────────────────┘ └───────────────────┘ └──────────────────┘
                │                  │                  │
                └──────────────────┼──────────────────┘
                                   │
                ┌──────────────────┼──────────────────┐
                │                  │                  │
                ▼                  ▼                  ▼
┌───────────────────────┐ ┌───────────────────┐ ┌──────────────────┐
│   POSTGRESQL          │ │  REDIS            │ │  PINECONE        │
│   (Supabase)          │ │  (Pub/Sub)        │ │  (Vector Store)  │
│                       │ │                   │ │                  │
│ • Meetings            │ │ • Job Queue       │ │ • Embeddings     │
│ • Transcriptions      │ │ • Cache           │ │ • Search Index   │
│ • Analytics           │ │ • Real-time       │ │ • Similarity     │
└───────────────────────┘ └───────────────────┘ └──────────────────┘
                                   │
                                   ▼
                        ┌─────────────────────┐
                        │   EXTERNAL APIs     │
                        ├─────────────────────┤
                        │ • OpenAI Whisper    │
                        │ • OpenAI GPT-4      │
                        │ • AssemblyAI        │
                        │ • Hume AI           │
                        └─────────────────────┘
```

---

## 📊 Data Flow

### Recording → Intelligence Pipeline

```
┌──────────────────────────────────────────────────────────────────────┐
│                          RECORDING FLOW                               │
└──────────────────────────────────────────────────────────────────────┘

1. RECORDING PHASE
   ┌─────────┐
   │ Bot     │ Records audio in 10s chunks
   │ Manager │ ──────────────────────┐
   └─────────┘                       │
                                     ▼
                           ┌──────────────────┐
                           │ Storage          │
                           │ (WebM files)     │
                           └──────────────────┘

2. FINALIZATION
   ┌─────────┐
   │ FFmpeg  │ Concatenates chunks
   │ Concat  │ ──────────────────────┐
   └─────────┘                       │
                                     ▼
                           ┌──────────────────┐
                           │ Final Recording  │
                           │ (single WebM)    │
                           └──────────────────┘
                                     │
                                     │ Triggers
                                     ▼
3. TRANSCRIPTION
   ┌──────────────┐       ┌──────────────────┐
   │ Job Queue    │──────▶│ Whisper API      │
   │ (Bull/Redis) │       │ (Audio → Text)   │
   └──────────────┘       └──────────────────┘
         │                          │
         │                          ▼
         │                ┌──────────────────┐
         │                │ Transcription    │
         │                │ Segments + Text  │
         │                └──────────────────┘
         │                          │
         └──────────────────────────┼──────────────┐
                                    │              │
                                    ▼              ▼
4. PARALLEL PROCESSING         ┌─────────┐  ┌─────────┐
                               │ Speaker │  │ Summary │
                               │ ID      │  │ GPT-4   │
                               └─────────┘  └─────────┘
                                    │              │
                                    ▼              ▼
                               ┌─────────┐  ┌─────────┐
                               │ Actions │  │ Topics  │
                               │ Extract │  │ Extract │
                               └─────────┘  └─────────┘
                                    │              │
                                    └──────┬───────┘
                                           │
5. ENRICHMENT                              ▼
                               ┌──────────────────┐
                               │ NLP Service      │
                               │ • Entities       │
                               │ • Keywords       │
                               │ • Sentiment      │
                               └──────────────────┘
                                           │
6. INDEXING                                ▼
                               ┌──────────────────┐
                               │ Vector Store     │
                               │ (Embeddings)     │
                               └──────────────────┘
                                           │
7. READY                                   ▼
                               ┌──────────────────┐
                               │ 🎉 Intelligence  │
                               │    Available     │
                               └──────────────────┘
```

---

## 🗄️ Database Schema Overview

### Core Tables (Existing)
```
meetings
├── id (PK)
├── user_id (FK → users)
├── platform
├── meeting_id
├── status
├── recording_path
└── ...

meeting_participants
├── id (PK)
├── meeting_id (FK → meetings)
├── name
├── joined_at
└── left_at
```

### Transcription Tables (New)
```
transcriptions
├── id (PK)
├── meeting_id (FK → meetings)
├── full_text
├── language
├── word_count
├── status
└── ...

transcription_segments
├── id (PK)
├── transcription_id (FK → transcriptions)
├── speaker_id
├── participant_id (FK → meeting_participants)
├── start_time
├── end_time
├── text
├── confidence
└── words_json

emotion_segments
├── id (PK)
├── transcription_segment_id (FK → transcription_segments)
├── emotion
├── confidence
├── intensity
├── valence
└── arousal
```

### Analysis Tables (New)
```
meeting_summaries
├── id (PK)
├── meeting_id (FK → meetings)
├── summary_type (executive, detailed, bullets)
├── content
└── ...

meeting_topics
├── id (PK)
├── meeting_id (FK → meetings)
├── topic
├── relevance
├── duration_seconds
└── keywords

action_items
├── id (PK)
├── meeting_id (FK → meetings)
├── description
├── assigned_to
├── due_date
├── priority
├── status
└── ...

decisions
├── id (PK)
├── meeting_id (FK → meetings)
├── decision
├── decided_by
├── impact_level
└── ...

meeting_entities
├── id (PK)
├── meeting_id (FK → meetings)
├── entity_type (person, org, location, date, money)
├── entity_value
└── mention_count
```

### Intelligence Tables (New)
```
participation_metrics
├── meeting_id (FK → meetings)
├── participant_id (FK → meeting_participants)
├── speaking_percentage
├── turn_count
├── interruptions
└── ...

meeting_dynamics
├── meeting_id (PK, FK → meetings)
├── participation_balance
├── effectiveness_score
├── engagement_level
└── ...

meeting_scores
├── meeting_id (PK, FK → meetings)
├── overall_score (0-100)
├── structure_score
├── participation_score
├── productivity_score
├── engagement_score
└── emotional_score

embeddings
├── id (PK)
├── segment_id (FK → transcription_segments)
├── vector (1536 dimensions)
├── model_used
└── created_at
```

---

## 🔄 Service Communication

### Synchronous (REST API)

```
Frontend ←─────────────────→ API Gateway
                                  │
             ┌────────────────────┼────────────────────┐
             │                    │                    │
             ▼                    ▼                    ▼
        Bot Manager      Transcription Service   Analytics Service
             │                    │                    │
             └────────────────────┴────────────────────┘
                                  │
                                  ▼
                            PostgreSQL DB
```

### Asynchronous (Job Queue)

```
Meeting Completed Event
        │
        ▼
   ┌─────────┐
   │ Redis   │
   │ Queue   │
   └─────────┘
        │
        ├─────────────────────────────────────────────┐
        │                                             │
        ▼                                             ▼
┌──────────────────┐                         ┌──────────────────┐
│ Transcription    │                         │ Speaker          │
│ Worker           │                         │ Diarization      │
│                  │                         │ Worker           │
│ Priority: HIGH   │                         │ Priority: HIGH   │
│ Timeout: 2h      │                         │ Timeout: 1h      │
└──────────────────┘                         └──────────────────┘
        │                                             │
        │                                             │
        ├─────────────────────────────────────────────┤
        │                                             │
        ▼                                             ▼
┌──────────────────┐                         ┌──────────────────┐
│ Summarization    │                         │ Action Items     │
│ Worker           │                         │ Extraction       │
│                  │                         │ Worker           │
│ Priority: MEDIUM │                         │ Priority: MEDIUM │
│ Timeout: 15m     │                         │ Timeout: 10m     │
└──────────────────┘                         └──────────────────┘
        │                                             │
        │                                             │
        ▼                                             ▼
┌──────────────────┐                         ┌──────────────────┐
│ Topic Extraction │                         │ Entity           │
│ Worker           │                         │ Extraction       │
│                  │                         │ Worker           │
│ Priority: LOW    │                         │ Priority: LOW    │
│ Timeout: 10m     │                         │ Timeout: 10m     │
└──────────────────┘                         └──────────────────┘
        │                                             │
        └─────────────────────────────────────────────┘
                                │
                                ▼
                        All jobs complete
                                │
                                ▼
                        Webhook notification
                                │
                                ▼
                        Email brief sent
```

---

## 🎛️ Service Details

### Transcription Service (Node.js/Go)

**Responsibilities:**
- Audio file preprocessing
- Whisper API integration
- Chunk management for large files
- Result storage
- Job queue management

**Endpoints:**
```
POST   /transcribe               # Start transcription job
GET    /transcriptions/:id       # Get transcription result
GET    /transcriptions/:id/status # Check job status
POST   /transcriptions/:id/retry  # Retry failed job
```

**Dependencies:**
- OpenAI API (Whisper)
- PostgreSQL
- Redis (Bull queue)
- FFmpeg (audio conversion)

---

### NLP Service (Python)

**Responsibilities:**
- Named Entity Recognition (spaCy)
- Keyword extraction (KeyBERT)
- Emotion analysis
- Custom NLP models

**Endpoints:**
```
POST   /extract/entities    # Extract named entities
POST   /extract/keywords    # Extract keywords
POST   /analyze/sentiment   # Sentiment analysis
POST   /analyze/emotion     # Emotion detection
```

**Dependencies:**
- spaCy (pt_core_news_lg)
- KeyBERT
- Transformers (HuggingFace)
- Custom models

---

### Search Service (Go)

**Responsibilities:**
- Generate embeddings
- Index transcripts
- Semantic search
- Full-text search
- Result ranking

**Endpoints:**
```
POST   /index                    # Index new transcript
POST   /search                   # Semantic search
GET    /search/suggest           # Auto-suggest
POST   /embeddings/generate      # Generate embeddings
```

**Dependencies:**
- OpenAI Embeddings API
- Pinecone Vector DB
- PostgreSQL (full-text search)

---

### Analytics Service (Go)

**Responsibilities:**
- Calculate participation metrics
- Meeting dynamics analysis
- Quality scoring
- Trend analysis

**Endpoints:**
```
POST   /analyze/participation   # Calculate participation metrics
POST   /analyze/dynamics        # Meeting dynamics
POST   /score/meeting           # Calculate quality score
GET    /analytics/team          # Team performance
GET    /analytics/trends        # Historical trends
```

**Dependencies:**
- PostgreSQL
- Redis (cache)

---

### ML Service (Python)

**Responsibilities:**
- Train prediction models
- Duration prediction
- Outcome prediction
- Anomaly detection

**Endpoints:**
```
POST   /predict/duration        # Predict meeting duration
POST   /predict/outcome         # Predict meeting outcome
POST   /predict/attendance      # Predict attendance
POST   /train/model             # Train/retrain model
```

**Dependencies:**
- scikit-learn
- XGBoost
- TensorFlow/PyTorch
- MLflow (experiment tracking)

---

## 🔐 Security Architecture

### Authentication Flow

```
User Request
     │
     ▼
┌─────────────────┐
│ API Gateway     │
│                 │
│ 1. Extract      │
│    X-API-Key    │
│                 │
│ 2. Validate     │
│    Token Hash   │
│                 │
│ 3. Get User ID  │
└─────────────────┘
     │
     ├─ Valid ────────────▶ Forward to Service
     │
     └─ Invalid ──────────▶ 401 Unauthorized
```

### Data Privacy

```
Recording Audio
     │
     ▼
┌─────────────────┐
│ Encryption at   │
│ Rest (AES-256)  │
└─────────────────┘
     │
     ▼
┌─────────────────┐
│ Transcription   │
│ (ephemeral)     │
│                 │
│ Delete audio    │
│ after 30 days   │
└─────────────────┘
     │
     ▼
┌─────────────────┐
│ Text Storage    │
│ (encrypted)     │
│                 │
│ Retention       │
│ configurable    │
└─────────────────┘
```

---

## 📈 Scalability

### Horizontal Scaling

```
┌────────────────────────────────────────────────────────────┐
│                    Load Balancer (Nginx)                    │
└────────────────────────────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│ API Gateway │   │ API Gateway │   │ API Gateway │
│   (Pod 1)   │   │   (Pod 2)   │   │   (Pod 3)   │
└─────────────┘   └─────────────┘   └─────────────┘
         │                 │                 │
         └─────────────────┼─────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│Transcription│   │Transcription│   │Transcription│
│ Service (1) │   │ Service (2) │   │ Service (3) │
└─────────────┘   └─────────────┘   └─────────────┘
         │                 │                 │
         └─────────────────┼─────────────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ Shared Resources│
                  │ • PostgreSQL    │
                  │ • Redis         │
                  │ • Pinecone      │
                  └─────────────────┘
```

### Worker Pool (Job Queue)

```
                    Redis Queue
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
    ┌─────────┐    ┌─────────┐    ┌─────────┐
    │Worker 1 │    │Worker 2 │    │Worker 3 │
    │         │    │         │    │         │
    │Idle     │    │Busy     │    │Busy     │
    └─────────┘    └─────────┘    └─────────┘
         │               │               │
         ▼               ▼               ▼
    Processing      Processing      Processing
```

---

## 💾 Storage Architecture

### File Storage

```
storage/
├── recordings/
│   ├── temp/                    # Chunks during recording
│   │   └── {meeting_id}/
│   │       ├── chunk_00000.webm
│   │       └── chunk_00001.webm
│   │
│   └── final/                   # Concatenated recordings
│       └── user_{user_id}/
│           └── {meeting_id}_{timestamp}.webm
│
└── audio/                       # Processed audio for transcription
    └── {meeting_id}/
        ├── original.webm
        └── processed.wav        # Converted for Whisper
```

### Database Storage

```
PostgreSQL
├── Core (30 GB)
│   ├── users
│   ├── api_tokens
│   ├── meetings
│   └── meeting_participants
│
├── Transcriptions (200 GB)
│   ├── transcriptions
│   ├── transcription_segments
│   └── emotion_segments
│
├── Analysis (50 GB)
│   ├── meeting_summaries
│   ├── meeting_topics
│   ├── action_items
│   ├── decisions
│   └── meeting_entities
│
└── Intelligence (30 GB)
    ├── participation_metrics
    ├── meeting_dynamics
    ├── meeting_scores
    └── embeddings (metadata only)

Total: ~310 GB for 10,000 meetings
```

### Vector Storage (Pinecone)

```
Pinecone Index: meetings-prod
├── Dimensions: 1536 (text-embedding-3-large)
├── Metric: Cosine similarity
├── Pods: 2x (for redundancy)
└── Vectors: ~500,000 (10k meetings × 50 segments avg)

Cost: ~$140/month for 500k vectors
```

---

## 🔧 Deployment Architecture

### Development

```
docker-compose.yml
├── admin-api
├── api-gateway
├── bot-manager
├── transcription-service  (new)
├── nlp-service            (new)
├── analytics-service      (new)
├── search-service         (new)
├── postgres
├── redis
└── frontend
```

### Production (Kubernetes)

```
Kubernetes Cluster
├── Namespace: newar-prod
│   ├── Deployments:
│   │   ├── admin-api (3 replicas)
│   │   ├── api-gateway (5 replicas)
│   │   ├── bot-manager (2 replicas)
│   │   ├── transcription-service (5 replicas)
│   │   ├── nlp-service (3 replicas)
│   │   ├── analytics-service (3 replicas)
│   │   └── search-service (3 replicas)
│   │
│   ├── StatefulSets:
│   │   ├── postgres (3 replicas)
│   │   └── redis (3 replicas)
│   │
│   ├── Services:
│   │   ├── LoadBalancer (external)
│   │   └── ClusterIP (internal)
│   │
│   └── ConfigMaps & Secrets:
│       ├── app-config
│       ├── openai-api-key
│       └── database-credentials
│
└── Monitoring:
    ├── Prometheus
    ├── Grafana
    └── Jaeger (tracing)
```

---

**Last Updated:** 2025-10-30
**Next Review:** When first intelligent feature is deployed
