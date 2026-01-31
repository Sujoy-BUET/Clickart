# ClicKart Postman Test Guide

**Base URL:** `http://localhost:3000`

---

## Sample Data - Insert into Database

Run these SQL INSERT statements first to populate test data:

### Users Table
```sql
INSERT INTO users (user_id, user_name, password, role) VALUES
(1, 'john_customer', 'pass123', 'CUSTOMER'),
(2, 'seller_alice', 'pass456', 'SELLER');
```

### Brand Table
```sql
INSERT INTO brand (brand_id, brand_name) VALUES
(1, 'Apple'),
(2, 'Samsung');
```

### Category Table
```sql
INSERT INTO category (category_id, category_name) VALUES
(1, 'Electronics'),
(2, 'Mobile Phones');
```

### PostalArea Table
```sql
INSERT INTO postalarea (postal_code, area, district, division, country) VALUES
('1000', 'Mirpur', 'Dhaka', 'Dhaka', 'Bangladesh'),
('2000', 'Gulshan', 'Dhaka', 'Dhaka', 'Bangladesh');
```

### User_Address Table
```sql
INSERT INTO user_address (address_id, user_id, house_no, road_no, postal_code) VALUES
(1, 1, '123', 'Road 5', '1000'),
(2, 2, '456', 'Road 10', '2000');
```

### Product Table
```sql
INSERT INTO product (product_id, product_name, description, price, stock_quantity, product_image, seller_id, category_id, brand_id) VALUES
(1, 'iPhone 14', 'Latest Apple smartphone', 999.99, 50, 'image1.jpg', 2, 2, 1),
(2, 'Samsung Galaxy S23', 'Premium Samsung phone', 799.99, 75, 'image2.jpg', 2, 2, 2);
```

### User_Email Table
```sql
INSERT INTO user_email (user_id, email) VALUES
(1, 'john@example.com'),
(2, 'alice@example.com');
```

### User_Phone Table
```sql
INSERT INTO user_phone (user_id, phone_number) VALUES
(1, '01712345678'),
(2, '01987654321');
```

### Cart Table
```sql
INSERT INTO cart (cart_id, user_id) VALUES
(1, 1),
(2, 1);
```

### Contains Table
```sql
INSERT INTO contains (cart_id, product_id, quantity) VALUES
(1, 1, 2),
(1, 2, 1);
```

### Delivery_Address Table
```sql
INSERT INTO delivery_address (address_id, house_no, road_no, postal_code) VALUES
(1, '789', 'Road 15', '1000'),
(2, '321', 'Road 20', '2000');
```

### Orders Table
```sql
INSERT INTO orders (order_id, user_id, cart_id, delivery_address_id, order_status, total_amount) VALUES
(1, 1, 1, 1, 'PENDING', 1799.97),
(2, 1, 2, 2, 'CONFIRMED', 799.99);
```

### Payment Table
```sql
INSERT INTO payment (payment_id, order_id, payment_method, payment_status) VALUES
(1, 1, 'CARD', 'PENDING'),
(2, 2, 'MOBILE_BANKING', 'PAID');
```

### Review Table
```sql
INSERT INTO review (review_id, user_id, product_id, rating, comment) VALUES
(1, 1, 1, 5, 'Excellent product, highly recommended!'),
(2, 1, 2, 4, 'Good quality, fast delivery');
```

---

## API Endpoints for Postman

### PRODUCTS API

**GET - Fetch all products**
```
GET http://localhost:3000/api/products
```

**GET - Fetch single product**
```
GET http://localhost:3000/api/products/1
```

**POST - Create product**
```
POST http://localhost:3000/api/products
Content-Type: application/json

{
  "product_id": 3,
  "product_name": "OnePlus 11",
  "description": "Flagship OnePlus smartphone",
  "price": 649.99,
  "stock_quantity": 30,
  "product_image": "image3.jpg",
  "seller_id": 2,
  "category_id": 2,
  "brand_id": 1
}
```

**PUT - Update product**
```
PUT http://localhost:3000/api/products/1
Content-Type: application/json

{
  "product_name": "iPhone 14 Pro",
  "price": 1099.99,
  "stock_quantity": 45
}
```

**DELETE - Delete product**
```
DELETE http://localhost:3000/api/products/1
```

---

### USERS API

**GET - Fetch all users**
```
GET http://localhost:3000/api/users
```

**GET - Fetch single user**
```
GET http://localhost:3000/api/users/1
```

