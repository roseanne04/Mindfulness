-- Create database schema for MindfulSpace

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    age INTEGER,
    gender VARCHAR(50),
    bio TEXT,
    profile_complete BOOLEAN DEFAULT FALSE,
    join_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Moods table
CREATE TABLE IF NOT EXISTS moods (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    emoji VARCHAR(10) NOT NULL,
    mood VARCHAR(50) NOT NULL,
    mood_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, mood_date)
);

-- Gratitudes table
CREATE TABLE IF NOT EXISTS gratitudes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    gratitude_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Journal entries table
CREATE TABLE IF NOT EXISTS journal_entries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    category VARCHAR(100),
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Friend requests table
CREATE TABLE IF NOT EXISTS friend_requests (
    id SERIAL PRIMARY KEY,
    requester_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    target_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(requester_id, target_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_moods_user_date ON moods(user_id, mood_date);
CREATE INDEX IF NOT EXISTS idx_gratitudes_user_date ON gratitudes(user_id, gratitude_date);
CREATE INDEX IF NOT EXISTS idx_journal_user_public ON journal_entries(user_id, is_public);
CREATE INDEX IF NOT EXISTS idx_journal_public_category ON journal_entries(is_public, category) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_friend_requests_requester ON friend_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_journal_entries_updated_at BEFORE UPDATE ON journal_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data (optional)
INSERT INTO users (name, email, password, age, gender, bio, profile_complete, join_date) VALUES
('Sarah Johnson', 'sarah@example.com', '$2a$10$example.hash.here', 28, 'female', 'Mental health advocate and yoga enthusiast. Finding peace in mindfulness.', true, NOW() - INTERVAL '30 days'),
('Michael Chen', 'michael@example.com', '$2a$10$example.hash.here', 34, 'male', 'Meditation practitioner and wellness coach. Here to support and grow.', true, NOW() - INTERVAL '15 days'),
('Emma Rodriguez', 'emma@example.com', '$2a$10$example.hash.here', 25, 'female', 'Art therapy student learning to heal through creativity and community.', true, NOW() - INTERVAL '7 days')
ON CONFLICT (email) DO NOTHING;
