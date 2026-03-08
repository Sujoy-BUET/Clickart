import { sql } from "../config/db.js";

// Get all reviews
export const getReviews = async (req, res) => {
  try {
    const reviews = await sql`
      SELECT r.*,
             rp.product_id,
             rs.seller_id
      FROM review r
      LEFT JOIN review_product rp ON r.review_id = rp.review_id
      LEFT JOIN review_seller  rs ON r.review_id = rs.review_id
      ORDER BY r.review_id DESC
    `;
    res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    console.error("Error in getReviews:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Get review by ID
export const getReview = async (req, res) => {
  const { id } = req.params;

  try {
    const review = await sql`
      SELECT r.*,
             rp.product_id,
             rs.seller_id
      FROM review r
      LEFT JOIN review_product rp ON r.review_id = rp.review_id
      LEFT JOIN review_seller  rs ON r.review_id = rs.review_id
      WHERE r.review_id = ${id}
    `;

    if (review.length === 0) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    res.status(200).json({ success: true, data: review[0] });
  } catch (error) {
    console.error("Error in getReview:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Get reviews for a product
export const getProductReviews = async (req, res) => {
  const { productId } = req.params;

  try {
    const reviews = await sql`
      SELECT r.*, rp.product_id
      FROM review r
      JOIN review_product rp ON r.review_id = rp.review_id
      WHERE rp.product_id = ${productId}
      ORDER BY r.review_date DESC
    `;

    res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    console.error("Error in getProductReviews:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Get reviews for a seller
export const getSellerReviews = async (req, res) => {
  const { sellerId } = req.params;

  try {
    const reviews = await sql`
      SELECT r.*, rs.seller_id
      FROM review r
      JOIN review_seller rs ON r.review_id = rs.review_id
      WHERE rs.seller_id = ${sellerId}
      ORDER BY r.review_date DESC
    `;

    res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    console.error("Error in getSellerReviews:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Get reviews by user
export const getUserReviews = async (req, res) => {
  const { userId } = req.params;

  try {
    const reviews = await sql`
      SELECT r.*,
             rp.product_id,
             rs.seller_id
      FROM review r
      LEFT JOIN review_product rp ON r.review_id = rp.review_id
      LEFT JOIN review_seller  rs ON r.review_id = rs.review_id
      WHERE r.reviewer_user_id = ${userId}
      ORDER BY r.review_date DESC
    `;

    res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    console.error("Error in getUserReviews:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Create product review
export const createProductReview = async (req, res) => {
  const { reviewer_user_id, product_id, rating, comment } = req.body;

  if (!reviewer_user_id || !product_id || !rating) {
    return res.status(400).json({ success: false, message: "reviewer_user_id, product_id, and rating are required" });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
  }

  try {
    const newReview = await sql`
      INSERT INTO review (reviewer_user_id, rating, comment)
      VALUES (${reviewer_user_id}, ${rating}, ${comment ?? null})
      RETURNING *
    `;

    await sql`
      INSERT INTO Review_Product (review_id, product_id)
      VALUES (${newReview[0].review_id}, ${product_id})
    `;

    res.status(201).json({ success: true, data: { ...newReview[0], product_id } });
  } catch (error) {
    console.error("Error in createProductReview:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Create seller review
export const createSellerReview = async (req, res) => {
  const { reviewer_user_id, seller_id, rating, comment } = req.body;

  if (!reviewer_user_id || !seller_id || !rating) {
    return res.status(400).json({ success: false, message: "reviewer_user_id, seller_id, and rating are required" });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
  }

  try {
    const newReview = await sql`
      INSERT INTO review (reviewer_user_id, rating, comment)
      VALUES (${reviewer_user_id}, ${rating}, ${comment ?? null})
      RETURNING *
    `;

    await sql`
      INSERT INTO Review_Seller (review_id, seller_id)
      VALUES (${newReview[0].review_id}, ${seller_id})
    `;

    res.status(201).json({ success: true, data: { ...newReview[0], seller_id } });
  } catch (error) {
    console.error("Error in createSellerReview:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Update review
export const updateReview = async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;

  if (rating && (rating < 1 || rating > 5)) {
    return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
  }

  try {
    const updated = await sql`
      UPDATE review
      SET rating  = COALESCE(${rating ?? null}, rating),
          comment = COALESCE(${comment ?? null}, comment)
      WHERE review_id = ${id}
      RETURNING *
    `;

    if (updated.length === 0) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    res.status(200).json({ success: true, data: updated[0] });
  } catch (error) {
    console.error("Error in updateReview:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Delete review (cascades junction rows)
export const deleteReview = async (req, res) => {
  const { id } = req.params;

  try {
    // Remove junction rows first
    await sql`DELETE FROM review_product WHERE review_id = ${id}`;
    await sql`DELETE FROM review_seller  WHERE review_id = ${id}`;

    const deleted = await sql`
      DELETE FROM review WHERE review_id = ${id} RETURNING *
    `;

    if (deleted.length === 0) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    res.status(200).json({ success: true, message: "Review deleted successfully" });
  } catch (error) {
    console.error("Error in deleteReview:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
