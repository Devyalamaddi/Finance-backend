import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import authRoutes from "./routes/auth";
import usersRoutes from "./routes/users";
import recordsRoutes from "./routes/records";
import summaryRoutes from "./routes/summary";
import { errorHandler, notFound } from "./middlewares/errorHandler";
import { rateLimit } from "./middlewares/rateLimit";
import { swaggerSpec } from "./swagger";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.use(rateLimit);

app.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/auth", authRoutes);
app.use("/users", usersRoutes);
app.use("/records", recordsRoutes);
app.use("/summary", summaryRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
