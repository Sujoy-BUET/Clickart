import { sql } from "../config/db.js";

const ORDER_STATUS_VALUES = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REJECTED', 'SUCCESSFUL'];
const STOCK_DEDUCTED_STATUSES = ['CONFIRMED', 'SHIPPED', 'DELIVERED', 'SUCCESSFUL'];

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

const ensureOrderSellerApprovalTable = async () => {
  await sql`
    CREATE TABLE IF NOT EXISTS Order_Seller_Approval (
      order_id INT NOT NULL,
      seller_id INT NOT NULL,
      approval_status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (approval_status IN ('PENDING', 'CONFIRMED', 'REJECTED')),
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (order_id, seller_id),
      FOREIGN KEY (order_id) REFERENCES Orders(order_id) ON DELETE CASCADE,
      FOREIGN KEY (seller_id) REFERENCES Sellers(seller_id) ON DELETE CASCADE
    )
  `;
};

const ensureOrderStatusConstraint = async () => {
  await sql`
    DO $$
    DECLARE
      constraint_name TEXT;
    BEGIN
      SELECT con.conname INTO constraint_name
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE rel.relname = 'orders'
        AND nsp.nspname = 'public'
        AND con.contype = 'c'
        AND pg_get_constraintdef(con.oid) ILIKE '%order_status%'
      LIMIT 1;

      IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE Orders DROP CONSTRAINT %I', constraint_name);
      END IF;

      BEGIN
        ALTER TABLE Orders
        ADD CONSTRAINT orders_order_status_check
        CHECK (order_status IN ('PENDING','CONFIRMED','SHIPPED','DELIVERED','CANCELLED','REJECTED','SUCCESSFUL'));
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END;
    END $$;
  `;
};

const ensureOrderWorkflowSchema = async () => {
  await ensureOrderItemTable();
  try {
    await ensureOrderSellerApprovalTable();
  } catch (error) {
    // Do not block checkout if migration cannot run on current DB role.
    console.warn("Skipping seller approval table migration:", error?.message || error);
  }
  try {
    await ensureOrderStatusConstraint();
  } catch (error) {
    // Never block checkout/order placement due to runtime constraint migration issues.
    console.warn("Skipping order status constraint migration:", error?.message || error);
  }
};

const isSellerApprovalTableAvailable = async () => {
  try {
    const rows = await sql`
      SELECT to_regclass('public.order_seller_approval') AS table_name
    `;
    return Boolean(rows[0]?.table_name);
  } catch {
    return false;
  }
};

const getOrderItemsSnapshot = async (orderId) => {
  return sql`
    SELECT oi.product_variation_id, oi.quantity
    FROM Order_Item oi
    WHERE oi.order_id = ${orderId}
    ORDER BY oi.order_item_id ASC
  `;
};

const adjustStockFromOrderItems = async ({ orderId, mode }) => {
  const items = await getOrderItemsSnapshot(orderId);

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('ORDER_ITEMS_NOT_FOUND');
  }

  for (const item of items) {
    const quantity = Number(item.quantity || 0);
    const variationId = Number(item.product_variation_id || 0);

    if (!quantity || !variationId) {
      continue;
    }

    if (mode === 'DEDUCT') {
      const stockResult = await sql`
        UPDATE Product_Variation
        SET stock_quantity = stock_quantity - ${quantity}
        WHERE product_variation_id = ${variationId}
          AND stock_quantity >= ${quantity}
        RETURNING product_variation_id
      `;

      if (stockResult.length === 0) {
        throw new Error(`INSUFFICIENT_STOCK:${variationId}`);
      }
    } else if (mode === 'RESTORE') {
      await sql`
        UPDATE Product_Variation
        SET stock_quantity = stock_quantity + ${quantity}
        WHERE product_variation_id = ${variationId}
      `;
    }
  }
};

const syncSellerApprovalsForOrder = async ({ orderId, approvalStatus }) => {
  const sellerApprovalAvailable = await isSellerApprovalTableAvailable();
  if (!sellerApprovalAvailable) {
    return;
  }

  await sql`
    UPDATE Order_Seller_Approval
    SET approval_status = ${approvalStatus},
        updated_at = CURRENT_TIMESTAMP
    WHERE order_id = ${orderId}
  `;
};

