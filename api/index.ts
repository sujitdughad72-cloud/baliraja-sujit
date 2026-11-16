import express from "express";
import { registerApiRoutes } from "../apiRoutes.ts";

const app = express();
registerApiRoutes(app);

export default app;
