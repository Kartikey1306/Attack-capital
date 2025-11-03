-- ============================================================
-- PostgreSQL Database Schema for CallConnect Pro
-- Enterprise Call Automation Platform with AMD
-- ============================================================

-- Create database (run this as superuser)
-- CREATE DATABASE callconnect_pro;
-- \c callconnect_pro;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE "CallStatus" AS ENUM (
  'INITIATED',
  'RINGING',
  'ANSWERED',
  'HUMAN_DETECTED',
  'MACHINE_DETECTED',
  'FAILED',
  'COMPLETED',
  'NO_ANSWER',
  'BUSY'
);

CREATE TYPE "AmdStrategy" AS ENUM (
  'TWILIO_NATIVE',
  'JAMBONZ',
  'HUGGINGFACE',
  'GEMINI_FLASH'
);

CREATE TYPE "AmdResult" AS ENUM (
  'HUMAN',
  'MACHINE',
  'UNCERTAIN',
  'TIMEOUT',
  'ERROR'
);

-- ============================================================
-- USER TABLE
-- ============================================================

CREATE TABLE "User" (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  password TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_email ON "User"(email);

-- ============================================================
-- SESSION TABLE
-- ============================================================

CREATE TABLE "Session" (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_session_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
);

CREATE INDEX idx_session_user ON "Session"("userId");
CREATE INDEX idx_session_token ON "Session"(token);
CREATE INDEX idx_session_expires ON "Session"("expiresAt");

-- ============================================================
-- CALL LOG TABLE (Main call records)
-- ============================================================

CREATE TABLE "CallLog" (
  id TEXT PRIMARY KEY,
  "phoneNumber" TEXT NOT NULL,
  status "CallStatus" NOT NULL DEFAULT 'INITIATED',
  "amdStrategy" "AmdStrategy" NOT NULL,
  "amdResult" "AmdResult",
  "amdConfidence" DOUBLE PRECISION,
  "audioUrl" TEXT,
  transcript TEXT,
  duration INTEGER,
  "twilioCallSid" TEXT UNIQUE,
  "jambonzCallId" TEXT UNIQUE,
  "startTime" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endTime" TIMESTAMP,
  "errorMessage" TEXT,
  "userId" TEXT,
  "detectedGreeting" TEXT,
  "agentConnected" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_calllog_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE SET NULL
);

CREATE INDEX idx_calllog_user ON "CallLog"("userId");
CREATE INDEX idx_calllog_status ON "CallLog"(status);
CREATE INDEX idx_calllog_strategy ON "CallLog"("amdStrategy");
CREATE INDEX idx_calllog_start ON "CallLog"("startTime");
CREATE INDEX idx_calllog_twilio ON "CallLog"("twilioCallSid");
CREATE INDEX idx_calllog_result ON "CallLog"("amdResult");

-- ============================================================
-- CALL EVENT TABLE (Event history for each call)
-- ============================================================

CREATE TABLE "CallEvent" (
  id TEXT PRIMARY KEY,
  "callLogId" TEXT NOT NULL,
  type TEXT NOT NULL,
  payload JSONB,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_callevent_call FOREIGN KEY ("callLogId") REFERENCES "CallLog"(id) ON DELETE CASCADE
);

CREATE INDEX idx_callevent_call ON "CallEvent"("callLogId");
CREATE INDEX idx_callevent_timestamp ON "CallEvent"(timestamp);
CREATE INDEX idx_callevent_type ON "CallEvent"(type);

-- ============================================================
-- TRIGGERS FOR UPDATED AT
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "User"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calllog_updated_at BEFORE UPDATE ON "CallLog"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- VIEWS FOR ANALYTICS
-- ============================================================

-- View: Call Statistics Summary
CREATE OR REPLACE VIEW call_statistics_summary AS
SELECT 
  COUNT(*) as total_calls,
  COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_calls,
  COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed_calls,
  COUNT(CASE WHEN "amdResult" = 'HUMAN' THEN 1 END) as human_detections,
  COUNT(CASE WHEN "amdResult" = 'MACHINE' THEN 1 END) as machine_detections,
  AVG(CASE WHEN "amdConfidence" IS NOT NULL THEN "amdConfidence" END) as avg_confidence,
  AVG(CASE WHEN duration IS NOT NULL THEN duration END) as avg_duration,
  COUNT(CASE WHEN status = 'HUMAN_DETECTED' THEN 1 END) as human_answered_calls,
  COUNT(CASE WHEN status = 'MACHINE_DETECTED' THEN 1 END) as machine_answered_calls
FROM "CallLog";

-- View: Strategy Performance
CREATE OR REPLACE VIEW strategy_performance AS
SELECT 
  "amdStrategy",
  COUNT(*) as total_calls,
  COUNT(CASE WHEN "amdResult" = 'HUMAN' THEN 1 END) as human_count,
  COUNT(CASE WHEN "amdResult" = 'MACHINE' THEN 1 END) as machine_count,
  COUNT(CASE WHEN "amdResult" IN ('HUMAN', 'MACHINE') THEN 1 END) as total_detections,
  ROUND(
    COUNT(CASE WHEN "amdResult" IN ('HUMAN', 'MACHINE') THEN 1 END)::NUMERIC / 
    NULLIF(COUNT(*), 0) * 100, 
    2
  ) as detection_rate,
  AVG("amdConfidence") as avg_confidence,
  AVG(duration) as avg_duration
FROM "CallLog"
GROUP BY "amdStrategy";

-- View: Recent Calls with Details
CREATE OR REPLACE VIEW recent_calls_view AS
SELECT 
  cl.id,
  cl."phoneNumber",
  cl.status,
  cl."amdStrategy",
  cl."amdResult",
  cl."amdConfidence",
  cl."startTime",
  cl."endTime",
  cl.duration,
  cl."agentConnected",
  u.email as user_email,
  COUNT(ce.id) as event_count
FROM "CallLog" cl
LEFT JOIN "User" u ON cl."userId" = u.id
LEFT JOIN "CallEvent" ce ON cl.id = ce."callLogId"
GROUP BY cl.id, u.email
ORDER BY cl."startTime" DESC;

-- ============================================================
-- USEFUL FUNCTIONS
-- ============================================================

-- Function: Get call by Twilio SID
CREATE OR REPLACE FUNCTION get_call_by_twilio_sid(sid TEXT)
RETURNS TABLE (
  id TEXT,
  "phoneNumber" TEXT,
  status "CallStatus",
  "amdStrategy" "AmdStrategy",
  "amdResult" "AmdResult",
  "amdConfidence" DOUBLE PRECISION,
  "startTime" TIMESTAMP,
  "endTime" TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cl.id,
    cl."phoneNumber",
    cl.status,
    cl."amdStrategy",
    cl."amdResult",
    cl."amdConfidence",
    cl."startTime",
    cl."endTime"
  FROM "CallLog" cl
  WHERE cl."twilioCallSid" = sid;
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate AMD accuracy for a strategy
CREATE OR REPLACE FUNCTION calculate_strategy_accuracy(strategy_name "AmdStrategy")
RETURNS TABLE (
  accuracy_percent NUMERIC,
  total_calls BIGINT,
  successful_detections BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROUND(
      COUNT(CASE WHEN "amdResult" IN ('HUMAN', 'MACHINE') THEN 1 END)::NUMERIC / 
      NULLIF(COUNT(*), 0) * 100, 
      2
    ) as accuracy_percent,
    COUNT(*) as total_calls,
    COUNT(CASE WHEN "amdResult" IN ('HUMAN', 'MACHINE') THEN 1 END) as successful_detections
  FROM "CallLog"
  WHERE "amdStrategy" = strategy_name;
END;
$$ LANGUAGE plpgsql;

-- Function: Get calls by date range
CREATE OR REPLACE FUNCTION get_calls_by_date_range(
  start_date TIMESTAMP,
  end_date TIMESTAMP
)
RETURNS TABLE (
  id TEXT,
  "phoneNumber" TEXT,
  status "CallStatus",
  "amdStrategy" "AmdStrategy",
  "amdResult" "AmdResult",
  "startTime" TIMESTAMP,
  duration INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cl.id,
    cl."phoneNumber",
    cl.status,
    cl."amdStrategy",
    cl."amdResult",
    cl."startTime",
    cl.duration
  FROM "CallLog" cl
  WHERE cl."startTime" >= start_date 
    AND cl."startTime" <= end_date
  ORDER BY cl."startTime" DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================

-- Insert a sample user
-- INSERT INTO "User" (id, email, name, password) VALUES 
--   ('usr_' || gen_random_uuid()::text, 'test@example.com', 'Test User', 'hashed_password_here');

-- Insert sample call logs
-- INSERT INTO "CallLog" (id, "phoneNumber", status, "amdStrategy", "amdResult", "amdConfidence") VALUES
--   ('cl_' || gen_random_uuid()::text, '+1234567890', 'COMPLETED', 'TWILIO_NATIVE', 'HUMAN', 0.95);

-- ============================================================
-- GRANT PERMISSIONS (Adjust as needed)
-- ============================================================

-- Grant access to application user
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO app_user;

-- ============================================================
-- NOTES
-- ============================================================
-- 
-- 1. Run this schema on your PostgreSQL database to set up all tables
-- 2. Make sure to create a dedicated database user with appropriate permissions
-- 3. Update the DATABASE_URL in your .env file after running this schema
-- 4. Use Prisma migrations for schema changes in development: npm run db:migrate
-- 5. All timestamps are in UTC by default
-- 6. JSONB is used for flexible payload storage in CallEvent table
-- 7. Indexes are created for common query patterns
-- 8. Cascade deletes ensure data integrity
-- 
-- ============================================================

