import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import dotenv from "dotenv";

import productRoutes from "./routes/productRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import { sql } from "./config/db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT||3001;

app.use(express.json());
app.use(cors());
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
); // helmet is a security middleware that helps you protect your app by setting various HTTP headers

app.use(morgan("dev")); // log the requests


// apply arcjet rate-limit to all routes
// app.use(async (req, res, next) => {
//   try {
//     const decision = await aj.protect(req, {
//       requested: 1, // specifies that each request consumes 1 token
//     });

//     if (decision.isDenied()) {
//       if (decision.reason.isRateLimit()) {
//         res.status(429).json({ error: "Too Many Requests" });
//       } else if (decision.reason.isBot()) {
//         res.status(403).json({ error: "Bot access denied" });
//       } else {
//         res.status(403).json({ error: "Forbidden" });
//       }
//       return;
//     }

//     // check for spoofed bots
//     if (decision.results.some((result) => result.reason.isBot() && result.reason.isSpoofed())) {
//       res.status(403).json({ error: "Spoofed bot detected" });
//       return;
//     }

//     next();
//   } catch (error) {
//     console.log("Arcjet error", error);
//     next(error);
//   }
// });
 
app.use("/api/products", productRoutes);
app.use("/api/users", userRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/reviews", reviewRoutes);
 
async function initDB() {
  // table creation
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS Users (
        user_id SERIAL PRIMARY KEY,
        user_name VARCHAR(100) NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('CUSTOMER','SELLER'))
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS User_Email (
        user_id INT NOT NULL,
        email VARCHAR(100) NOT NULL,
        PRIMARY KEY (user_id, email),
        UNIQUE (email),
        FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS User_Phone (
        user_id INT NOT NULL,
        phone_number VARCHAR(20) NOT NULL,
        PRIMARY KEY (user_id, phone_number),
        UNIQUE (phone_number),
        FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS PostalArea (
        postal_code VARCHAR(20) PRIMARY KEY,
        area VARCHAR(100),
        district VARCHAR(100),
        division VARCHAR(100),
        country VARCHAR(50)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS User_Address (
        address_id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        house_no VARCHAR(50),
        road_no VARCHAR(50),
        postal_code VARCHAR(20) NOT NULL,
        FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (postal_code) REFERENCES PostalArea(postal_code)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS Brand (
        brand_id SERIAL PRIMARY KEY,
        brand_name VARCHAR(100) UNIQUE NOT NULL
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS Category (
        category_id SERIAL PRIMARY KEY,
        category_name VARCHAR(100) UNIQUE NOT NULL
      )
    `;

    await sql`
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
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS Cart (
        cart_id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS Contains (
        cart_id INT,
        product_id INT,
        quantity INT NOT NULL,
        PRIMARY KEY (cart_id, product_id),
        FOREIGN KEY (cart_id) REFERENCES Cart(cart_id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES Product(product_id)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS Delivery_Address (
        address_id SERIAL PRIMARY KEY,
        house_no VARCHAR(50),
        road_no VARCHAR(50),
        postal_code VARCHAR(20) NOT NULL,
        FOREIGN KEY (postal_code) REFERENCES PostalArea(postal_code)
      )
    `;

    await sql`
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
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS Payment (
        payment_id SERIAL PRIMARY KEY,
        order_id INT NOT NULL,
        payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('COD','CARD','MOBILE_BANKING')),
        payment_status VARCHAR(20) NOT NULL CHECK (payment_status IN ('PENDING','PAID','FAILED')),
        payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES Orders(order_id)
      )
    `;

    await sql`
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
      )
    `;
  }catch (error) {
    console.log("Error creating tables\n", error);
  }

  try {
    
    console.log("Database connected successfully");

    
    await sql`
      INSERT INTO users (user_id, user_name, password, role) VALUES
      (1, 'john_customer', 'pass123', 'CUSTOMER'),
      (2, 'seller_alice', 'pass456', 'SELLER')
      ON CONFLICT DO NOTHING;
    `;

    await sql`
      INSERT INTO brand (brand_id, brand_name) VALUES
      (1, 'Apple'),
      (2, 'Samsung')
      ON CONFLICT DO NOTHING;
    `;

    await sql`
      INSERT INTO category (category_id, category_name) VALUES
      (1, 'Electronics'),
      (2, 'Mobile Phones')
      ON CONFLICT DO NOTHING;
    `;

    await sql`
      INSERT INTO postalarea (postal_code, area, district, division, country) VALUES
      ('1000', 'Mirpur', 'Dhaka', 'Dhaka', 'Bangladesh'),
      ('2000', 'Gulshan', 'Dhaka', 'Dhaka', 'Bangladesh')
      ON CONFLICT DO NOTHING;
    `;

    await sql`
      INSERT INTO user_address (address_id, user_id, house_no, road_no, postal_code) VALUES
      (1, 1, '123', 'Road 5', '1000'),
      (2, 2, '456', 'Road 10', '2000')
      ON CONFLICT DO NOTHING;
    `;

    await sql`
      INSERT INTO product (product_id, product_name, description, price, stock_quantity, product_image, seller_id, category_id, brand_id) VALUES
      (1, 'iPhone 14', 'Latest Apple smartphone', 999.99, 50, 'image1.jpg', 2, 2, 1),
      (2, 'Samsung Galaxy S23', 'Premium Samsung phone', 799.99, 75, 'image2.jpg', 2, 2, 2)
      ON CONFLICT DO NOTHING;
    `;

    await sql`
      INSERT INTO user_email (user_id, email) VALUES
      (1, 'john@example.com'),
      (2, 'alice@example.com')
      ON CONFLICT DO NOTHING;
    `;

    await sql`
      INSERT INTO user_phone (user_id, phone_number) VALUES
      (1, '01712345678'),
      (2, '01987654321')
      ON CONFLICT DO NOTHING;
    `;

    await sql`
      INSERT INTO cart (cart_id, user_id) VALUES
      (1, 1),
      (2, 1)
      ON CONFLICT DO NOTHING;
    `;

    await sql`
      INSERT INTO contains (cart_id, product_id, quantity) VALUES
      (1, 1, 2),
      (1, 2, 1)
      ON CONFLICT DO NOTHING;
    `;

    await sql`
      INSERT INTO delivery_address (address_id, house_no, road_no, postal_code) VALUES
      (1, '789', 'Road 15', '1000'),
      (2, '321', 'Road 20', '2000')
      ON CONFLICT DO NOTHING;
    `;

    await sql`
      INSERT INTO orders (order_id, user_id, cart_id, delivery_address_id, order_status, total_amount) VALUES
      (1, 1, 1, 1, 'PENDING', 1799.97),
      (2, 1, 2, 2, 'CONFIRMED', 799.99)
      ON CONFLICT DO NOTHING;
    `;

    await sql`
      INSERT INTO payment (payment_id, order_id, payment_method, payment_status) VALUES
      (1, 1, 'CARD', 'PENDING'),
      (2, 2, 'MOBILE_BANKING', 'PAID')
      ON CONFLICT DO NOTHING;
    `;

    await sql`
      INSERT INTO review (review_id, user_id, product_id, rating, comment) VALUES
      (1, 1, 1, 5, 'Excellent product, highly recommended!'),
      (2, 1, 2, 4, 'Good quality, fast delivery')
      ON CONFLICT DO NOTHING;
    `;


    const users = await sql`SELECT * FROM users`;
    console.log("Users retrieved:", users);
    
  } catch (error) {
    console.log("Error initDB\n", error);
  }
}

initDB().then(() => {
  app.listen(PORT, () => {
    console.log("Server is running on port " + PORT);
  });
});