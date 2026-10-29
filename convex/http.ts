import { httpRouter } from "convex/server";
import { auth } from "./auth";

/** Convex Auth mounts its routes here. */
const http = httpRouter();

auth.addHttpRoutes(http);

export default http;
