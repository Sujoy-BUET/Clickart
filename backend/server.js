import express from "express";
import helmet from "helmet";
import morgan from "morgan";
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
const PORT = process.env.PORT||3001;

app.use(express.json());
app.use(cors());
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
); // helmet is a security middleware that helps you protect your app by setting various HTTP headers

app.use(morgan("dev")); // log the requests


// apply arcjet rate-limit to all routes
// app.use(async (req, res, next) => {
//   try {
//     const decision = await aj.protect(req, {
//       requested: 1, // specifies that each request consumes 1 token
//     });

//     if (decision.isDenied()) {
//       if (decision.reason.isRateLimit()) {
//         res.status(429).json({ error: "Too Many Requests" });
//       } else if (decision.reason.isBot()) {
//         res.status(403).json({ error: "Bot access denied" });
//       } else {
//         res.status(403).json({ error: "Forbidden" });
//       }
//       return;
//     }

//     // check for spoofed bots
//     if (decision.results.some((result) => result.reason.isBot() && result.reason.isSpoofed())) {
//       res.status(403).json({ error: "Spoofed bot detected" });
//       return;
//     }

//     next();
//   } catch (error) {
//     console.log("Arcjet error", error);
//     next(error);
//   }
// });
 
app.use("/api/products", productRoutes);
app.use("/api/users", userRoutes);
app.use("/api/sellers", sellerRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/reviews", reviewRoutes);


initDB().then(() => {
  app.listen(PORT, () => {
    console.log("Server is running on port " + PORT);
  });
}).catch((err) => {
  console.error("Failed to initialize DB:", err);
  process.exit(1);
});