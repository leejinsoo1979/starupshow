-- Agent Memory and RAG System Migration
-- Enables persistent memory and vector search for AI agents

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- AGENT MEMORY TABLE
-- Stores key-value pairs for agent context/memory
-- =====================================================
CREATE TABLE IF NOT EXISTS public.agent_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id TEXT NOT NULL,
    memory_key TEXT NOT NULL,
    memory_value JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint for upsert operations
    CONSTRAINT agent_memory_unique UNIQUE (agent_id, memory_key)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_agent_memory_agent_id ON public.agent_memory(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_key ON public.agent_memory(memory_key);

-- =====================================================
-- DOCUMENT EMBEDDINGS TABLE
-- Stores document chunks with vector embeddings for RAG
-- =====================================================
CREATE TABLE IF NOT EXISTS public.document_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id TEXT NOT NULL DEFAULT 'default',
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    embedding vector(1536), -- OpenAI text-embedding-3-small dimension
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for vector similarity search (IVFFlat for performance)
CREATE INDEX IF NOT EXISTS idx_document_embeddings_collection
    ON public.document_embeddings(collection_id);

CREATE INDEX IF NOT EXISTS idx_document_embeddings_vector
    ON public.document_embeddings
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- =====================================================
-- RAG COLLECTIONS TABLE
-- Manages document collections for organization
-- =====================================================
CREATE TABLE IF NOT EXISTS public.rag_collections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES auth.users(id),
    startup_id UUID REFERENCES public.startups(id),
    settings JSONB DEFAULT '{"chunk_size": 1000, "chunk_overlap": 200}',
    document_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- MATCH DOCUMENTS FUNCTION
-- Vector similarity search for RAG
-- =====================================================
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding vector(1536),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 5,
    filter_collection TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        de.id,
        de.content,
        de.metadata,
        1 - (de.embedding <=> query_embedding) AS similarity
    FROM public.document_embeddings de
    WHERE
        (filter_collection IS NULL OR de.collection_id = filter_collection)
        AND 1 - (de.embedding <=> query_embedding) > match_threshold
    ORDER BY de.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- =====================================================
-- CONVERSATION MEMORY TABLE
-- Stores conversation history for context window
-- =====================================================
CREATE TABLE IF NOT EXISTS public.agent_conversation_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL,
    conversation_id UUID NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast conversation lookup
CREATE INDEX IF NOT EXISTS idx_agent_conversation_memory_agent
    ON public.agent_conversation_memory(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversation_memory_conversation
    ON public.agent_conversation_memory(conversation_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversation_memory_created
    ON public.agent_conversation_memory(created_at DESC);

-- =====================================================
-- HELPER FUNCTION: Insert Document with Embedding
-- =====================================================
CREATE OR REPLACE FUNCTION insert_document_embedding(
    p_collection_id TEXT,
    p_content TEXT,
    p_metadata JSONB,
    p_embedding vector(1536)
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO public.document_embeddings (collection_id, content, metadata, embedding)
    VALUES (p_collection_id, p_content, p_metadata, p_embedding)
    RETURNING id INTO v_id;

    -- Update document count in collection
    UPDATE public.rag_collections
    SET document_count = document_count + 1,
        updated_at = NOW()
    WHERE id = p_collection_id;

    RETURN v_id;
END;
$$;

-- =====================================================
-- HELPER FUNCTION: Get Recent Conversation Context
-- =====================================================
CREATE OR REPLACE FUNCTION get_conversation_context(
    p_agent_id UUID,
    p_conversation_id UUID,
    p_limit INT DEFAULT 10
)
RETURNS TABLE (
    role TEXT,
    content TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        acm.role,
        acm.content,
        acm.created_at
    FROM public.agent_conversation_memory acm
    WHERE acm.agent_id = p_agent_id
      AND acm.conversation_id = p_conversation_id
    ORDER BY acm.created_at DESC
    LIMIT p_limit;
END;
$$;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE public.agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_conversation_memory ENABLE ROW LEVEL SECURITY;

-- Agent Memory: Allow all authenticated users (agents operate with service role)
CREATE POLICY "Allow all for agent_memory" ON public.agent_memory
    FOR ALL USING (true);

-- Document Embeddings: Public read, authenticated write
CREATE POLICY "Allow read for document_embeddings" ON public.document_embeddings
    FOR SELECT USING (true);

CREATE POLICY "Allow insert for authenticated" ON public.document_embeddings
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- RAG Collections: Owner-based access
CREATE POLICY "Allow all for own collections" ON public.rag_collections
    FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Allow read public collections" ON public.rag_collections
    FOR SELECT USING (true);

-- Conversation Memory: Allow all for authenticated
CREATE POLICY "Allow all for conversation_memory" ON public.agent_conversation_memory
    FOR ALL USING (true);

-- =====================================================
-- GRANTS
-- =====================================================
GRANT ALL ON public.agent_memory TO authenticated;
GRANT ALL ON public.document_embeddings TO authenticated;
GRANT ALL ON public.rag_collections TO authenticated;
GRANT ALL ON public.agent_conversation_memory TO authenticated;
GRANT EXECUTE ON FUNCTION match_documents TO authenticated;
GRANT EXECUTE ON FUNCTION insert_document_embedding TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversation_context TO authenticated;
