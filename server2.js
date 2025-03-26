const express = require("express");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const bodyParser = require("body-parser");

const app = express();
const port = 3002;
const pageName = "Page 2";
const secret = fs.readFileSync("secret.key", "utf8");
const tokensFile = "tokens.json";

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));

function readTokens() {
  try {
    return JSON.parse(fs.readFileSync(tokensFile, "utf8"));
  } catch (err) {
    return [];
  }
}

function writeTokens(tokens) {
  fs.writeFileSync(tokensFile, JSON.stringify(tokens), "utf8");
}

app.get("/", (req, res) => {
  const token = req.cookies.token;
  if (token) {
    try {
      jwt.verify(token, secret);
      if (readTokens().includes(token)) {
        return res.send(`Welcome to ${pageName}! <a href="/logout">Logout</a>`);
      }
    } catch (err) {}
  }
  res.send(`<a href="/login">Login</a> | <a href="/signup">Signup</a>`);
});

app.get("/login", (req, res) => {
  res.send(`
    <form action="/login" method="post">
      <input type="text" name="username" placeholder="Username" required>
      <input type="password" name="password" placeholder="Password" required>
      <button type="submit">Login</button>
    </form>
    <a href="/signup">Signup</a>
  `);
});

app.get("/signup", (req, res) => {
  res.send(`
    <form action="/signup" method="post">
      <input type="text" name="username" placeholder="Username" required>
      <input type="password" name="password" placeholder="Password" required>
      <button type="submit">Signup</button>
    </form>
    <a href="/login">Login</a>
  `);
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const token = jwt.sign({ username }, secret, { expiresIn: "1h" });
  const tokens = readTokens();
  tokens.push(token);
  writeTokens(tokens);
  res.cookie("token", token, { httpOnly: true });
  res.send(`
    <html>
      <body>
        <p>Login successful! Redirecting...</p>
        <iframe src="http://localhost:3001/sso-login?token=${token}" style="display:none;"></iframe>
        <script>
          setTimeout(() => window.location.href = "/", 1000);
        </script>
      </body>
    </html>
  `);
});

app.post("/signup", (req, res) => {
  const { username, password } = req.body;
  const token = jwt.sign({ username }, secret, { expiresIn: "1h" });
  const tokens = readTokens();
  tokens.push(token);
  writeTokens(tokens);
  res.cookie("token", token, { httpOnly: true });
  res.send(`
    <html>
      <body>
        <p>Signup successful! Redirecting...</p>
        <iframe src="http://localhost:3001/sso-login?token=${token}" style="display:none;"></iframe>
        <script>
          setTimeout(() => window.location.href = "/", 1000);
        </script>
      </body>
    </html>
  `);
});

app.get("/sso-login", (req, res) => {
  const token = req.query.token;
  if (token) {
    try {
      jwt.verify(token, secret);
      const tokens = readTokens();
      if (tokens.includes(token)) {
        res.cookie("token", token, { httpOnly: true });
        return res.send("OK");
      }
    } catch (err) {}
  }
  res.status(401).send("Invalid token");
});

app.get("/logout", (req, res) => {
  const token = req.cookies.token;
  if (token) {
    let tokens = readTokens();
    tokens = tokens.filter((t) => t !== token);
    writeTokens(tokens);
    res.clearCookie("token");
    res.send(`
      <html>
        <body>
          <p>Logout successful! Redirecting...</p>
          <iframe src="http://localhost:3001/sso-logout?token=${token}" style="display:none;"></iframe>
          <script>
            setTimeout(() => window.location.href = "/", 1000);
          </script>
        </body>
      </html>
    `);
  } else {
    res.redirect("/");
  }
});

app.get("/sso-logout", (req, res) => {
  const token = req.query.token;
  if (token) {
    let tokens = readTokens();
    tokens = tokens.filter((t) => t !== token);
    writeTokens(tokens);
    res.clearCookie("token");
    res.send("OK");
  } else {
    res.status(400).send("Token required");
  }
});

app.listen(port, () => {
  console.log(`${pageName} running on http://localhost:${port}`);
});
