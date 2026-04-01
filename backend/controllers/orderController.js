import { sql } from "../config/db.js";

const ensureOrderItemTable = async () => {
  await sql`
    CREATE TABLE IF NOT EXISTS Order_Item (
      order_item_id SERIAL PRIMARY KEY,
      order_id INT NOT NULL,
      product_variation_id INT NOT NULL,
      quantity INT NOT NULL,
      unit_price NUMERIC(10,2) NOT NULL,
      product_name VARCHAR(150) NOT NULL,
      variation_type VARCHAR(50),
      variation_value VARCHAR(50),
      product_image VARCHAR(255),
      FOREIGN KEY (order_id) REFERENCES Orders(order_id) ON DELETE CASCADE,
      FOREIGN KEY (product_variation_id) REFERENCES Product_Variation(product_variation_id)
    )
  `;
};

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
    await ensureOrderItemTable();

    const order = await sql`
      SELECT o.*,
             a.address_id, a.house_no, a.road_no, a.postal_code,
             a.area, a.district, a.division, a.country,
             cp.code AS coupon_code, cp.discount_type, cp.discount_value,
             COALESCE(
               (
                 SELECT json_agg(
                   json_build_object(
                     'order_item_id', oi.order_item_id,
                     'product_id', pv.product_id,
                     'product_variation_id', oi.product_variation_id,
                     'quantity', oi.quantity,
                     'unit_price', oi.unit_price,
                     'product_name', oi.product_name,
                     'variation_type', oi.variation_type,
                     'variation_value', oi.variation_value,
                     'product_image', oi.product_image
                   )
                   ORDER BY oi.order_item_id
                 )
                 FROM Order_Item oi
                 JOIN Product_Variation pv ON oi.product_variation_id = pv.product_variation_id
                 WHERE oi.order_id = o.order_id
               ),
               (
                 SELECT json_agg(
                   json_build_object(
                     'order_item_id', null,
                     'product_id', pv.product_id,
                     'product_variation_id', ct.product_variation_id,
                     'quantity', ct.quantity,
                     'unit_price', COALESCE(pv.price, p.price),
                     'product_name', p.product_name,
                     'variation_type', vt.variation_type_name,
                     'variation_value', v.variation_value,
                     'product_image', p.product_image
                   )
                   ORDER BY ct.product_variation_id
                 )
                 FROM Contains ct
                 JOIN Product_Variation pv ON ct.product_variation_id = pv.product_variation_id
                 JOIN Product p ON pv.product_id = p.product_id
                 LEFT JOIN Variation v ON pv.variation_id = v.variation_id
                 LEFT JOIN VariationType vt ON v.variation_type_id = vt.variation_type_id
                 WHERE ct.cart_id = o.cart_id
               ),
               '[]'::json
             ) AS items
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
    await ensureOrderItemTable();

    const orders = await sql`
      SELECT o.*, o.order_status AS status,
             da.address_id AS delivery_address_id,
             a.area AS city,
             cp.code AS coupon_code,
             COALESCE(
               (
                 SELECT json_agg(
                   json_build_object(
                     'order_item_id', oi.order_item_id,
                     'product_id', pv.product_id,
                     'product_variation_id', oi.product_variation_id,
                     'quantity', oi.quantity,
                     'unit_price', oi.unit_price,
                     'product_name', oi.product_name,
                     'variation_type', oi.variation_type,
                     'variation_value', oi.variation_value,
                     'product_image', oi.product_image
                   )
                   ORDER BY oi.order_item_id
                 )
                 FROM Order_Item oi
                 JOIN Product_Variation pv ON oi.product_variation_id = pv.product_variation_id
                 WHERE oi.order_id = o.order_id
               ),
               (
                 SELECT json_agg(
                   json_build_object(
                     'order_item_id', null,
                     'product_id', pv.product_id,
                     'product_variation_id', ct.product_variation_id,
                     'quantity', ct.quantity,
                     'unit_price', COALESCE(pv.price, p.price),
                     'product_name', p.product_name,
                     'variation_type', vt.variation_type_name,
                     'variation_value', v.variation_value,
                     'product_image', p.product_image
                   )
                   ORDER BY ct.product_variation_id
                 )
                 FROM Contains ct
                 JOIN Product_Variation pv ON ct.product_variation_id = pv.product_variation_id
                 JOIN Product p ON pv.product_id = p.product_id
                 LEFT JOIN Variation v ON pv.variation_id = v.variation_id
                 LEFT JOIN VariationType vt ON v.variation_type_id = vt.variation_type_id
                 WHERE ct.cart_id = o.cart_id
               ),
               '[]'::json
             ) AS items
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
    await ensureOrderItemTable();

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
             pv.stock_quantity,
             p.product_name,
             p.product_image,
             vt.variation_type_name AS variation_type,
             v.variation_value
      FROM Contains ct
      JOIN Product_Variation pv ON ct.product_variation_id = pv.product_variation_id
      JOIN Product p ON pv.product_id = p.product_id
      LEFT JOIN Variation v ON pv.variation_id = v.variation_id
      LEFT JOIN VariationType vt ON v.variation_type_id = vt.variation_type_id
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

    const newOrderRows = await sql`
      WITH new_order AS (
        INSERT INTO Orders (user_id, cart_id, coupon_id, order_status, total_amount)
        VALUES (${user_id}, ${cart_id}, ${resolvedCouponId}, 'PENDING', ${totalAmount})
        RETURNING *
      ),
      delivery AS (
        INSERT INTO Delivery_Address (order_id, address_id)
        SELECT order_id, ${resolvedAddressId}
        FROM new_order
      )
      SELECT *
      FROM new_order
    `;

    const newOrder = newOrderRows[0];

    for (const item of cartItems) {
      await sql`
        INSERT INTO Order_Item (
          order_id,
          product_variation_id,
          quantity,
          unit_price,
          product_name,
          variation_type,
          variation_value,
          product_image
        )
        VALUES (
          ${newOrder.order_id},
          ${item.product_variation_id},
          ${item.quantity},
          ${item.item_price},
          ${item.product_name},
          ${item.variation_type ?? null},
          ${item.variation_value ?? null},
          ${item.product_image ?? null}
        )
      `;
    }

    const createdItems = await sql`
      SELECT oi.order_item_id, pv.product_id, oi.product_variation_id, oi.quantity, oi.unit_price,
             product_name, variation_type, variation_value, product_image
      FROM Order_Item oi
      JOIN Product_Variation pv ON oi.product_variation_id = pv.product_variation_id
      WHERE oi.order_id = ${newOrder.order_id}
      ORDER BY oi.order_item_id ASC
    `;

    res.status(201).json({
      success: true,
      data: {
        ...newOrder,
        delivery_address_id: resolvedAddressId,
        total_amount: totalAmount,
        items: createdItems,
      },
    });
  } catch (error) {
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
    if (order_status === 'CONFIRMED') {
      const orderRows = await sql`
        SELECT order_id, cart_id, order_status
        FROM Orders
        WHERE order_id = ${id}
        LIMIT 1
      `;

      if (orderRows.length === 0) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }

      const order = orderRows[0];

      console.log('Confirming order:', id, 'cart:', order.cart_id, 'current status:', order.order_status);

      if (order.order_status === 'CONFIRMED') {
        const existing = await sql`
          SELECT *
          FROM Orders
          WHERE order_id = ${id}
          LIMIT 1
        `;
        return res.status(200).json({ success: true, data: existing[0] });
      }

      const cartItems = await sql`
        SELECT ct.product_variation_id, ct.quantity
        FROM Contains ct
        WHERE ct.cart_id = ${order.cart_id}
      `;

      console.log('Cart has', cartItems.length, 'items');

      for (const item of cartItems) {
        const stockResult = await sql`
          UPDATE Product_Variation
          SET stock_quantity = stock_quantity - ${item.quantity}
          WHERE product_variation_id = ${item.product_variation_id}
            AND stock_quantity >= ${item.quantity}
          RETURNING product_variation_id, stock_quantity
        `;

        if (stockResult.length === 0) {
          console.log('Stock error for variation', item.product_variation_id);
          return res.status(409).json({
            success: false,
            message: `Insufficient stock for product variation ${item.product_variation_id}. Please refresh and try again.`,
          });
        }

        console.log('Updated variation', item.product_variation_id, 'new stock:', stockResult[0].stock_quantity);
      }

      console.log('Clearing cart', order.cart_id);
      await sql`
        DELETE FROM Contains
        WHERE cart_id = ${order.cart_id}
      `;

      console.log('Marking order', id, 'as CONFIRMED');
      const updatedOrder = await sql`
        UPDATE Orders
        SET order_status = 'CONFIRMED'
        WHERE order_id = ${id}
        RETURNING *
      `;

      console.log('Order confirmed:', updatedOrder[0]);
      return res.status(200).json({ success: true, data: updatedOrder[0] });
    }

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
    if (String(error?.message || '').includes('division by zero')) {
      return res.status(409).json({
        success: false,
        message: 'Stock changed while confirming order. Please refresh cart and try again.',
      });
    }

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
