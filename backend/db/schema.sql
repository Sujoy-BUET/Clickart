-- Schema for ClicKart

CREATE TABLE IF NOT EXISTS Users (
  user_id SERIAL PRIMARY KEY,
  user_name VARCHAR(100) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('CUSTOMER','SELLER'))
);

CREATE TABLE IF NOT EXISTS User_Email (
  user_id INT NOT NULL,
  email VARCHAR(100) NOT NULL,
  PRIMARY KEY (user_id, email),
  UNIQUE (email),
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS User_Phone (
  user_id INT NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  PRIMARY KEY (user_id, phone_number),
  UNIQUE (phone_number),
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS PostalArea (
  postal_code VARCHAR(20) PRIMARY KEY,
  area VARCHAR(100),
  district VARCHAR(100),
  division VARCHAR(100),
  country VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS User_Address (
  address_id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  house_no VARCHAR(50),
  road_no VARCHAR(50),
  postal_code VARCHAR(20) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (postal_code) REFERENCES PostalArea(postal_code)
);

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
  FOREIGN KEY (seller_id) REFERENCES Users(user_id),
  FOREIGN KEY (category_id) REFERENCES Category(category_id),
  FOREIGN KEY (brand_id) REFERENCES Brand(brand_id)
);

CREATE TABLE IF NOT EXISTS Cart (
  cart_id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Contains (
  cart_id INT,
  product_id INT,
  quantity INT NOT NULL,
  PRIMARY KEY (cart_id, product_id),
  FOREIGN KEY (cart_id) REFERENCES Cart(cart_id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES Product(product_id)
);

CREATE TABLE IF NOT EXISTS Delivery_Address (
  address_id SERIAL PRIMARY KEY,
  house_no VARCHAR(50),
  road_no VARCHAR(50),
  postal_code VARCHAR(20) NOT NULL,
  FOREIGN KEY (postal_code) REFERENCES PostalArea(postal_code)
);

CREATE TABLE IF NOT EXISTS Orders (
  order_id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  cart_id INT NOT NULL,
  delivery_address_id INT NOT NULL,
  order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  order_status VARCHAR(20) NOT NULL CHECK (order_status IN ('PENDING','CONFIRMED','SHIPPED','DELIVERED','CANCELLED')),
  total_amount NUMERIC(10,2) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES Users(user_id),
  FOREIGN KEY (cart_id) REFERENCES Cart(cart_id),
  FOREIGN KEY (delivery_address_id) REFERENCES Delivery_Address(address_id)
);

CREATE TABLE IF NOT EXISTS Payment (
  payment_id SERIAL PRIMARY KEY,
  order_id INT NOT NULL,
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('COD','CARD','MOBILE_BANKING')),
  payment_status VARCHAR(20) NOT NULL CHECK (payment_status IN ('PENDING','PAID','FAILED')),
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES Orders(order_id)
);

CREATE TABLE IF NOT EXISTS Review (
  review_id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  review_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, product_id),
  FOREIGN KEY (user_id) REFERENCES Users(user_id),
  FOREIGN KEY (product_id) REFERENCES Product(product_id)
);
