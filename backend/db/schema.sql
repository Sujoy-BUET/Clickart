-- Schema for ClicKart

-- Drop old tables in reverse-dependency order so the schema is always fresh
DROP TABLE IF EXISTS Review_Seller     CASCADE;
DROP TABLE IF EXISTS Review_Product    CASCADE;
DROP TABLE IF EXISTS Review            CASCADE;
DROP TABLE IF EXISTS Payment           CASCADE;
DROP TABLE IF EXISTS Delivery_Address  CASCADE;
DROP TABLE IF EXISTS Orders            CASCADE;
DROP TABLE IF EXISTS Coupon            CASCADE;
DROP TABLE IF EXISTS Contains          CASCADE;
DROP TABLE IF EXISTS Cart              CASCADE;
DROP TABLE IF EXISTS Product_Variation CASCADE;
DROP TABLE IF EXISTS Variation         CASCADE;
DROP TABLE IF EXISTS VariationType     CASCADE;
DROP TABLE IF EXISTS Product           CASCADE;
DROP TABLE IF EXISTS Category          CASCADE;
DROP TABLE IF EXISTS Brand             CASCADE;
DROP TABLE IF EXISTS Seller_Address    CASCADE;
DROP TABLE IF EXISTS User_Address      CASCADE;
DROP TABLE IF EXISTS Address           CASCADE;
DROP TABLE IF EXISTS PostalArea        CASCADE;
DROP TABLE IF EXISTS Seller_Phone      CASCADE;
DROP TABLE IF EXISTS Seller_Email      CASCADE;
DROP TABLE IF EXISTS Sellers           CASCADE;
DROP TABLE IF EXISTS User_Email        CASCADE;
DROP TABLE IF EXISTS User_Phone        CASCADE;
DROP TABLE IF EXISTS Users             CASCADE;

-- ===================== USERS & SELLERS =====================