**POST - Create user**
```
POST http://localhost:3000/api/users
Content-Type: application/json

{
  "user_id": 3,
  "user_name": "bob_customer",
  "password": "pass789",
  "role": "CUSTOMER"
}
```

**PUT - Update user**
```
PUT http://localhost:3000/api/users/1
Content-Type: application/json

{
  "user_name": "john_updated",
  "password": "newpass123"
}
```

**DELETE - Delete user**
```
DELETE http://localhost:3000/api/users/1
```

---

### CART API

**GET - Fetch all carts**
```
GET http://localhost:3000/api/cart
```

**GET - Fetch single cart with items**
```
GET http://localhost:3000/api/cart/1
```

**POST - Create cart**
```
POST http://localhost:3000/api/cart
Content-Type: application/json

{
  "cart_id": 3,
  "user_id": 1
}
```

**POST - Add product to cart**
```
POST http://localhost:3000/api/cart/add
Content-Type: application/json

{
  "cart_id": 1,
  "product_id": 2,
  "quantity": 2
}
```

**DELETE - Remove product from cart**
```
DELETE http://localhost:3000/api/cart/remove
Content-Type: application/json

{
  "cart_id": 1,
  "product_id": 1
}
```

**DELETE - Delete cart**
```
DELETE http://localhost:3000/api/cart/1
```

---

### ORDERS API

**GET - Fetch all orders**
```
GET http://localhost:3000/api/orders
```

**GET - Fetch single order**
```
GET http://localhost:3000/api/orders/1
```

**GET - Fetch orders by user ID**
```
GET http://localhost:3000/api/orders/user/1
```

**POST - Create order**
```
POST http://localhost:3000/api/orders
Content-Type: application/json

{
  "user_id": 1,
  "cart_id": 1,
  "delivery_address_id": 1,
  "total_amount": 1799.97
}
```

**PUT - Update order status**
```
PUT http://localhost:3000/api/orders/1/status
Content-Type: application/json

{
  "order_status": "SHIPPED"
}
```

**DELETE - Delete order**
```
DELETE http://localhost:3000/api/orders/1
```

---

### PAYMENTS API

**GET - Fetch all payments**
```
GET http://localhost:3000/api/payments
```

**GET - Fetch single payment**
```
GET http://localhost:3000/api/payments/1
```

**GET - Fetch payments by order ID**
```
GET http://localhost:3000/api/payments/order/1
```

**POST - Create payment**
```
POST http://localhost:3000/api/payments
Content-Type: application/json

{
  "order_id": 1,
  "payment_method": "CARD"
}
```

**PUT - Update payment status**
```
PUT http://localhost:3000/api/payments/1/status
Content-Type: application/json

{
  "payment_status": "PAID"
}
```

**DELETE - Delete payment**
```
DELETE http://localhost:3000/api/payments/1
```

---

### REVIEWS API

**GET - Fetch all reviews**
```
GET http://localhost:3000/api/reviews
```

**GET - Fetch single review**
```
GET http://localhost:3000/api/reviews/1
```

**GET - Fetch reviews by product ID**
```
GET http://localhost:3000/api/reviews/product/1
```

**GET - Fetch reviews by user ID**
```
GET http://localhost:3000/api/reviews/user/1
```

**POST - Create review**
```
POST http://localhost:3000/api/reviews
Content-Type: application/json

{
  "review_id": 3,
  "user_id": 1,
  "product_id": 1,
  "rating": 5,
  "comment": "Amazing product, very satisfied!"
}
```

**PUT - Update review**
```
PUT http://localhost:3000/api/reviews/1
Content-Type: application/json

{
  "rating": 4,
  "comment": "Good product, very satisfied!"
}
```

**DELETE - Delete review**
```
DELETE http://localhost:3000/api/reviews/1
```

---

## Testing Tips

1. **Insert Sample Data First**: Run all the SQL INSERT statements in your database before testing the APIs.

2. **Test Order**: 
   - Start with GET requests to fetch data
   - Create new items with POST requests
   - Update items with PUT requests
   - Delete items with DELETE requests

3. **Valid Status Values**:
   - Order Status: `PENDING`, `CONFIRMED`, `SHIPPED`, `DELIVERED`, `CANCELLED`
   - Payment Status: `PENDING`, `PAID`, `FAILED`
   - Payment Method: `COD`, `CARD`, `MOBILE_BANKING`
   - User Role: `CUSTOMER`, `SELLER`

4. **Common Headers**:
   ```
   Content-Type: application/json
   ```

5. **Error Handling**: Watch for error messages if validation fails or if referenced IDs don't exist.

---
