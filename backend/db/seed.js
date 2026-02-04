export async function seedData(sql) {
  try {
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
  } catch (error) {
    console.error("Error seeding data", error);
    throw error;
  }
}

export default seedData;
