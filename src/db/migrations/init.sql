CREATE TABLE IF NOT EXISTS bots (
	bot_id VARCHAR(50) UNIQUE NOT NULL,
	name VARCHAR(50) UNIQUE NOT NULL,
	description VARCHAR(300),
	ai_provider VARCHAR(50) NOT NULL,
	ai_model VARCHAR(50) NOT NULL,
	api_key VARCHAR(300) NOT NULL,
	knowledge TEXT,
	created_at timestamp DEFAULT NOW(),
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
	created_at timestamp DEFAULT NOW(),
	PRIMARY KEY(hook_id),
	FOREIGN KEY(bot_id) REFERENCES bots(bot_id)
);

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
    -- Replace 'column_name' with your actual column name
    NEW.name := LOWER(NEW.name);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER lowercase_before_insert_update
BEFORE INSERT OR UPDATE ON bots
FOR EACH ROW
EXECUTE FUNCTION lowercase_bot_name();
