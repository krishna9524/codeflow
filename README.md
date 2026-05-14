<h1 align="center">⚙️ CodeFlow</h1>
<h3 align="center">High-Performance Competitive Coding & Real-Time Execution Platform</h3>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white" alt="WebSockets" />
  <img src="https://img.shields.io/badge/AI-Groq_LLaMA_3-F3702B?style=for-the-badge&logoColor=white" alt="Groq" />
</p>

---

## 🚀 About The Project

**CodeFlow** is a full-stack competitive coding platform designed for scale and speed. Built to evaluate concurrent algorithms efficiently, it provides a seamless, real-time environment for developers to solve Data Structures and Algorithms (DSA) challenges. 

The platform bridges the gap between raw code execution and intelligent learning by integrating a custom sandboxed compilation engine and an AI-powered code analysis assistant.

---

## 🔬 Core Architecture & Features

CodeFlow is engineered with a focus on low-latency data retrieval, secure execution, and intelligent user feedback. 

### 1. Real-Time Code Execution Engine
* **Sandboxed Compilation:** Built a robust, secure code execution engine utilizing Node.js child processes.
* **Resource Management:** Implemented strict memory sandboxing and timeout controls to prevent infinite loops and malicious code execution during concurrent evaluations.
* **Live Socket Communication:** Leveraged WebSockets to stream execution logs, compilation errors, and test-case results back to the client in real-time.

### 2. High-Performance Data Layer
* **Upstash Redis Caching:** Architected a highly reliable in-memory caching layer to manage high-frequency user queries.
* **Optimized Latency:** Powered a weighted recommendation engine using Redis, effectively reducing expensive MongoDB read operations and overall database latency by 60%.
* **Scalable Storage:** Utilized MongoDB for persistent storage of user profiles, complex challenge descriptions, and historical submission metrics.

### 3. AI-Powered Code Analysis
* **Groq & LLaMA 3 Integration:** Embedded an advanced LLM assistant directly into the coding environment.
* **Context-Aware Debugging:** The AI provides real-time bug detection, algorithmic complexity analysis (Time/Space O-notation), and context-aware hints without giving away direct solutions.

### 4. Distributed CI/CD Deployment
* Orchestrated robust, end-to-end CI/CD pipelines to ensure continuous availability.
* Frontend deployed via **Vercel** for optimal edge-network delivery.
* Backend services and WebSocket servers deployed on **Render** for reliable, zero-downtime automated updates.

---

## 🛠️ Local Development Setup

To run CodeFlow locally, you will need to start both the Next.js frontend and the Node.js backend environments.

### Prerequisites
* Node.js (v18+)
* MongoDB instance (Local or Atlas)
* Upstash Redis connection URL
* Groq API Key

### Backend Setup (`/codeflow-backend`)
```bash
# Navigate to the backend directory
cd codeflow-backend

# Install dependencies
npm install

# Set up your environment variables
# Create a .env file and add your MongoDB URI, Redis URL, and JWT secrets
cp .env.example .env

# Start the Node.js / Socket server
npm run dev

# Navigate to the frontend directory
cd codeflow

# Install dependencies
npm install

# Set up your frontend environment variables (API URLs, Groq API Key)
cp .env.local.example .env.local

# Start the Next.js development server
npm run dev
