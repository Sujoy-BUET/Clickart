import { sql } from "../config/db.js";

// Get all reviews
export const getReviews = async (req, res) => {
  try {
    const reviews = await sql`
      SELECT * FROM review
      ORDER BY review_id DESC
    `;
    console.log("fetched reviews", reviews);
    res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    console.log("Error in getReviews function", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Get review by ID
export const getReview = async (req, res) => {
  const { id } = req.params;

  try {
    const review = await sql`
      SELECT * FROM review WHERE review_id = ${id}
    `;

    if (review.length === 0) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    res.status(200).json({ success: true, data: review[0] });
  } catch (error) {
    console.log("Error in getReview function", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Get reviews by product ID
export const getProductReviews = async (req, res) => {
  const { productId } = req.params;

  try {
    const reviews = await sql`
      SELECT * FROM review WHERE product_id = ${productId}
      ORDER BY review_date DESC
    `;

    res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    console.log("Error in getProductReviews function", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Get reviews by user ID
export const getUserReviews = async (req, res) => {
  const { userId } = req.params;

  try {
    const reviews = await sql`
      SELECT * FROM review WHERE user_id = ${userId}
      ORDER BY review_date DESC
    `;

    res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    console.log("Error in getUserReviews function", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Create new review
export const createReview = async (req, res) => {
  const { review_id, user_id, product_id, rating, comment } = req.body;

  if (!review_id || !user_id || !product_id || !rating) {
    return res.status(400).json({ success: false, message: "Review ID, User ID, Product ID, and Rating are required" });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
  }

  try {
    const newReview = await sql`
      INSERT INTO review (review_id, user_id, product_id, rating, comment)
      VALUES (${review_id}, ${user_id}, ${product_id}, ${rating}, ${comment})
      RETURNING *
    `;

    res.status(201).json({ success: true, data: newReview[0] });
  } catch (error) {
    console.log("Error in createReview function", error);
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
    const updatedReview = await sql`
      UPDATE review
      SET rating = COALESCE(${rating}, rating),
          comment = COALESCE(${comment}, comment)
      WHERE review_id = ${id}
      RETURNING *
    `;

    if (updatedReview.length === 0) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    res.status(200).json({ success: true, data: updatedReview[0] });
  } catch (error) {
    console.log("Error in updateReview function", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Delete review
export const deleteReview = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedReview = await sql`
      DELETE FROM review
      WHERE review_id = ${id}
      RETURNING *
    `;

    if (deletedReview.length === 0) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    res.status(200).json({ success: true, message: "Review deleted successfully" });
  } catch (error) {
    console.log("Error in deleteReview function", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
