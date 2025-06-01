const express = require("express")
const cors = require("cors")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const { Pool } = require("pg")
require("dotenv").config()
const path = require("path")

const app = express()
// FIXED: Use Render's PORT environment variable
const PORT = process.env.PORT || 3000

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
})

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to database:', err.stack)
  } else {
    console.log('Connected to database successfully')
    release()
  }
})

// Middleware
app.use(cors())
app.use(express.json())

// Serve static files from public directory
app.use(express.static("public"))

// Root route - serve login page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"))
})

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    port: PORT,
    env: process.env.NODE_ENV 
  })
})

// Serve specific HTML files
app.get("/login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"))
})

app.get("/signup.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "signup.html"))
})

app.get("/home.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "home.html"))
})

app.get("/journal.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "journal.html"))
})

app.get("/support.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "support.html"))
})

app.get("/connect.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "connect.html"))
})

app.get("/profile.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "profile.html"))
})

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production"

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    return res.status(401).json({ error: "Access token required" })
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid token" })
    }
    req.user = user
    next()
  })
}

// API Routes

// User Authentication
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields are required" })
    }

    // Check if user exists
    const existingUser = await pool.query("SELECT * FROM users WHERE email = $1", [email])
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "Email already exists" })
    }

    // Hash password
    const saltRounds = 10
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Create user
    const result = await pool.query(
      "INSERT INTO users (name, email, password, join_date) VALUES ($1, $2, $3, NOW()) RETURNING id, name, email, join_date",
      [name, email, hashedPassword],
    )

    const user = result.rows[0]
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" })

    res.status(201).json({
      message: "User created successfully",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        joinDate: user.join_date,
        profileComplete: false,
      },
    })
  } catch (error) {
    console.error("Signup error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" })
    }

    // Find user
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email])
    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Invalid credentials" })
    }

    const user = result.rows[0]

    // Check password
    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) {
      return res.status(400).json({ error: "Invalid credentials" })
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" })

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        age: user.age,
        gender: user.gender,
        bio: user.bio,
        joinDate: user.join_date,
        profileComplete: user.profile_complete,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Profile Management
app.get("/api/profile", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, age, gender, bio, join_date, profile_complete FROM users WHERE id = $1",
      [req.user.userId],
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error("Profile fetch error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.put("/api/profile", authenticateToken, async (req, res) => {
  try {
    const { name, age, gender, bio } = req.body

    const result = await pool.query(
      "UPDATE users SET name = $1, age = $2, gender = $3, bio = $4, profile_complete = true WHERE id = $5 RETURNING id, name, email, age, gender, bio, join_date, profile_complete",
      [name, age, gender, bio, req.user.userId],
    )

    res.json({
      message: "Profile updated successfully",
      user: result.rows[0],
    })
  } catch (error) {
    console.error("Profile update error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Mood Tracking
app.post("/api/moods", authenticateToken, async (req, res) => {
  try {
    const { emoji, mood, date } = req.body

    await pool.query(
      "INSERT INTO moods (user_id, emoji, mood, mood_date, created_at) VALUES ($1, $2, $3, $4, NOW()) ON CONFLICT (user_id, mood_date) DO UPDATE SET emoji = $2, mood = $3, created_at = NOW()",
      [req.user.userId, emoji, mood, date],
    )

    res.json({ message: "Mood saved successfully" })
  } catch (error) {
    console.error("Mood save error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.get("/api/moods", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM moods WHERE user_id = $1 ORDER BY mood_date DESC", [req.user.userId])
    res.json(result.rows)
  } catch (error) {
    console.error("Moods fetch error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Gratitude Entries
app.post("/api/gratitudes", authenticateToken, async (req, res) => {
  try {
    const { text, date } = req.body

    await pool.query("INSERT INTO gratitudes (user_id, text, gratitude_date, created_at) VALUES ($1, $2, $3, NOW())", [
      req.user.userId,
      text,
      date,
    ])

    res.json({ message: "Gratitude saved successfully" })
  } catch (error) {
    console.error("Gratitude save error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.get("/api/gratitudes", authenticateToken, async (req, res) => {
  try {
    const { date } = req.query
    let query = "SELECT * FROM gratitudes WHERE user_id = $1"
    const params = [req.user.userId]

    if (date) {
      query += " AND gratitude_date = $2"
      params.push(date)
    }

    query += " ORDER BY created_at DESC"

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    console.error("Gratitudes fetch error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Journal Entries
app.post("/api/journal", authenticateToken, async (req, res) => {
  try {
    const { content, category, isPublic } = req.body

    const result = await pool.query(
      "INSERT INTO journal_entries (user_id, content, category, is_public, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *",
      [req.user.userId, content, category, isPublic],
    )

    res.status(201).json({
      message: "Journal entry saved successfully",
      entry: result.rows[0],
    })
  } catch (error) {
    console.error("Journal save error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.get("/api/journal", authenticateToken, async (req, res) => {
  try {
    const { category } = req.query
    let query =
      "SELECT j.*, u.name as user_name FROM journal_entries j JOIN users u ON j.user_id = u.id WHERE j.user_id = $1"
    const params = [req.user.userId]

    if (category) {
      query += " AND j.category = $2"
      params.push(category)
    }

    query += " ORDER BY j.created_at DESC"

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    console.error("Journal fetch error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.delete("/api/journal/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    const result = await pool.query("DELETE FROM journal_entries WHERE id = $1 AND user_id = $2", [id, req.user.userId])

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Journal entry not found" })
    }

    res.json({ message: "Journal entry deleted successfully" })
  } catch (error) {
    console.error("Journal delete error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Public Journal Entries (Support Group)
app.get("/api/journal/public", authenticateToken, async (req, res) => {
  try {
    const { category, search } = req.query
    let query =
      "SELECT j.*, u.name as user_name FROM journal_entries j JOIN users u ON j.user_id = u.id WHERE j.is_public = true"
    const params = []
    let paramCount = 0

    if (category) {
      paramCount++
      query += ` AND j.category = $${paramCount}`
      params.push(category)
    }

    if (search) {
      paramCount++
      query += ` AND (j.content ILIKE $${paramCount} OR j.category ILIKE $${paramCount})`
      params.push(`%${search}%`)
    }

    query += " ORDER BY j.created_at DESC"

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    console.error("Public journal fetch error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// User Connections
app.get("/api/users", authenticateToken, async (req, res) => {
  try {
    const { gender, search } = req.query
    let query = "SELECT id, name, age, gender, bio, join_date FROM users WHERE id != $1 AND profile_complete = true"
    const params = [req.user.userId]
    let paramCount = 1

    if (gender) {
      paramCount++
      query += ` AND gender = $${paramCount}`
      params.push(gender)
    }

    if (search) {
      paramCount++
      query += ` AND name ILIKE $${paramCount}`
      params.push(`%${search}%`)
    }

    query += " ORDER BY join_date DESC"

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    console.error("Users fetch error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.post("/api/connections/request", authenticateToken, async (req, res) => {
  try {
    const { targetUserId } = req.body

    await pool.query(
      "INSERT INTO friend_requests (requester_id, target_id, created_at) VALUES ($1, $2, NOW()) ON CONFLICT (requester_id, target_id) DO NOTHING",
      [req.user.userId, targetUserId],
    )

    res.json({ message: "Friend request sent successfully" })
  } catch (error) {
    console.error("Friend request error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.get("/api/connections/requests", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT target_id FROM friend_requests WHERE requester_id = $1", [req.user.userId])
    res.json(result.rows.map((row) => row.target_id))
  } catch (error) {
    console.error("Friend requests fetch error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Statistics
app.get("/api/stats", authenticateToken, async (req, res) => {
  try {
    const [journalCount, moodCount, gratitudeCount, totalUsers] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM journal_entries WHERE user_id = $1", [req.user.userId]),
      pool.query("SELECT COUNT(*) FROM moods WHERE user_id = $1", [req.user.userId]),
      pool.query("SELECT COUNT(*) FROM gratitudes WHERE user_id = $1", [req.user.userId]),
      pool.query("SELECT COUNT(*) FROM users WHERE profile_complete = true"),
    ])

    const friendRequestsCount = await pool.query("SELECT COUNT(*) FROM friend_requests WHERE requester_id = $1", [
      req.user.userId,
    ])

    res.json({
      journalEntries: parseInt(journalCount.rows[0].count),
      moodEntries: parseInt(moodCount.rows[0].count),
      gratitudeEntries: parseInt(gratitudeCount.rows[0].count),
      totalUsers: parseInt(totalUsers.rows[0].count) - 1, // Exclude current user
      friendRequests: parseInt(friendRequestsCount.rows[0].count),
    })
  } catch (error) {
    console.error("Stats fetch error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// API Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() })
})

// Catch-all handler for SPA routing
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"))
})

// FIXED: Start server with proper host binding for Render
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`)
})

// Handle server errors
server.on('error', (err) => {
  console.error('Server error:', err)
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`)
  }
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  server.close(() => {
    console.log('Process terminated')
    pool.end()
  })
})

module.exports = app
