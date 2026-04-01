import { sql } from "../config/db.js";

const normalizeComment = (value) => {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
};

const parseRating = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseId = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

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
  const parsedProductId = parseId(productId);

  if (!parsedProductId) {
    return res.status(400).json({ success: false, message: "Invalid productId" });
  }

  try {
    const reviews = await sql`
      SELECT r.*, rp.product_id, u.user_name AS reviewer_name
      FROM review r
      JOIN review_product rp ON r.review_id = rp.review_id
      JOIN Users u ON r.reviewer_user_id = u.user_id
      WHERE rp.product_id = ${parsedProductId}
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
  const parsedSellerId = parseId(sellerId);

  if (!parsedSellerId) {
    return res.status(400).json({ success: false, message: "Invalid sellerId" });
  }

  try {
    const reviews = await sql`
      SELECT r.*, rs.seller_id, u.user_name AS reviewer_name
      FROM review r
      JOIN review_seller rs ON r.review_id = rs.review_id
      JOIN Users u ON r.reviewer_user_id = u.user_id
      WHERE rs.seller_id = ${parsedSellerId}
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
  const parsedUserId = parseId(userId);

  if (!parsedUserId) {
    return res.status(400).json({ success: false, message: "Invalid userId" });
  }

  try {
    const reviews = await sql`
      SELECT r.*,
             rp.product_id,
             rs.seller_id
      FROM review r
      LEFT JOIN review_product rp ON r.review_id = rp.review_id
      LEFT JOIN review_seller  rs ON r.review_id = rs.review_id
      WHERE r.reviewer_user_id = ${parsedUserId}
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
  const reviewerUserId = parseId(reviewer_user_id);
  const productId = parseId(product_id);
  const normalizedRating = parseRating(rating);
  const normalizedComment = normalizeComment(comment);

  if (!reviewerUserId || !productId || normalizedRating === null) {
    return res.status(400).json({ success: false, message: "reviewer_user_id, product_id, and rating are required" });
  }

  if (normalizedRating < 1 || normalizedRating > 5) {
    return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
  }

  try {
    const userExists = await sql`
      SELECT user_id
      FROM Users
      WHERE user_id = ${reviewerUserId}
      LIMIT 1
    `;

    if (userExists.length === 0) {
      return res.status(404).json({ success: false, message: "Reviewer user not found" });
    }

    const productExists = await sql`
      SELECT product_id
      FROM Product
      WHERE product_id = ${productId}
      LIMIT 1
    `;

    if (productExists.length === 0) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const existingReview = await sql`
      SELECT r.review_id
      FROM Review r
      JOIN Review_Product rp ON r.review_id = rp.review_id
      WHERE r.reviewer_user_id = ${reviewerUserId}
        AND rp.product_id = ${productId}
      LIMIT 1
    `;

    if (existingReview.length > 0) {
      return res.status(409).json({
        success: false,
        message: "You have already reviewed this product. Please edit your existing review.",
      });
    }

    const newReview = await sql`
      INSERT INTO review (reviewer_user_id, rating, comment)
      VALUES (${reviewerUserId}, ${normalizedRating}, ${normalizedComment})
      RETURNING *
    `;

    await sql`
      INSERT INTO Review_Product (review_id, product_id)
      VALUES (${newReview[0].review_id}, ${productId})
    `;

    res.status(201).json({ success: true, data: { ...newReview[0], product_id: productId } });
  } catch (error) {
    console.error("Error in createProductReview:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Create seller review
export const createSellerReview = async (req, res) => {
  const { reviewer_user_id, seller_id, rating, comment } = req.body;
  const reviewerUserId = parseId(reviewer_user_id);
  const sellerId = parseId(seller_id);
  const normalizedRating = parseRating(rating);
  const normalizedComment = normalizeComment(comment);

  if (!reviewerUserId || !sellerId || normalizedRating === null) {
    return res.status(400).json({ success: false, message: "reviewer_user_id, seller_id, and rating are required" });
  }

  if (normalizedRating < 1 || normalizedRating > 5) {
    return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
  }

  try {
    const userExists = await sql`
      SELECT user_id
      FROM Users
      WHERE user_id = ${reviewerUserId}
      LIMIT 1
    `;

    if (userExists.length === 0) {
      return res.status(404).json({ success: false, message: "Reviewer user not found" });
    }

    const sellerExists = await sql`
      SELECT seller_id
      FROM Sellers
      WHERE seller_id = ${sellerId}
      LIMIT 1
    `;

    if (sellerExists.length === 0) {
      return res.status(404).json({ success: false, message: "Seller not found" });
    }

    const existingReview = await sql`
      SELECT r.review_id
      FROM Review r
      JOIN Review_Seller rs ON r.review_id = rs.review_id
      WHERE r.reviewer_user_id = ${reviewerUserId}
        AND rs.seller_id = ${sellerId}
      LIMIT 1
    `;

    if (existingReview.length > 0) {
      return res.status(409).json({
        success: false,
        message: "You have already reviewed this seller. Please edit your existing review.",
      });
    }

    const newReview = await sql`
      INSERT INTO review (reviewer_user_id, rating, comment)
      VALUES (${reviewerUserId}, ${normalizedRating}, ${normalizedComment})
      RETURNING *
    `;

    await sql`
      INSERT INTO Review_Seller (review_id, seller_id)
      VALUES (${newReview[0].review_id}, ${sellerId})
    `;

    res.status(201).json({ success: true, data: { ...newReview[0], seller_id: sellerId } });
  } catch (error) {
    console.error("Error in createSellerReview:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Update review
export const updateReview = async (req, res) => {
  const { id } = req.params;
  const { rating, comment, reviewer_user_id } = req.body;
  const reviewId = parseId(id);
  const normalizedRating = rating === undefined ? undefined : parseRating(rating);
  const normalizedComment = comment === undefined ? undefined : normalizeComment(comment);
  const reviewerUserId = reviewer_user_id === undefined ? null : parseId(reviewer_user_id);

  if (!reviewId) {
    return res.status(400).json({ success: false, message: "Invalid review id" });
  }

  if (normalizedRating !== undefined && (normalizedRating === null || normalizedRating < 1 || normalizedRating > 5)) {
    return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
  }

  if (reviewer_user_id !== undefined && !reviewerUserId) {
    return res.status(400).json({ success: false, message: "Invalid reviewer_user_id" });
  }

  if (normalizedRating === undefined && normalizedComment === undefined) {
    return res.status(400).json({ success: false, message: "rating or comment is required" });
  }

  try {
    if (reviewerUserId) {
      const ownReview = await sql`
        SELECT review_id
        FROM Review
        WHERE review_id = ${reviewId}
          AND reviewer_user_id = ${reviewerUserId}
        LIMIT 1
      `;

      if (ownReview.length === 0) {
        return res.status(403).json({ success: false, message: "You can only edit your own review" });
      }
    }

    const updated = await sql`
      UPDATE review
      SET rating  = COALESCE(${normalizedRating ?? null}, rating),
          comment = COALESCE(${normalizedComment ?? null}, comment)
      WHERE review_id = ${reviewId}
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
  const { reviewer_user_id } = req.body;
  const reviewId = parseId(id);
  const reviewerUserId = reviewer_user_id === undefined ? null : parseId(reviewer_user_id);

  if (!reviewId) {
    return res.status(400).json({ success: false, message: "Invalid review id" });
  }

  if (reviewer_user_id !== undefined && !reviewerUserId) {
    return res.status(400).json({ success: false, message: "Invalid reviewer_user_id" });
  }

  try {
    if (reviewerUserId) {
      const ownReview = await sql`
        SELECT review_id
        FROM Review
        WHERE review_id = ${reviewId}
          AND reviewer_user_id = ${reviewerUserId}
        LIMIT 1
      `;

      if (ownReview.length === 0) {
        return res.status(403).json({ success: false, message: "You can only delete your own review" });
      }
    }

    // Remove junction rows first
    await sql`DELETE FROM review_product WHERE review_id = ${reviewId}`;
    await sql`DELETE FROM review_seller  WHERE review_id = ${reviewId}`;

    const deleted = await sql`
      DELETE FROM review WHERE review_id = ${reviewId} RETURNING *
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
