CREATE TABLE IF NOT EXISTS bots (
    bot_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(300),
    knowledge TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY(bot_id)
);

CREATE TABLE IF NOT EXISTS hooks (
    hook_id VARCHAR(50) UNIQUE NOT NULL,
    bot_id VARCHAR(50) NOT NULL,
    name VARCHAR(50) UNIQUE NOT NULL,
    signal VARCHAR(600) NOT NULL,
    url VARCHAR(300),
    method VARCHAR(10),
    payload JSONB,
    headers JSONB,
    response TEXT,
    rephrase BOOLEAN DEFAULT false,
    api_calling BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY(hook_id),
    FOREIGN KEY(bot_id) REFERENCES bots(bot_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS resources (
    id VARCHAR(50) UNIQUE NOT NULL PRIMARY KEY,
		bot_id VARCHAR(50) REFERENCES bots(bot_id) ON DELETE CASCADE,
    content TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Ensure the vector extension is enabled (already exists, so it won't cause errors)
DO $$ BEGIN
    CREATE EXTENSION IF NOT EXISTS vector;
END $$;

CREATE TABLE IF NOT EXISTS embeddings (
    id VARCHAR(191) UNIQUE NOT NULL PRIMARY KEY,
    resource_id VARCHAR(50) REFERENCES resources(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding VECTOR(768) NOT NULL
);

CREATE INDEX IF NOT EXISTS embedding_index ON embeddings USING hnsw (embedding vector_cosine_ops);

CREATE OR REPLACE FUNCTION delete_related_hooks()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM hooks WHERE bot_id = OLD.bot_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER delete_bot_hooks
BEFORE DELETE ON bots
FOR EACH ROW
EXECUTE FUNCTION delete_related_hooks();

CREATE OR REPLACE FUNCTION lowercase_bot_name()
RETURNS TRIGGER AS $$
BEGIN
    NEW.name := LOWER(NEW.name);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER lowercase_before_insert_update
BEFORE INSERT OR UPDATE ON bots
FOR EACH ROW
EXECUTE FUNCTION lowercase_bot_name();


CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_timestamp
BEFORE UPDATE ON resources
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();
