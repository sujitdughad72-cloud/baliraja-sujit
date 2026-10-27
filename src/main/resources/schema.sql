-- =====================================================================
-- BALIRAJA DATABASE INITIALIZATION SCHEMA (baliraja_db)
-- Target Engine: MySQL 8.0+
-- Character Set: utf8mb4 (Full Marathi, Hindi & Devanagari Unicode support)
-- =====================================================================

CREATE DATABASE IF NOT EXISTS baliraja_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE baliraja_db;

-- ---------------------------------------------------------------------
-- 1. USERS & ROLES
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE,
    phone VARCHAR(20) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('FARMER', 'BUYER', 'ADMIN') NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_phone (phone),
    INDEX idx_user_role (role)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 2. FARMER PROFILES (1-to-1 with users)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS farmers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    village VARCHAR(100),
    taluka VARCHAR(100),
    district VARCHAR(100) NOT NULL,
    state VARCHAR(100) DEFAULT 'Maharashtra',
    pin_code VARCHAR(10),
    total_land_acres DECIMAL(6, 2) DEFAULT 0.00,
    irrigation_type VARCHAR(50) DEFAULT 'Drip',
    upi_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_farmer_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 3. BUYER PROFILES (1-to-1 with users)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS buyers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    business_name VARCHAR(150),
    buyer_type ENUM('INDIVIDUAL', 'RETAILER', 'WHOLESALER', 'EXPORTER') DEFAULT 'INDIVIDUAL',
    gst_number VARCHAR(30),
    delivery_address TEXT,
    city VARCHAR(100),
    district VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_buyer_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 4. AGRICULTURAL PRODUCT CATEGORIES
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(80) NOT NULL UNIQUE,
    name_mr VARCHAR(100) NOT NULL,
    slug VARCHAR(80) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 5. AGRICULTURAL MARKETPLACE PRODUCTS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    farmer_id BIGINT NOT NULL,
    category_id BIGINT NOT NULL,
    name VARCHAR(150) NOT NULL,
    name_mr VARCHAR(150),
    description TEXT,
    price_per_unit DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(30) NOT NULL DEFAULT 'kg', -- 'kg', 'quintal', 'box', 'ton'
    stock_quantity DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    location VARCHAR(120) NOT NULL,
    image_url VARCHAR(500),
    status ENUM('AVAILABLE', 'OUT_OF_STOCK', 'INACTIVE') DEFAULT 'AVAILABLE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_product_farmer FOREIGN KEY (farmer_id) REFERENCES farmers(id) ON DELETE CASCADE,
    CONSTRAINT fk_product_category FOREIGN KEY (category_id) REFERENCES categories(id),
    INDEX idx_product_category (category_id),
    INDEX idx_product_location (location),
    INDEX idx_product_status (status)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 6. ORDERS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    buyer_id BIGINT NOT NULL,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    total_amount DECIMAL(12, 2) NOT NULL,
    status ENUM('PENDING', 'CONFIRMED', 'DISPATCHED', 'DELIVERED', 'CANCELLED') DEFAULT 'PENDING',
    payment_mode ENUM('CASH_ON_DELIVERY', 'UPI', 'ONLINE') DEFAULT 'CASH_ON_DELIVERY',
    payment_status ENUM('PENDING', 'COMPLETED', 'FAILED') DEFAULT 'PENDING',
    delivery_address TEXT NOT NULL,
    delivery_city VARCHAR(100) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_order_buyer FOREIGN KEY (buyer_id) REFERENCES buyers(id) ON DELETE RESTRICT,
    INDEX idx_order_buyer (buyer_id),
    INDEX idx_order_status (status)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 7. ORDER ITEMS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    farmer_id BIGINT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL,
    CONSTRAINT fk_item_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_item_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    CONSTRAINT fk_item_farmer FOREIGN KEY (farmer_id) REFERENCES farmers(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 8. REFERENCE CROPS & AGRONOMY BENCHMARKS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crops (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(80) NOT NULL UNIQUE,
    name_mr VARCHAR(100) NOT NULL,
    variety VARCHAR(100),
    optimal_nitrogen DECIMAL(6, 2),
    optimal_phosphorus DECIMAL(6, 2),
    optimal_potassium DECIMAL(6, 2),
    optimal_ph_min DECIMAL(4, 2),
    optimal_ph_max DECIMAL(4, 2),
    optimal_temp_min DECIMAL(4, 2),
    optimal_temp_max DECIMAL(4, 2),
    growth_days INT,
    expected_yield_quintal_per_acre DECIMAL(6, 2)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 9. MANDI MARKET PRICES (APMC Live Rates)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS market_prices (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    crop_name VARCHAR(100) NOT NULL,
    market_name VARCHAR(120) NOT NULL,
    district VARCHAR(100) NOT NULL,
    state VARCHAR(100) DEFAULT 'Maharashtra',
    modal_price DECIMAL(10, 2) NOT NULL,
    min_price DECIMAL(10, 2) NOT NULL,
    max_price DECIMAL(10, 2) NOT NULL,
    arrivals_tonnes DECIMAL(10, 2) DEFAULT 0.00,
    price_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_market_crop_date (crop_name, price_date),
    INDEX idx_market_district (district)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 10. CROWDSOURCED REGIONAL FARMER PLANS (Overproduction Prevention)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS farmer_plans (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    farmer_id BIGINT NOT NULL,
    region VARCHAR(100) NOT NULL,
    planned_crop VARCHAR(100) NOT NULL,
    season ENUM('Kharif', 'Rabi', 'Zaid') NOT NULL,
    land_acres DECIMAL(6, 2) NOT NULL,
    year INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_plan_farmer FOREIGN KEY (farmer_id) REFERENCES farmers(id) ON DELETE CASCADE,
    INDEX idx_plan_region_crop (region, planned_crop, season, year)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 11. NOTIFICATIONS & ALERTS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NULL, -- NULL means broadcast to all users
    type ENUM('POWER', 'WEATHER', 'IRRIGATION', 'MARKET', 'ORDER', 'SYSTEM') NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    severity ENUM('LOW', 'MEDIUM', 'HIGH') DEFAULT 'MEDIUM',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notif_user_read (user_id, is_read)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 12. AI ANALYSIS AUDIT LOGS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_analysis (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    analysis_type ENUM('CROP_RECOMMENDATION', 'FERTILIZER_ADVICE', 'DISEASE_DETECTION', 'PRICE_FORECAST') NOT NULL,
    input_payload JSON NOT NULL,
    result_payload JSON NOT NULL,
    confidence_score DECIMAL(5, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ai_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_ai_user_type (user_id, analysis_type)
) ENGINE=InnoDB;
