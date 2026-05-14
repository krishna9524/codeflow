# 🚀 CodeFlow

> Real-Time Competitive Coding & Social Collaboration Platform

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Express.js-404D59?style=for-the-badge" />
  <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" />
  <img src="https://img.shields.io/badge/WebSockets-010101?style=for-the-badge&logo=socketdotio&logoColor=white" />
  <img src="https://img.shields.io/badge/TailwindCSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
</p>

---

# 📌 Overview

CodeFlow is a full-stack real-time competitive coding and social collaboration platform built for developers to solve problems, interact live, and collaborate efficiently.

It supports:

- ⚡ Real-time code execution
- 💬 Live chat using WebSockets
- 🧠 Competitive coding environment
- 👨‍💼 Admin management system
- 📸 Image uploads
- 🔐 Secure authentication
- 🚀 Optimized backend performance with Redis caching

---

# ✨ Features

## 💻 Real-Time Code Execution
- Secure code execution using Node.js child processes
- Sandboxed execution environment
- Timeout control to prevent infinite loops
- Multi-user support

## ⚡ Real-Time Communication
- Live messaging with WebSockets
- Instant updates without refresh
- Real-time interactions across users

## 👨‍💼 Admin Dashboard
- User management
- Content moderation
- Protected admin routes

## 📸 Image Uploads
- Upload profile images and content
- Backend file handling support
- Cloudinary-ready structure

## 🧠 Redis Caching
- Integrated Upstash Redis
- Reduced MongoDB database reads
- Improved backend performance and scalability

## 🔐 Authentication & Security
- JWT-based authentication
- Protected APIs
- Environment variable protection
- Secure backend architecture

---

# 🏗️ Tech Stack

| Category | Technologies |
|----------|--------------|
| Frontend | Next.js, React.js, Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | MongoDB |
| Caching | Redis (Upstash) |
| Real-Time | WebSockets, Socket.io |
| Deployment | Vercel, Render |
| Authentication | JWT |

---

# 🧩 System Architecture

```text
                    ┌─────────────────┐
                    │     Client      │
                    │   Next.js App   │
                    └────────┬────────┘
                             │
                   HTTP / WebSockets
                             │
              ┌──────────────▼──────────────┐
              │        Node.js Server       │
              │   Express + Socket.io       │
              └───────┬───────────┬─────────┘
                      │           │
                      │           │
          ┌───────────▼───┐   ┌──▼───────────┐
          │   MongoDB     │   │ Upstash Redis│
          │ Persistent DB │   │   Caching    │
          └───────────────┘   └──────────────┘
```

---

# ⚙️ Installation

## 1️⃣ Clone Repository

```bash
git clone https://github.com/krishna9524/codeflow.git
cd codeflow
```

---

## 2️⃣ Install Frontend Dependencies

```bash
cd frontend
npm install
```

---

## 3️⃣ Install Backend Dependencies

```bash
cd ../codeflow-backend
npm install
```

---

# 🔑 Environment Variables

Create a `.env` file inside `codeflow-backend/`

```env
PORT=5000

MONGO_URI=your_mongodb_uri

JWT_SECRET=your_jwt_secret

REDIS_URL=your_upstash_redis_url

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

# ▶️ Running the Project

## Start Backend

```bash
cd codeflow-backend
npm run dev
```

## Start Frontend

```bash
cd frontend
npm run dev
```

---

# 🚀 Deployment

## Frontend
- Vercel

## Backend
- Render

## Database
- MongoDB Atlas

## Caching
- Upstash Redis

---

# 🚀 Performance Optimizations

✅ Redis caching reduced database reads significantly

✅ Optimized WebSocket event handling

✅ Faster API responses

✅ Lazy loading on frontend

✅ Secure execution timeout protection

---

# 🔒 Security Features

- JWT Authentication
- Protected Routes
- API Validation
- Environment Variable Security
- Secure File Uploads
- Sandboxed Code Execution
- Timeout Protection

---

# 📸 Screenshots

## 🏠 Home Page

```md
(Add Screenshot Here)
```

---

## 💻 Coding Arena

```md
(Add Screenshot Here)
```

---

## 💬 Live Chat

```md
(Add Screenshot Here)
```

---

## 👨‍💼 Admin Dashboard

```md
(Add Screenshot Here)
```

---

# 🧪 Future Improvements

- 🏆 Live coding contests
- 🤖 AI coding assistant
- 🌍 Global leaderboard
- 📱 Mobile responsive enhancements
- ☁️ Kubernetes deployment
- 📹 Video collaboration system
- 🧠 AI-generated coding hints

---

# 🤝 Contributing

Contributions are welcome!

```bash
# Fork Repository

# Create Branch
git checkout -b feature-name

# Commit Changes
git commit -m "Added new feature"

# Push Changes
git push origin feature-name
```

Then create a Pull Request 🚀

---

# 👨‍💻 Author

## Krishna

Full Stack Developer passionate about:
- Real-Time Systems
- Scalable Backend Architecture
- AI & System Design
- Competitive Programming

---

# ⭐ Support

If you like this project:

⭐ Star the repository  
🍴 Fork the repository  
📢 Share with developers  

---

<p align="center">
  <b>💻 Built with Passion using Modern Web Technologies 🚀</b>
</p>
