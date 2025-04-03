const express = require("express");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const bodyParser = require("body-parser");
const path = require("path");
const app = express();
const port = 3002;
const pageName = "Page 2";
const secretPath = path.join(
  __dirname,
  process.env.NODE_ENV === "production" ? "shared/secret.key" : "secret.key"
);
const secret = fs.readFileSync(secretPath, "utf8");
const tokensPath = path.join(
  __dirname,
  process.env.NODE_ENV === "production" ? "shared/tokens.json" : "tokens.json"
);
const otherServerUrl =
  process.env.NODE_ENV === "production"
    ? "http://server1:3001"
    : "http://localhost:3001";

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));

function readTokens() {
  try {
    return JSON.parse(fs.readFileSync(tokensPath, "utf8"));
  } catch (err) {
    return [];
  }
}

function writeTokens(tokens) {
  fs.writeFileSync(tokensPath, JSON.stringify(tokens), "utf8");
}

app.get("/", (req, res) => {
  const token = req.cookies.token;
  let authContent;

  try {
    if (token && jwt.verify(token, secret) && readTokens().includes(token)) {
      authContent = `Welcome to ${pageName}! <a href="/logout">Logout</a>`;
    }
  } catch (e) {}

  res.send(`
    ${
      authContent || `<a href="/login">Login</a> | <a href="/signup">Signup</a>`
    }
    <script>
      let lastAuth = ${!!token};
      setInterval(() => fetch('/check-auth')
        .then(r => r.json())
        .then(({ authenticated }) => {
          if (authenticated !== lastAuth) {
            lastAuth = authenticated;
            location.reload();
          }
        }), 2000);
    </script>
  `);
});

app.get("/login", (req, res) =>
  res.send(`
  <form action="/login" method="post">
    <input name="username" placeholder="Username" required>
    <input type="password" name="password" placeholder="Password" required>
    <button>Login</button>
  </form><a href="/signup">Signup</a>
`)
);

app.get("/signup", (req, res) =>
  res.send(`
  <form action="/signup" method="post">
    <input name="username" placeholder="Username" required>
    <input type="password" name="password" placeholder="Password" required>
    <button>Signup</button>n   
  </form><a href="/login">Login</a>
`)
);

app.post("/login", (req, res) => handleAuth(req, res, "login"));
app.post("/signup", (req, res) => handleAuth(req, res, "signup"));

function handleAuth(req, res, action) {
  const { username, password } = req.body;
  const token = jwt.sign({ username }, secret, { expiresIn: "1h" });
  const tokens = readTokens();

  tokens.push(token);
  writeTokens(tokens);

  res.cookie("token", token, { httpOnly: true }).send(`
      <script>
        fetch('${otherServerUrl}/sso-login?token=${token}', {
          credentials: 'include'
        })
        .then(() => {
          console.log('SSO login successful');
          window.location.href = '/';
        })
        .catch(error => {
          console.error('SSO login error:', error);
          // Redirect anyway, even if the other server login fails
          window.location.href = '/';
        });
      </script>
    `);
}

app.get("/check-auth", (req, res) => {
  try {
    const token = req.cookies.token;
    const valid =
      token && readTokens().includes(token) && jwt.verify(token, secret);
    return res.json({ authenticated: !!valid });
  } catch (e) {
    res.json({ authenticated: false });
  }
});

app.get("/sso-login", (req, res) => {
  const token = req.query.token;
  if (token && readTokens().includes(token)) {
    res.cookie("token", token, { httpOnly: true }).send("OK");
  } else {
    res.status(401).send("Invalid token");
  }
});

app.get("/sso-logout", (req, res) => res.clearCookie("token").send("OK"));

app.get("/logout", (req, res) => {
  const token = req.cookies.token;
  if (token) {
    let tokens = readTokens();
    tokens = tokens.filter((t) => t !== token);
    writeTokens(tokens);
    res.clearCookie("token");
  }
  res.send(`
      <script>
        fetch('${otherServerUrl}/sso-logout', {
          credentials: 'include'
        })
        .then(() => {
          console.log('SSO logout successful');
          window.location.href = '/';
        })
        .catch(error => {
          console.error('SSO logout error:', error);
          // Redirect anyway, even if the other server logout fails
          window.location.href = '/';
        });
      </script>
    `);
});

app.listen(port, () =>
  console.log(`${pageName} running on http://localhost:${port}`)
);