const applyAdminOrderDecision = async ({ orderId, decision }) => {
  const normalizedDecision = String(decision || '').trim().toUpperCase();
  if (!['DELIVERED', 'REJECTED'].includes(normalizedDecision)) {
    throw new Error('INVALID_ADMIN_DECISION');
  }

  const orderRows = await sql`
    SELECT order_id, order_status
    FROM Orders
    WHERE order_id = ${orderId}
    LIMIT 1
  `;

  if (orderRows.length === 0) {
    throw new Error('ORDER_NOT_FOUND');
  }

  const currentStatus = String(orderRows[0].order_status || '').toUpperCase();

  if (normalizedDecision === 'DELIVERED') {
    if (currentStatus === 'DELIVERED' || currentStatus === 'SUCCESSFUL') {
      return orderRows[0];
    }

    if (currentStatus !== 'PENDING') {
      throw new Error('INVALID_STATUS_TRANSITION_TO_DELIVERED');
    }

    await adjustStockFromOrderItems({ orderId, mode: 'DEDUCT' });
    await syncSellerApprovalsForOrder({ orderId, approvalStatus: 'CONFIRMED' });

    const updatedRows = await sql`
      UPDATE Orders
      SET order_status = 'DELIVERED'
      WHERE order_id = ${orderId}
      RETURNING *
    `;

    return updatedRows[0];
  }

  if (currentStatus === 'REJECTED') {
    return orderRows[0];
  }

  if (STOCK_DEDUCTED_STATUSES.includes(currentStatus)) {
    await adjustStockFromOrderItems({ orderId, mode: 'RESTORE' });
  }

  await syncSellerApprovalsForOrder({ orderId, approvalStatus: 'REJECTED' });

  const updatedRows = await sql`
    UPDATE Orders
    SET order_status = 'REJECTED'
    WHERE order_id = ${orderId}
    RETURNING *
  `;

  return updatedRows[0];
};

const reserveStockAndConfirmOrder = async (orderId) => {
  const orderRows = await sql`
    SELECT order_id, cart_id, order_status
    FROM Orders
    WHERE order_id = ${orderId}
    LIMIT 1
  `;

  if (orderRows.length === 0) {
    throw new Error("ORDER_NOT_FOUND");
  }

  const order = orderRows[0];
  if (order.order_status === 'CONFIRMED' || order.order_status === 'SHIPPED' || order.order_status === 'DELIVERED' || order.order_status === 'SUCCESSFUL') {
    return;
  }

  const cartItems = await sql`
    SELECT ct.product_variation_id, ct.quantity
    FROM Contains ct
    WHERE ct.cart_id = ${order.cart_id}
  `;

  for (const item of cartItems) {
    const stockResult = await sql`
      UPDATE Product_Variation
      SET stock_quantity = stock_quantity - ${item.quantity}
      WHERE product_variation_id = ${item.product_variation_id}
        AND stock_quantity >= ${item.quantity}
      RETURNING product_variation_id
    `;

    if (stockResult.length === 0) {
      throw new Error(`INSUFFICIENT_STOCK:${item.product_variation_id}`);
    }
  }

  await sql`
    DELETE FROM Contains
    WHERE cart_id = ${order.cart_id}
  `;

  await sql`
    UPDATE Orders
    SET order_status = 'CONFIRMED'
    WHERE order_id = ${orderId}
  `;
};

