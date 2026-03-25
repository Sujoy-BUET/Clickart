import { sql } from "../config/db.js";

// Get all orders
export const getOrders = async (req, res) => {
  try {
    const orders = await sql`
      SELECT o.*, da.address_id AS delivery_address_id
      FROM Orders o
      LEFT JOIN Delivery_Address da ON o.order_id = da.order_id
      ORDER BY o.order_id DESC
    `;
    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.error("Error in getOrders:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Get order by ID (with delivery address details)
export const getOrder = async (req, res) => {
  const { id } = req.params;

  try {
    const order = await sql`
      SELECT o.*,
             a.address_id, a.house_no, a.road_no, a.postal_code,
             a.area, a.district, a.division, a.country,
             cp.code AS coupon_code, cp.discount_type, cp.discount_value
      FROM Orders o
      LEFT JOIN Delivery_Address da ON o.order_id  = da.order_id
      LEFT JOIN Address a           ON da.address_id = a.address_id
      LEFT JOIN Coupon cp           ON o.coupon_id   = cp.coupon_id
      WHERE o.order_id = ${id}
    `;

    if (order.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.status(200).json({ success: true, data: order[0] });
  } catch (error) {
    console.error("Error in getOrder:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Get orders by user ID
export const getUserOrders = async (req, res) => {
  const { userId } = req.params;

  try {
    const orders = await sql`
      SELECT o.*, o.order_status AS status,
             da.address_id AS delivery_address_id,
             a.area AS city,
             cp.code AS coupon_code
      FROM Orders o
      LEFT JOIN Delivery_Address da ON o.order_id = da.order_id
      LEFT JOIN Address a ON da.address_id = a.address_id
      LEFT JOIN Coupon cp ON o.coupon_id = cp.coupon_id
      WHERE o.user_id = ${userId}
      ORDER BY o.order_id DESC
    `;

    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.error("Error in getUserOrders:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Create new order (with delivery address)
export const createOrder = async (req, res) => {
  const {
    user_id,
    cart_id,
    coupon_id,
    coupon_code,
    address_id,
    use_default_address,
    new_address,
  } = req.body;

  if (!user_id || !cart_id) {
    return res.status(400).json({ success: false, message: "user_id and cart_id are required" });
  }

  try {
    const cart = await sql`
      SELECT cart_id, user_id
      FROM Cart
      WHERE cart_id = ${cart_id}
      LIMIT 1
    `;

    if (cart.length === 0) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }

    if (Number(cart[0].user_id) !== Number(user_id)) {
      return res.status(400).json({ success: false, message: "Cart does not belong to this user" });
    }

    const cartItems = await sql`
      SELECT ct.product_variation_id, ct.quantity,
             COALESCE(pv.price, p.price) AS item_price,
             pv.stock_quantity
      FROM Contains ct
      JOIN Product_Variation pv ON ct.product_variation_id = pv.product_variation_id
      JOIN Product p ON pv.product_id = p.product_id
      WHERE ct.cart_id = ${cart_id}
    `;

    if (cartItems.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    for (const item of cartItems) {
      if (Number(item.quantity) > Number(item.stock_quantity ?? 0)) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for product variation ${item.product_variation_id}`,
        });
      }
    }

    let resolvedCouponId = coupon_id ?? null;
    if (!resolvedCouponId && coupon_code) {
      const coupon = await sql`
        SELECT coupon_id
        FROM Coupon
        WHERE code = ${coupon_code}
          AND is_active = TRUE
          AND CURRENT_DATE BETWEEN start_date AND end_date
        LIMIT 1
      `;
      resolvedCouponId = coupon[0]?.coupon_id ?? null;
    }

    const subtotal = cartItems.reduce(
      (sum, item) => sum + Number(item.item_price || 0) * Number(item.quantity || 0),
      0
    );

    let totalAmount = subtotal;
    if (resolvedCouponId) {
      const couponRows = await sql`
        SELECT discount_type, discount_value, max_discount_amount, min_order_amount
        FROM Coupon
        WHERE coupon_id = ${resolvedCouponId}
      `;

      if (couponRows.length > 0) {
        const cp = couponRows[0];
        const minOrder = Number(cp.min_order_amount ?? 0);

        if (subtotal >= minOrder) {
          let discount = 0;
          if (cp.discount_type === 'PERCENT') {
            discount = (subtotal * Number(cp.discount_value || 0)) / 100;
            if (cp.max_discount_amount !== null) {
              discount = Math.min(discount, Number(cp.max_discount_amount));
            }
          } else if (cp.discount_type === 'FIXED') {
            discount = Number(cp.discount_value || 0);
          }
          totalAmount = Math.max(0, subtotal - discount);
        }
      }
    }

    let resolvedAddressId = address_id ?? null;

    if (!resolvedAddressId && new_address?.postal_code) {
      const insertedAddress = await sql`
        INSERT INTO Address (house_no, road_no, postal_code, area, district, division, country)
        VALUES (
          ${new_address.house_no ?? null},
          ${new_address.road_no ?? null},
          ${new_address.postal_code},
          ${new_address.area ?? null},
          ${new_address.district ?? null},
          ${new_address.division ?? null},
          ${new_address.country ?? 'Bangladesh'}
        )
        RETURNING address_id
      `;

      resolvedAddressId = insertedAddress[0].address_id;

      await sql`
        INSERT INTO User_Address (user_id, address_id)
        VALUES (${user_id}, ${resolvedAddressId})
        ON CONFLICT DO NOTHING
      `;
    }

    if (!resolvedAddressId || use_default_address) {
      const defaultAddress = await sql`
        SELECT ua.address_id
        FROM User_Address ua
        WHERE ua.user_id = ${user_id}
        ORDER BY ua.address_id ASC
        LIMIT 1
      `;

      resolvedAddressId = defaultAddress[0]?.address_id ?? null;
    }

    if (!resolvedAddressId) {
      return res.status(400).json({
        success: false,
        message: "Delivery address is required. Choose a saved address or provide a new one.",
      });
    }

    const txQueries = [
      sql`
        INSERT INTO Orders (user_id, cart_id, coupon_id, order_status, total_amount)
        VALUES (${user_id}, ${cart_id}, ${resolvedCouponId}, 'PENDING', ${totalAmount})
        RETURNING *
      `,
      sql`
        INSERT INTO Delivery_Address (order_id, address_id)
        VALUES (currval(pg_get_serial_sequence('orders', 'order_id')), ${resolvedAddressId})
      `,
      ...cartItems.map((item) => sql`
        WITH updated AS (
          UPDATE Product_Variation
          SET stock_quantity = stock_quantity - ${item.quantity}
          WHERE product_variation_id = ${item.product_variation_id}
            AND stock_quantity >= ${item.quantity}
          RETURNING product_variation_id
        )
        SELECT CASE
          WHEN EXISTS (SELECT 1 FROM updated) THEN 1
          ELSE (1/0)
        END AS stock_ok
      `),
      sql`
        DELETE FROM Contains
        WHERE cart_id = ${cart_id}
      `,
    ];

    const txResults = await sql.transaction(txQueries);
    const newOrder = txResults[0];

    res.status(201).json({
      success: true,
      data: { ...newOrder[0], delivery_address_id: resolvedAddressId, total_amount: totalAmount },
    });
  } catch (error) {
    if (String(error?.message || '').includes('division by zero')) {
      return res.status(409).json({
        success: false,
        message: 'Stock changed while placing order. Please refresh cart and try again.',
      });
    }

    console.error("Error in createOrder:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Update order status
export const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { order_status } = req.body;

  if (!order_status) {
    return res.status(400).json({ success: false, message: "order_status is required" });
  }

  const validStatuses = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
  if (!validStatuses.includes(order_status)) {
    return res.status(400).json({ success: false, message: "Invalid order status" });
  }

  try {
    const updated = await sql`
      UPDATE Orders
      SET order_status = ${order_status}
      WHERE order_id = ${id}
      RETURNING *
    `;

    if (updated.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.status(200).json({ success: true, data: updated[0] });
  } catch (error) {
    console.error("Error in updateOrderStatus:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Delete order
export const deleteOrder = async (req, res) => {
  const { id } = req.params;

  try {
    // Remove dependent delivery_address row first
    await sql`DELETE FROM Delivery_Address WHERE order_id = ${id}`;

    const deleted = await sql`
      DELETE FROM Orders WHERE order_id = ${id} RETURNING *
    `;

    if (deleted.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.status(200).json({ success: true, message: "Order deleted successfully" });
  } catch (error) {
    console.error("Error in deleteOrder:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