CREATE TABLE IF NOT EXISTS Users (
    user_id SERIAL PRIMARY KEY,
    user_name VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS User_Email (
    user_id INT NOT NULL,
    email VARCHAR(100) NOT NULL,
    PRIMARY KEY (user_id, email),
    UNIQUE (email),
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

CREATE TABLE IF NOT EXISTS User_Phone (
    user_id INT NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    PRIMARY KEY (user_id, phone_number),
    UNIQUE (phone_number),
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

CREATE TABLE IF NOT EXISTS Sellers (
    seller_id SERIAL PRIMARY KEY,
    seller_name VARCHAR(100) NOT NULL,
    seller_password VARCHAR(255) NOT NULL,
    store_name VARCHAR(150) NOT NULL,
    store_description TEXT,
    seller_since DATE DEFAULT CURRENT_DATE,
    is_verified BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS Seller_Email (
    seller_id INT NOT NULL,
    email VARCHAR(100) NOT NULL,
    PRIMARY KEY (seller_id, email),
    UNIQUE (email),
    FOREIGN KEY (seller_id) REFERENCES Sellers(seller_id)
);

CREATE TABLE IF NOT EXISTS Seller_Phone (
    seller_id INT NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    PRIMARY KEY (seller_id, phone_number),
    UNIQUE (phone_number),
    FOREIGN KEY (seller_id) REFERENCES Sellers(seller_id)
);

-- ===================== GEOGRAPHY & ADDRESSES =====================

CREATE TABLE IF NOT EXISTS Address (
    address_id SERIAL PRIMARY KEY,
    house_no VARCHAR(50),
    road_no VARCHAR(50),
    postal_code VARCHAR(20) NOT NULL,
    area VARCHAR(100),
    district VARCHAR(100),
    division VARCHAR(100),
    country VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS User_Address (
    user_id INT NOT NULL,
    address_id INT NOT NULL,
    PRIMARY KEY (user_id, address_id),
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (address_id) REFERENCES Address(address_id)
);

CREATE TABLE IF NOT EXISTS Seller_Address (
    seller_id INT NOT NULL,
    address_id INT NOT NULL,
    PRIMARY KEY (seller_id, address_id),
    FOREIGN KEY (seller_id) REFERENCES Sellers(seller_id),
    FOREIGN KEY (address_id) REFERENCES Address(address_id)
);

-- ===================== CATALOG =====================

CREATE TABLE IF NOT EXISTS Brand (
    brand_id SERIAL PRIMARY KEY,
    brand_name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS Category (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS Product (
    product_id SERIAL PRIMARY KEY,
    product_name VARCHAR(150) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    stock_quantity INT NOT NULL,
    product_image VARCHAR(255),
    seller_id INT NOT NULL,
    category_id INT NOT NULL,
    brand_id INT NOT NULL,
    FOREIGN KEY (seller_id) REFERENCES Sellers(seller_id),
    FOREIGN KEY (category_id) REFERENCES Category(category_id),
    FOREIGN KEY (brand_id) REFERENCES Brand(brand_id)
);

-- ===================== VARIATIONS =====================

CREATE TABLE IF NOT EXISTS VariationType (
    variation_type_id SERIAL PRIMARY KEY,
    variation_type_name VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO VariationType (variation_type_name) VALUES
('Color'),
('Size'),
('RAM/ROM'),
('Material'),
('Processor'),
('Storage Type')
ON CONFLICT (variation_type_name) DO NOTHING;

CREATE TABLE IF NOT EXISTS Variation (
    variation_id SERIAL PRIMARY KEY,
    variation_type_id INT NOT NULL,
    variation_value VARCHAR(50) NOT NULL,
    FOREIGN KEY (variation_type_id) REFERENCES VariationType(variation_type_id),
    UNIQUE (variation_type_id, variation_value)
);

CREATE TABLE IF NOT EXISTS Product_Variation (
    product_variation_id SERIAL PRIMARY KEY,
    product_id INT NOT NULL,
    variation_id INT NOT NULL,
    price DECIMAL(10,2),
    stock_quantity INT,
    FOREIGN KEY (product_id) REFERENCES Product(product_id),
    FOREIGN KEY (variation_id) REFERENCES Variation(variation_id),
    UNIQUE (product_id, variation_id)
);

-- ===================== CART =====================

CREATE TABLE IF NOT EXISTS Cart (
    cart_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

CREATE TABLE IF NOT EXISTS Contains (
    cart_id INT NOT NULL,
    product_variation_id INT NOT NULL,
    quantity INT NOT NULL,
    PRIMARY KEY (cart_id, product_variation_id),
    FOREIGN KEY (cart_id) REFERENCES Cart(cart_id),
    FOREIGN KEY (product_variation_id) REFERENCES Product_Variation(product_variation_id)
);

-- ===================== COUPONS =====================

CREATE TABLE IF NOT EXISTS Coupon (
    coupon_id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_type VARCHAR(10) NOT NULL CHECK (discount_type IN ('PERCENT','FIXED')),
    discount_value DECIMAL(10,2) NOT NULL,
    max_discount_amount DECIMAL(10,2),
    min_order_amount DECIMAL(10,2),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- ===================== ORDERS & DELIVERY =====================

CREATE TABLE IF NOT EXISTS Orders (
    order_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    cart_id INT NOT NULL,
    coupon_id INT,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    order_status VARCHAR(20) NOT NULL
        CHECK (order_status IN ('PENDING','CONFIRMED','SHIPPED','DELIVERED','CANCELLED')),
    total_amount NUMERIC(10,2) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (cart_id) REFERENCES Cart(cart_id),
    FOREIGN KEY (coupon_id) REFERENCES Coupon(coupon_id)
);

CREATE TABLE IF NOT EXISTS Delivery_Address (
    order_id INT PRIMARY KEY,
    address_id INT NOT NULL,
    FOREIGN KEY (order_id) REFERENCES Orders(order_id),
    FOREIGN KEY (address_id) REFERENCES Address(address_id),
    UNIQUE (order_id, address_id)
);

-- ===================== PAYMENT =====================

CREATE TABLE IF NOT EXISTS Payment (
    payment_id SERIAL PRIMARY KEY,
    order_id INT NOT NULL,
    payment_method VARCHAR(20) NOT NULL
        CHECK (payment_method IN ('COD','CARD','MOBILE_BANKING')),
    payment_status VARCHAR(20) NOT NULL
        CHECK (payment_status IN ('PENDING','PAID','FAILED')),
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES Orders(order_id)
);

-- ===================== REVIEWS =====================

CREATE TABLE IF NOT EXISTS Review (
    review_id SERIAL PRIMARY KEY,
    reviewer_user_id INT NOT NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    review_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reviewer_user_id) REFERENCES Users(user_id)
);

CREATE TABLE IF NOT EXISTS Review_Product (
    review_id INT NOT NULL,
    product_id INT NOT NULL,
    PRIMARY KEY (review_id, product_id),
    FOREIGN KEY (review_id) REFERENCES Review(review_id),
    FOREIGN KEY (product_id) REFERENCES Product(product_id)
);

CREATE TABLE IF NOT EXISTS Review_Seller (
    review_id INT NOT NULL,
    seller_id INT NOT NULL,
    PRIMARY KEY (review_id, seller_id),
    FOREIGN KEY (review_id) REFERENCES Review(review_id),
    FOREIGN KEY (seller_id) REFERENCES Sellers(seller_id)
);