// Get all orders
export const getOrders = async (req, res) => {
  try {
    await ensureOrderWorkflowSchema();
    const orders = await sql`
      SELECT o.*, da.address_id AS delivery_address_id,
             u.user_name
      FROM Orders o
      LEFT JOIN Users u ON o.user_id = u.user_id
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
    await ensureOrderWorkflowSchema();

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
                     'seller_store_name', s.store_name,
                     'variation_type', oi.variation_type,
                     'variation_value', oi.variation_value,
                     'product_image', oi.product_image
                   )
                   ORDER BY oi.order_item_id
                 )
                 FROM Order_Item oi
                 JOIN Product_Variation pv ON oi.product_variation_id = pv.product_variation_id
                 LEFT JOIN Product p ON pv.product_id = p.product_id
                 LEFT JOIN Sellers s ON p.seller_id = s.seller_id
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
                     'seller_store_name', s.store_name,
                     'variation_type', vt.variation_type_name,
                     'variation_value', v.variation_value,
                     'product_image', p.product_image
                   )
                   ORDER BY ct.product_variation_id
                 )
                 FROM Contains ct
                 JOIN Product_Variation pv ON ct.product_variation_id = pv.product_variation_id
                 JOIN Product p ON pv.product_id = p.product_id
                LEFT JOIN Sellers s ON p.seller_id = s.seller_id
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
    await ensureOrderWorkflowSchema();

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
                     'seller_store_name', s.store_name,
                     'variation_type', oi.variation_type,
                     'variation_value', oi.variation_value,
                     'product_image', oi.product_image
                   )
                   ORDER BY oi.order_item_id
                 )
                 FROM Order_Item oi
                 JOIN Product_Variation pv ON oi.product_variation_id = pv.product_variation_id
                 LEFT JOIN Product p ON pv.product_id = p.product_id
                 LEFT JOIN Sellers s ON p.seller_id = s.seller_id
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
                     'seller_store_name', s.store_name,
                     'variation_type', vt.variation_type_name,
                     'variation_value', v.variation_value,
                     'product_image', p.product_image
                   )
                   ORDER BY ct.product_variation_id
                 )
                 FROM Contains ct
                 JOIN Product_Variation pv ON ct.product_variation_id = pv.product_variation_id
                 JOIN Product p ON pv.product_id = p.product_id
                LEFT JOIN Sellers s ON p.seller_id = s.seller_id
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
    await ensureOrderWorkflowSchema();

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
             p.seller_id,
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

    const sellerApprovalAvailable = await isSellerApprovalTableAvailable();
    if (sellerApprovalAvailable) {
      const uniqueSellerIds = [...new Set(cartItems.map((item) => Number(item.seller_id)).filter((value) => Number.isFinite(value)))];
      for (const sellerId of uniqueSellerIds) {
        await sql`
          INSERT INTO Order_Seller_Approval (order_id, seller_id, approval_status)
          VALUES (${newOrder.order_id}, ${sellerId}, 'PENDING')
          ON CONFLICT (order_id, seller_id) DO NOTHING
        `;
      }
    }

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
             product_name, s.store_name AS seller_store_name, variation_type, variation_value, product_image
      FROM Order_Item oi
      JOIN Product_Variation pv ON oi.product_variation_id = pv.product_variation_id
      LEFT JOIN Product p ON pv.product_id = p.product_id
      LEFT JOIN Sellers s ON p.seller_id = s.seller_id
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
    const message = process.env.NODE_ENV === "production"
      ? "Internal Server Error"
      : (error?.message || "Internal Server Error");
    res.status(500).json({ success: false, message });
  }
};

// Update order status
export const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { order_status } = req.body;

  if (!order_status) {
    return res.status(400).json({ success: false, message: "order_status is required" });
  }

  const validStatuses = ORDER_STATUS_VALUES;
  if (!validStatuses.includes(order_status)) {
    return res.status(400).json({ success: false, message: "Invalid order status" });
  }

  try {
    await ensureOrderWorkflowSchema();

    if (order_status === 'DELIVERED' || order_status === 'REJECTED') {
      try {
        const updatedOrder = await applyAdminOrderDecision({ orderId: id, decision: order_status });
        return res.status(200).json({ success: true, data: updatedOrder });
      } catch (decisionError) {
        const rawMessage = String(decisionError?.message || '');

        if (rawMessage === 'ORDER_NOT_FOUND') {
          return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (rawMessage === 'ORDER_ITEMS_NOT_FOUND') {
          return res.status(400).json({ success: false, message: 'Order items are missing for this order' });
        }

        if (rawMessage === 'INVALID_STATUS_TRANSITION_TO_DELIVERED') {
          return res.status(400).json({ success: false, message: 'Only pending orders can be marked as delivered' });
        }

        if (rawMessage.startsWith('INSUFFICIENT_STOCK:')) {
          return res.status(409).json({ success: false, message: 'Insufficient stock to deliver this order' });
        }

        throw decisionError;
      }
    }

    if (order_status === 'CONFIRMED') {
      try {
        await reserveStockAndConfirmOrder(id);
      } catch (confirmError) {
        const rawMessage = String(confirmError?.message || "");
        if (rawMessage.startsWith("INSUFFICIENT_STOCK:")) {
          return res.status(409).json({
            success: false,
            message: "Insufficient stock while confirming order. Please refresh and try again.",
          });
        }

        if (rawMessage === "ORDER_NOT_FOUND") {
          return res.status(404).json({ success: false, message: "Order not found" });
        }

        throw confirmError;
      }

      const confirmedRows = await sql`
        SELECT *
        FROM Orders
        WHERE order_id = ${id}
        LIMIT 1
      `;
      return res.status(200).json({ success: true, data: confirmedRows[0] });
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

// Get orders where a seller has items and can confirm/reject
export const getSellerOrders = async (req, res) => {
  const { sellerId } = req.params;

  try {
    await ensureOrderWorkflowSchema();
    const sellerApprovalAvailable = await isSellerApprovalTableAvailable();
    if (!sellerApprovalAvailable) {
      return res.status(503).json({ success: false, message: "Seller approval workflow is not available. Please contact admin." });
    }

    const approvals = await sql`
      SELECT
        o.order_id,
        o.user_id,
        o.order_date,
        o.order_status,
        osa.approval_status,
        COALESCE(SUM(oi.quantity), 0)::INT AS seller_units,
        COALESCE(SUM(oi.quantity * oi.unit_price), 0)::NUMERIC(12,2) AS seller_amount,
        COALESCE(
          json_agg(
            json_build_object(
              'order_item_id', oi.order_item_id,
              'product_id', pv.product_id,
              'product_name', oi.product_name,
              'quantity', oi.quantity,
              'unit_price', oi.unit_price,
              'variation_type', oi.variation_type,
              'variation_value', oi.variation_value
            )
            ORDER BY oi.order_item_id
          ) FILTER (WHERE oi.order_item_id IS NOT NULL),
          '[]'::json
        ) AS items
      FROM Order_Seller_Approval osa
      JOIN Orders o ON o.order_id = osa.order_id
      LEFT JOIN Order_Item oi ON oi.order_id = o.order_id
      LEFT JOIN Product_Variation pv ON oi.product_variation_id = pv.product_variation_id
      LEFT JOIN Product p ON pv.product_id = p.product_id
      WHERE osa.seller_id = ${sellerId}
        AND (p.seller_id = ${sellerId} OR p.seller_id IS NULL)
      GROUP BY o.order_id, o.user_id, o.order_date, o.order_status, osa.approval_status
      ORDER BY o.order_date DESC, o.order_id DESC
    `;

    return res.status(200).json({ success: true, data: approvals });
  } catch (error) {
    console.error("Error in getSellerOrders:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Seller confirms/rejects their part of an order
export const sellerRespondToOrder = async (req, res) => {
  const { id } = req.params;
  const { seller_id, approval_status } = req.body;

  if (!seller_id || !approval_status) {
    return res.status(400).json({ success: false, message: "seller_id and approval_status are required" });
  }

  const normalizedStatus = String(approval_status).trim().toUpperCase();
  if (!['CONFIRMED', 'REJECTED'].includes(normalizedStatus)) {
    return res.status(400).json({ success: false, message: "approval_status must be CONFIRMED or REJECTED" });
  }

  try {
    await ensureOrderWorkflowSchema();

    const approval = await sql`
      UPDATE Order_Seller_Approval
      SET approval_status = ${normalizedStatus},
          updated_at = CURRENT_TIMESTAMP
      WHERE order_id = ${id}
        AND seller_id = ${seller_id}
      RETURNING order_id, seller_id, approval_status, updated_at
    `;

    if (approval.length === 0) {
      return res.status(404).json({ success: false, message: "Seller approval record not found for this order" });
    }

    const orderRows = await sql`
      SELECT *
      FROM Orders
      WHERE order_id = ${id}
      LIMIT 1
    `;

    return res.status(200).json({
      success: true,
      data: {
        approval: approval[0],
        order: orderRows[0],
      },
    });
  } catch (error) {
    console.error("Error in sellerRespondToOrder:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// User marks order as received -> SUCCESSFUL
export const markOrderReceived = async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ success: false, message: "user_id is required" });
  }

  try {
    await ensureOrderWorkflowSchema();

    const orderRows = await sql`
      SELECT order_id, user_id, order_status
      FROM Orders
      WHERE order_id = ${id}
      LIMIT 1
    `;

    if (orderRows.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const order = orderRows[0];
    if (Number(order.user_id) !== Number(user_id)) {
      return res.status(403).json({ success: false, message: "You are not allowed to update this order" });
    }

    if (order.order_status === 'REJECTED' || order.order_status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: "Rejected/cancelled order cannot be marked as received" });
    }

    if (!['CONFIRMED', 'SHIPPED', 'DELIVERED', 'SUCCESSFUL'].includes(order.order_status)) {
      return res.status(400).json({ success: false, message: "Order can be marked received only after seller confirmation" });
    }

    const updated = await sql`
      UPDATE Orders
      SET order_status = 'SUCCESSFUL'
      WHERE order_id = ${id}
      RETURNING *
    `;

    return res.status(200).json({ success: true, data: updated[0] });
  } catch (error) {
    console.error("Error in markOrderReceived:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
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
