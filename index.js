import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createBareServer } from "@nebula-services/bare-server-node";
import chalk from "chalk";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import bareMuxNode from "@mercuryworkshop/bare-mux/node";
import { server as wisp } from "@mercuryworkshop/wisp-js/server";
import mime from "mime";
import fetch from "node-fetch";
// import { setupMasqr } from "./Masqr.js";
import config from "./config.js";

console.log(chalk.yellow("🚀 Starting server..."));

const __dirname = process.cwd();
const server = http.createServer();
const app = express();
const bareServer = createBareServer("/ca/");
const { baremuxPath } = bareMuxNode;
const epoxyDistPath = path.join(__dirname, "node_modules", "@mercuryworkshop", "epoxy-transport", "dist");
const PORT = process.env.PORT || 8080;
const cache = new Map();
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // Cache for 30 Days

wisp.options.allow_loopback_ips = true;
wisp.options.allow_private_ips = true;

const AUTH_COOKIE_NAME = "interstellar_auth";
const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "strict",
};

function isLoggedIn(req) {
  return req.cookies[AUTH_COOKIE_NAME] === "true";
}

function routeNeedsAuth(req) {
  const allowedPaths = [
    "/login",
    "/logout",
    "/e/",
    "/ca",
    "/bm",
    "/ep",
  ];
  const path = req.path;
  if (path === "/" || ["/b", "/a", "/play.html", "/c", "/d"].includes(path)) {
    return true;
  }
  if (path.startsWith("/assets/") || path.startsWith("/static/")) {
    return false;
  }
  return !allowedPaths.some(p => path === p || path.startsWith(p));
}

if (config.challenge !== false) {
  console.log(chalk.green("🔒 Password protection is enabled! Listing logins below"));
  console.log(chalk.green(`Probably won'r work tho. `));
  console.log(chalk.bold(`=======================================================================`));
  // biome-ignore lint: idk
  Object.entries(config.users).forEach(([username, password]) => {
    console.log(chalk.blue(`Username: ${username}, Password: ${password}`));
  });
}

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "static", "login.html"));
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (config.users[username] && config.users[username] === password) {
    res.cookie(AUTH_COOKIE_NAME, "true", AUTH_COOKIE_OPTIONS);
    return res.redirect("/");
  }
  return res.status(401).redirect("/login?error=1");
});

app.get("/logout", (req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME, AUTH_COOKIE_OPTIONS);
  res.redirect("/login");
});

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  if (!config.challenge) return next();
  if (!routeNeedsAuth(req)) return next();
  if (isLoggedIn(req)) return next();
  return res.redirect("/login");
});

app.get("/e/*", async (req, res, next) => {
  try {
    if (cache.has(req.path)) {
      const { data, contentType, timestamp } = cache.get(req.path);
      if (Date.now() - timestamp > CACHE_TTL) {
        cache.delete(req.path);
      } else {
        res.writeHead(200, { "Content-Type": contentType });
        return res.end(data);
      }
    }

    const baseUrls = {
      "/e/1/": "https://raw.githubusercontent.com/qrs/x/fixy/",
      "/e/2/": "https://raw.githubusercontent.com/3v1/V5-Assets/main/",
      "/e/3/": "https://raw.githubusercontent.com/3v1/V5-Retro/master/",
    };

    let reqTarget;
    for (const [prefix, baseUrl] of Object.entries(baseUrls)) {
      if (req.path.startsWith(prefix)) {
        reqTarget = baseUrl + req.path.slice(prefix.length);
        break;
      }
    }

    if (!reqTarget) {
      return next();
    }

    const asset = await fetch(reqTarget);
    if (!asset.ok) {
      return next();
    }

    const data = Buffer.from(await asset.arrayBuffer());
    const ext = path.extname(reqTarget);
    const no = [".unityweb"];
    const contentType = no.includes(ext) ? "application/octet-stream" : mime.getType(ext);

    cache.set(req.path, { data, contentType, timestamp: Date.now() });
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  } catch (error) {
    console.error("Error fetching asset:", error);
    res.setHeader("Content-Type", "text/html");
    res.status(500).send("Error fetching the asset");
  }
});

/* if (process.env.MASQR === "true") {
  console.log(chalk.green("Masqr is enabled"));
  setupMasqr(app);
} */

const transportStaticOptions = {
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath);
    if (ext === ".mjs" || ext === ".js") {
      res.type("text/javascript");
    } else if (ext === ".wasm") {
      res.type("application/wasm");
    }
  },
};

app.use(express.static(path.join(__dirname, "static")));
app.use("/ca", cors({ origin: true }));
app.use("/bm", express.static(baremuxPath, transportStaticOptions));
app.use("/ep", express.static(epoxyDistPath, transportStaticOptions));

const routes = [
  { path: "/b", file: "apps.html" },
  { path: "/a", file: "games.html" },
  { path: "/play.html", file: "games.html" },
  { path: "/c", file: "settings.html" },
  { path: "/d", file: "tabs.html" },
  { path: "/", file: "index.html" },
];

// biome-ignore lint: idk
routes.forEach(route => {
  app.get(route.path, (_req, res) => {
    res.sendFile(path.join(__dirname, "static", route.file));
  });
});

app.use((req, res, next) => {
  res.status(404).sendFile(path.join(__dirname, "static", "404.html"));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).sendFile(path.join(__dirname, "static", "404.html"));
});

server.on("request", (req, res) => {
  if (bareServer.shouldRoute(req)) {
    bareServer.routeRequest(req, res);
  } else {
    app(req, res);
  }
});

server.on("upgrade", (req, socket, head) => {
  if (bareServer.shouldRoute(req)) {
    bareServer.routeUpgrade(req, socket, head);
  } else {
    wisp.routeRequest(req, socket, head);
  }
});

server.on("listening", () => {
  console.log(chalk.green(`🌍 Server is running on http://localhost:${PORT}. Really won't really work cuz Im on codespaces. `));
  console.log(chalk.yellow(`Also available through your Codespaces preview if port ${PORT} is forwarded.`));
  console.log(chalk.bold(`=======================================================================`));
  console.log(chalk.inverse(`Server will automatically stop after 5 minutes of inactivity, or if the process is killed.`));
  console.log(chalk.bold(`=======================================================================`));
});

server.listen({ port: PORT });
