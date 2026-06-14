CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Customers
CREATE TABLE customers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  phone         TEXT NOT NULL,
  city          TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Orders
CREATE TABLE orders (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id   UUID REFERENCES customers(id) ON DELETE CASCADE,
  product_name  TEXT NOT NULL,
  category      TEXT NOT NULL,
  amount        NUMERIC(10,2) NOT NULL,
  ordered_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Segments
CREATE TABLE segments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  description   TEXT,
  nl_query      TEXT NOT NULL,
  sql_filter    TEXT NOT NULL,
  customer_ids  UUID[] NOT NULL DEFAULT '{}',
  customer_count INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Campaigns
CREATE TABLE campaigns (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  segment_id    UUID REFERENCES segments(id),
  channel       TEXT NOT NULL CHECK (channel IN ('whatsapp','sms','email','rcs')),
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','running','completed','failed')),
  goal          TEXT NOT NULL,
  sent_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Per-customer messages for a campaign (personalised)
CREATE TABLE campaign_messages (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id   UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  customer_id   UUID REFERENCES customers(id) ON DELETE CASCADE,
  message_text  TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','sent','delivered','failed','opened','clicked','converted')),
  event_log     JSONB NOT NULL DEFAULT '[]',
  external_id   TEXT UNIQUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- AI debrief per campaign (generated after completion)
CREATE TABLE campaign_debriefs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id   UUID UNIQUE REFERENCES campaigns(id) ON DELETE CASCADE,
  summary       TEXT NOT NULL,
  best_channel  TEXT,
  click_no_buy_ids UUID[],
  recommendation TEXT NOT NULL,
  best_send_time TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Idempotency event tracking
CREATE TABLE processed_event_ids (
  event_id      TEXT PRIMARY KEY,
  processed_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_ordered_at ON orders(ordered_at);
CREATE INDEX idx_campaign_messages_campaign ON campaign_messages(campaign_id);
CREATE INDEX idx_campaign_messages_external ON campaign_messages(external_id);
CREATE INDEX idx_campaign_messages_status ON campaign_messages(status);
