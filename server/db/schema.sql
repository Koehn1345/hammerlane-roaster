CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE green_beans (
  id SERIAL PRIMARY KEY,
  origin VARCHAR(255) NOT NULL,
  supplier VARCHAR(255),
  lbs_purchased DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  cost_per_lb DECIMAL(10,2),
  lbs_remaining DECIMAL(10,2),
  date_received DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bag_inventory (
  id SERIAL PRIMARY KEY,
  size_oz INTEGER NOT NULL,
  size_label VARCHAR(50),
  quantity_on_hand INTEGER DEFAULT 0,
  cost_each DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE blends (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE blend_components (
  id SERIAL PRIMARY KEY,
  blend_id INTEGER REFERENCES blends(id) ON DELETE CASCADE,
  green_bean_id INTEGER REFERENCES green_beans(id),
  percentage DECIMAL(5,2) NOT NULL
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  blend_id INTEGER REFERENCES blends(id),
  bag_size_oz INTEGER,
  quantity INTEGER NOT NULL,
  roast_date DATE,
  sale_price_per_bag DECIMAL(10,2),
  cost_beans DECIMAL(10,2),
  cost_bags DECIMAL(10,2),
  profit DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'pending',
  sms_sent BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);