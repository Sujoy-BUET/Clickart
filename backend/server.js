import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import productRoutes from "./routes/productRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import sellerRoutes from "./routes/sellerRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import initDB from "./db/initDB.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(cors());
 
app.use("/api/products", productRoutes);
app.use("/api/users", userRoutes);
app.use("/api/sellers", sellerRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/reviews", reviewRoutes);


const shouldInitDb = process.env.INIT_DB === "true";

if (shouldInitDb) {
  initDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log("Server is running on port " + PORT);
      });
    })
    .catch((err) => {
      console.error("Failed to initialize DB:", err);
      process.exit(1);
    });
} else {
  app.listen(PORT, () => {
    console.log("Server is running on port " + PORT);
  });
}