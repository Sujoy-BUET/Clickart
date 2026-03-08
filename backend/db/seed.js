/**
 * Seed the database with dummy data.
 */
export async function seedData(sql) {
  try {
    /* Users */
    const users = [
      { id: 1, name: "john_doe",    pw: "password123" },
      { id: 2, name: "jane_smith",  pw: "password456" },
      { id: 3, name: "mike_chen",   pw: "password789" },
    ];
    for (const u of users) {
      await sql`
        INSERT INTO Users (user_id, user_name, password)
        VALUES (${u.id}, ${u.name}, ${u.pw})
        ON CONFLICT DO NOTHING
      `;
    }

    /* User Emails */
    const userEmails = [
      { uid: 1, email: "john.doe@email.com" },
      { uid: 1, email: "john.doe.personal@gmail.com" },
      { uid: 2, email: "jane.smith@email.com" },
      { uid: 3, email: "mike.chen@email.com" },
    ];
    for (const e of userEmails) {
      await sql`
        INSERT INTO User_Email (user_id, email)
        VALUES (${e.uid}, ${e.email})
        ON CONFLICT DO NOTHING
      `;
    }

    /* ---------- User Phones ---------- */
    const userPhones = [
      { uid: 1, phone: "01711111001" },
      { uid: 2, phone: "01711111002" }, 
      { uid: 3, phone: "01711111003" },
    ];
    for (const p of userPhones) {
      await sql`
        INSERT INTO User_Phone (user_id, phone_number)
        VALUES (${p.uid}, ${p.phone})
        ON CONFLICT DO NOTHING
      `;
    }

    /* ---------- Sellers ---------- */
    const sellers = [
      { id: 1, name: "Alice Rahman",  pw: "hashed_pw_alice",  store: "Alice Electronics",  desc: "Best gadgets in town",        since: "2023-06-15", verified: true  },
      { id: 2, name: "Bob Hossain",   pw: "hashed_pw_bob",    store: "Bob Fashion House",  desc: "Trendy clothing & accessories", since: "2024-01-10", verified: false },
    ];
    for (const s of sellers) {
      await sql`
        INSERT INTO Sellers (seller_id, seller_name, seller_password, store_name, store_description, seller_since, is_verified)
        VALUES (${s.id}, ${s.name}, ${s.pw}, ${s.store}, ${s.desc}, ${s.since}, ${s.verified})
        ON CONFLICT DO NOTHING
      `;
    }

    /* ---------- Seller Emails ---------- */
    const sellerEmails = [
      { sid: 1, email: "alice@electronics.com" },
      { sid: 1, email: "alice.rahman@gmail.com" },
      { sid: 2, email: "bob@fashionhouse.com" },
    ];
    for (const e of sellerEmails) {
      await sql`
        INSERT INTO Seller_Email (seller_id, email)
        VALUES (${e.sid}, ${e.email})
        ON CONFLICT DO NOTHING
      `;
    }

    /* ---------- Seller Phones ---------- */
    const sellerPhones = [
      { sid: 1, phone: "01711000001" },
      { sid: 2, phone: "01811000002" },
    ];
    for (const p of sellerPhones) {
      await sql`
        INSERT INTO Seller_Phone (seller_id, phone_number)
        VALUES (${p.sid}, ${p.phone})
        ON CONFLICT DO NOTHING
      `;
    }

    /* ---------- Addresses ---------- */
    const addresses = [
      { id: 1, house: "12/A",  road: "Road 5",  postal: "1216", area: "Mirpur",   district: "Dhaka",      division: "Dhaka",       country: "Bangladesh" },
      { id: 2, house: "45",    road: "Road 11", postal: "1212", area: "Gulshan",  district: "Dhaka",      division: "Dhaka",       country: "Bangladesh" },
      { id: 3, house: "78/B",  road: "Road 3",  postal: "4000", area: "Kotwali",  district: "Chittagong", division: "Chittagong",  country: "Bangladesh" },
      { id: 4, house: "99",    road: "Road 8",  postal: "1216", area: "Mirpur",   district: "Dhaka",      division: "Dhaka",       country: "Bangladesh" },
    ];
    for (const a of addresses) {
      await sql`
        INSERT INTO Address (address_id, house_no, road_no, postal_code, area, district, division, country)
        VALUES (${a.id}, ${a.house}, ${a.road}, ${a.postal}, ${a.area}, ${a.district}, ${a.division}, ${a.country})
        ON CONFLICT DO NOTHING
      `;
    }

    /* ---------- User ↔ Address ---------- */
    const userAddresses = [
      { uid: 1, aid: 1 },
      { uid: 2, aid: 2 },
      { uid: 3, aid: 3 },
    ];
    for (const ua of userAddresses) {
      await sql`
        INSERT INTO User_Address (user_id, address_id)
        VALUES (${ua.uid}, ${ua.aid})
        ON CONFLICT DO NOTHING
      `;
    }

    /* ---------- Seller ↔ Address ---------- */
    const sellerAddresses = [
      { sid: 1, aid: 4 },
      { sid: 2, aid: 2 },
    ];
    for (const sa of sellerAddresses) {
      await sql`
        INSERT INTO Seller_Address (seller_id, address_id)
        VALUES (${sa.sid}, ${sa.aid})
        ON CONFLICT DO NOTHING
      `;
    }

    /* ---------- Brands ---------- */
    const brands = [
      { id: 1, name: "Apple" },
      { id: 2, name: "Samsung" },
      { id: 3, name: "Nike" },
      { id: 4, name: "Sony" },
    ];
    for (const b of brands) {
      await sql`
        INSERT INTO Brand (brand_id, brand_name)
        VALUES (${b.id}, ${b.name})
        ON CONFLICT DO NOTHING
      `;
    }

    /* ---------- Categories ---------- */
    const categories = [
      { id: 1, name: "Electronics" },
      { id: 2, name: "Mobile Phones" },
      { id: 3, name: "Clothing" },
      { id: 4, name: "Footwear" },
    ];
    for (const c of categories) {
      await sql`
        INSERT INTO Category (category_id, category_name)
        VALUES (${c.id}, ${c.name})
        ON CONFLICT DO NOTHING
      `;
    }

    /* ---------- Products ---------- */
    const products = [
      { id: 1, name: "iPhone 15 Pro",        desc: "Latest Apple flagship with titanium design",      price: 1199.99, qty: 40,  img: "iphone15pro.jpg",   sid: 1, cid: 2, bid: 1 },
      { id: 2, name: "Samsung Galaxy S24",    desc: "AI-powered Samsung smartphone",                   price: 899.99,  qty: 60,  img: "galaxys24.jpg",     sid: 1, cid: 2, bid: 2 },
      { id: 3, name: "Nike Air Max 270",      desc: "Comfortable lifestyle sneakers",                  price: 149.99,  qty: 120, img: "airmax270.jpg",     sid: 2, cid: 4, bid: 3 },
      { id: 4, name: "Sony WH-1000XM5",      desc: "Industry-leading noise-cancelling headphones",    price: 349.99,  qty: 80,  img: "sonyxm5.jpg",       sid: 1, cid: 1, bid: 4 },
    ];
    for (const p of products) {
      await sql`
        INSERT INTO Product (product_id, product_name, description, price, stock_quantity, product_image, seller_id, category_id, brand_id)
        VALUES (${p.id}, ${p.name}, ${p.desc}, ${p.price}, ${p.qty}, ${p.img}, ${p.sid}, ${p.cid}, ${p.bid})
        ON CONFLICT DO NOTHING
      `;
    }

    /* ---------- Variations (VariationType already seeded in schema.sql) ---------- */
    const variations = [
      { id: 1,  typeId: 1, value: "Black" },
      { id: 2,  typeId: 1, value: "White" },
      { id: 3,  typeId: 1, value: "Blue" },
      { id: 4,  typeId: 2, value: "128GB" },
      { id: 5,  typeId: 2, value: "256GB" },
      { id: 6,  typeId: 3, value: "8GB/128GB" },
      { id: 7,  typeId: 3, value: "12GB/256GB" },
      { id: 8,  typeId: 2, value: "42" },
      { id: 9,  typeId: 2, value: "43" },
    ];
    for (const v of variations) {
      await sql`
        INSERT INTO Variation (variation_id, variation_type_id, variation_value)
        VALUES (${v.id}, ${v.typeId}, ${v.value})
        ON CONFLICT DO NOTHING
      `;
    }

    /* ---------- Product Variations ---------- */
    const productVariations = [
      { id: 1,  pid: 1, vid: 1, price: 1199.99, qty: 20 },   // iPhone Black
      { id: 2,  pid: 1, vid: 2, price: 1199.99, qty: 20 },   // iPhone White
      { id: 3,  pid: 1, vid: 4, price: 1199.99, qty: 25 },   // iPhone 128GB
      { id: 4,  pid: 1, vid: 5, price: 1349.99, qty: 15 },   // iPhone 256GB
      { id: 5,  pid: 2, vid: 1, price: 899.99,  qty: 30 },   // Galaxy Black
      { id: 6,  pid: 2, vid: 3, price: 899.99,  qty: 30 },   // Galaxy Blue
      { id: 7,  pid: 2, vid: 6, price: 899.99,  qty: 35 },   // Galaxy 8/128
      { id: 8,  pid: 2, vid: 7, price: 999.99,  qty: 25 },   // Galaxy 12/256
      { id: 9,  pid: 3, vid: 8, price: 149.99,  qty: 60 },   // Nike size 42
      { id: 10, pid: 3, vid: 9, price: 149.99,  qty: 60 },   // Nike size 43
      { id: 11, pid: 4, vid: 1, price: 349.99,  qty: 40 },   // Sony Black
      { id: 12, pid: 4, vid: 2, price: 349.99,  qty: 40 },   // Sony White
    ];
    for (const pv of productVariations) {
      await sql`
        INSERT INTO Product_Variation (product_variation_id, product_id, variation_id, price, stock_quantity)
        VALUES (${pv.id}, ${pv.pid}, ${pv.vid}, ${pv.price}, ${pv.qty})
        ON CONFLICT DO NOTHING
      `;
    }

    /* ---------- Carts ---------- */
    const carts = [
      { id: 1, uid: 1 },
      { id: 2, uid: 2 },
      { id: 3, uid: 3 },
    ];
    for (const c of carts) {
      await sql`
        INSERT INTO Cart (cart_id, user_id)
        VALUES (${c.id}, ${c.uid})
        ON CONFLICT DO NOTHING
      `;
    }

    /* ---------- Contains (cart items) ---------- */
    const cartItems = [
      { cartId: 1, pvId: 1,  qty: 1 },   // john: iPhone Black
      { cartId: 1, pvId: 11, qty: 1 },   // john: Sony Black
      { cartId: 2, pvId: 5,  qty: 2 },   // jane: Galaxy Black x2
      { cartId: 3, pvId: 9,  qty: 1 },   // mike: Nike 42
    ];
    for (const ci of cartItems) {
      await sql`
        INSERT INTO Contains (cart_id, product_variation_id, quantity)
        VALUES (${ci.cartId}, ${ci.pvId}, ${ci.qty})
        ON CONFLICT DO NOTHING
      `;
    }

    /* ---------- Coupons ---------- */
    const coupons = [
      { id: 1, code: "WELCOME10",  desc: "10% off for new users",  type: "PERCENT", val: 10.00, maxDisc: 200.00,  minOrder: 500.00,  start: "2025-01-01", end: "2026-12-31", active: true },
      { id: 2, code: "FLAT50",     desc: "Flat 50 BDT off",        type: "FIXED",   val: 50.00, maxDisc: null,    minOrder: 300.00,  start: "2025-06-01", end: "2026-06-30", active: true },
    ];
    for (const cp of coupons) {
      await sql`
        INSERT INTO Coupon (coupon_id, code, description, discount_type, discount_value, max_discount_amount, min_order_amount, start_date, end_date, is_active)
        VALUES (${cp.id}, ${cp.code}, ${cp.desc}, ${cp.type}, ${cp.val}, ${cp.maxDisc}, ${cp.minOrder}, ${cp.start}, ${cp.end}, ${cp.active})
        ON CONFLICT DO NOTHING
      `;
    }

    /* ---------- Orders ---------- */
    const orders = [
      { id: 1, uid: 1, cartId: 1, couponId: 1,    status: "CONFIRMED", total: 1399.98 },
      { id: 2, uid: 2, cartId: 2, couponId: null,  status: "PENDING",   total: 1799.98 },
      { id: 3, uid: 3, cartId: 3, couponId: 2,     status: "SHIPPED",   total: 99.99   },
    ];
    for (const o of orders) {
      await sql`
        INSERT INTO Orders (order_id, user_id, cart_id, coupon_id, order_status, total_amount)
        VALUES (${o.id}, ${o.uid}, ${o.cartId}, ${o.couponId}, ${o.status}, ${o.total})
        ON CONFLICT DO NOTHING
      `;
    }

    /* ---------- Delivery Addresses ---------- */
    const deliveryAddrs = [
      { orderId: 1, addrId: 1 },
      { orderId: 2, addrId: 2 },
      { orderId: 3, addrId: 3 },
    ];
    for (const da of deliveryAddrs) {
      await sql`
        INSERT INTO Delivery_Address (order_id, address_id)
        VALUES (${da.orderId}, ${da.addrId})
        ON CONFLICT DO NOTHING
      `;
    }

    /* ---------- Payments ---------- */
    const payments = [
      { id: 1, orderId: 1, method: "CARD",           status: "PAID"    },
      { id: 2, orderId: 2, method: "MOBILE_BANKING",  status: "PENDING" },
      { id: 3, orderId: 3, method: "COD",             status: "PENDING" },
    ];
    for (const pm of payments) {
      await sql`
        INSERT INTO Payment (payment_id, order_id, payment_method, payment_status)
        VALUES (${pm.id}, ${pm.orderId}, ${pm.method}, ${pm.status})
        ON CONFLICT DO NOTHING
      `;
    }

    /* ---------- Reviews ---------- */
    const reviews = [
      { id: 1, uid: 1, rating: 5, comment: "Absolutely love the iPhone 15 Pro, best phone ever!" },
      { id: 2, uid: 2, rating: 4, comment: "Galaxy S24 is great, AI features are impressive." },
      { id: 3, uid: 3, rating: 5, comment: "Nike Air Max 270 super comfortable for daily wear." },
      { id: 4, uid: 1, rating: 4, comment: "Alice Electronics has excellent customer service." },
    ];
    for (const r of reviews) {
      await sql`
        INSERT INTO Review (review_id, reviewer_user_id, rating, comment)
        VALUES (${r.id}, ${r.uid}, ${r.rating}, ${r.comment})
        ON CONFLICT DO NOTHING
      `;
    }

    /* ---------- Review ↔ Product ---------- */
    const reviewProducts = [
      { rid: 1, pid: 1 },
      { rid: 2, pid: 2 },
      { rid: 3, pid: 3 },
    ];
    for (const rp of reviewProducts) {
      await sql`
        INSERT INTO Review_Product (review_id, product_id)
        VALUES (${rp.rid}, ${rp.pid})
        ON CONFLICT DO NOTHING
      `;
    }

    /* ---------- Review ↔ Seller ---------- */
    const reviewSellers = [
      { rid: 4, sid: 1 },
    ];
    for (const rs of reviewSellers) {
      await sql`
        INSERT INTO Review_Seller (review_id, seller_id)
        VALUES (${rs.rid}, ${rs.sid})
        ON CONFLICT DO NOTHING
      `;
    }

    console.log("Seed data inserted successfully");

    /* ---------- Reset SERIAL sequences so new inserts don't collide ---------- */
    const sequences = [
      { table: 'users',             col: 'user_id' },
      { table: 'sellers',           col: 'seller_id' },
      { table: 'address',           col: 'address_id' },
      { table: 'brand',             col: 'brand_id' },
      { table: 'category',          col: 'category_id' },
      { table: 'product',           col: 'product_id' },
      { table: 'variationtype',     col: 'variation_type_id' },
      { table: 'variation',         col: 'variation_id' },
      { table: 'product_variation', col: 'product_variation_id' },
      { table: 'cart',              col: 'cart_id' },
      { table: 'coupon',            col: 'coupon_id' },
      { table: 'orders',            col: 'order_id' },
      { table: 'payment',           col: 'payment_id' },
      { table: 'review',            col: 'review_id' },
    ];
    for (const { table, col } of sequences) {
      await sql.query(
        `SELECT setval(pg_get_serial_sequence('${table}', '${col}'), COALESCE((SELECT MAX(${col}) FROM ${table}), 0) + 1, false)`
      );
    }
    console.log("Serial sequences reset successfully");
  } catch (error) {
    console.error("Error seeding data", error);
    throw error;
  }
}

export default seedData;
