# Terra Code CLI

[![npm version](https://img.shields.io/npm/v/terra-code-cli.svg)](https://www.npmjs.com/package/terra-code-cli)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Node.js Version](https://img.shields.io/node/v/terra-code-cli.svg)](https://nodejs.org/)
[![Downloads](https://img.shields.io/npm/dm/terra-code-cli.svg)](https://www.npmjs.com/package/terra-code-cli)
[![GitHub stars](https://img.shields.io/github/stars/TerraAGI/terra-code-cli.svg)](https://github.com/TerraAGI/terra-code-cli/stargazers)

**The AI-powered development companion with persistent memory and knowledge.**

[Installation](#installation) • [Quick Start](#quick-start) • [Features](#-what-makes-terra-unique) • [Documentation](#documentation) • [Contributing](#contributing)

---

## 🧠 What Makes Terra Unique

Terra isn't just another AI coding assistant. It's a **comprehensive development brain** built on Qwen's powerful foundation that:

### **🔗 Enterprise Knowledge Management**

- **Domain expertise capture**: Upload architecture docs, API specs, deployment guides (supports .txt, .md, .docx, .pdf)
- **Interactive Knowledge Transfer**: Senior developers can teach Terra through structured KT sessions, making it work like an actual tech lead
- **Organization-wide learning**: Remember patterns, standards, and learnings across all projects and teams

### **🚀 Enhanced AI Responses**

- **Context-aware**: AI automatically uses your uploaded knowledge in every response
- **Project-specific**: Knows your codebase, patterns, and architectural decisions
- **Continuous learning**: Gets smarter as you feed it more information

### **🔍 Intelligent Code Analysis**

- **Semantic code search**: Index your entire codebase for lightning-fast, context-aware code discovery
- **Deep code understanding**: Find functions, patterns, and relationships using natural language queries
- **Project-wide insights**: Understand architecture, dependencies, and code patterns across large codebases

### **🔄 Multi-Model Support**

- **Compare responses**: Get answers from multiple AI models simultaneously
- **Best of both worlds**: Leverage strengths of different models for different tasks
- **🚀 Coming Soon**: Native Terra API keys for unified embeddings and LLM access

### **💾 Persistent Memory**

- **Personal preferences**: "I prefer TypeScript", "Use async/await over Promises"
- **Team standards**: Code style, deployment processes, review guidelines
- **Cross-session continuity**: Never lose context between conversations

---

## Installation

### Prerequisites

Ensure you have Node.js version 20 or higher installed.

```bash
curl -qL https://www.npmjs.com/install.sh | sh
```

### Install from npm

```bash
npm install -g @terra-code/terra-code@latest
terra --version
```

### Install from source

```bash
git clone https://github.com/TerraAGI/terra-code-cli.git
cd terra-code-cli
npm install
npm install -g .
```

## Quick Start

```bash
# Start Terra Code CLI
terra

# Example commands
> Explain this codebase structure
> Help me refactor this function
> Generate unit tests for this module
```

### 🧠 Development Brain

```bash
# Upload documents to your brain (supports .txt, .md, .docx, .pdf)
terra> /brain upload online_order_flow.md
✅ Document uploaded successfully to your Terra brain

# Interactive Knowledge Transfer sessions
terra> /brain kt
🧠 Starting Knowledge Transfer session...

# Remember personal facts
terra> /brain remember "I prefer TypeScript over JavaScript"
🧠 Remembering: "I prefer TypeScript over JavaScript"

# Index your codebase for semantic search (requires VoyageAI API key)
terra> /semantic index .
🔍 Starting semantic indexing...
```

## Session Management

Control your token usage with configurable session limits to optimize costs and performance.

### Configure Session Token Limit

Create or edit `.terra/settings.json` in your home directory:

```json
{
  "sessionTokenLimit": 32000
}
```

### Session Commands

- **`/compress`** - Compress conversation history to continue within token limits
- **`/clear`** - Clear all conversation history and start fresh
- **`/stats`** - Check current token usage and limits

> 📝 **Note**: Session token limit applies to a single conversation, not cumulative API calls.

## Authorization

Choose your preferred authentication method based on your needs:

### 1. Qwen OAuth (🚀 Recommended - Start in 30 seconds)

The easiest way to get started - completely free with generous quotas:

```bash
# Just run this command and follow the browser authentication
terra
```

**What happens:**
- **Instant Setup**: CLI opens your browser automatically
- **One-Click Login**: Authenticate with your qwen.ai account
- **Automatic Management**: Credentials cached locally for future use
- **No Configuration**: Zero setup required - just start coding!

**Free Tier Benefits:**
- ✅ 2,000 requests/day (no token counting needed)
- ✅ 60 requests/minute rate limit
- ✅ Automatic credential refresh
- ✅ Zero cost for individual users

ℹ️ **Note**: Model fallback may occur to maintain service quality

### 2. OpenAI-Compatible API

Use API keys for OpenAI or other compatible providers:

#### Configuration Methods

**User Settings File (Recommended)**
Add to `~/.terra/settings.json`:
```json
{
  "openaiApiKey": "your_api_key_here",
  "openaiBaseUrl": "your_api_endpoint",
  "openaiModel": "your_model_choice"
}
```

**Environment Variables**
```bash
export OPENAI_API_KEY="your_api_key_here"
export OPENAI_BASE_URL="your_api_endpoint"
export OPENAI_MODEL="your_model_choice"
```

**Windows PowerShell:**
```powershell
$env:OPENAI_API_KEY="your_api_key_here"
$env:OPENAI_BASE_URL="your_api_endpoint"
$env:OPENAI_MODEL="your_model_choice"
```



#### Quick Start Example

**Method 1: User Settings File (Recommended)**
Add to `~/.terra/settings.json`:
```json
{
  "openaiApiKey": "sk-or-v1-your-key-here",
  "openaiBaseUrl": "https://openrouter.ai/api/v1",
  "openaiModel": "qwen/qwen3-coder"
}
```
Then run: `terra`

**Method 2: Environment Variables**
```bash
# Set environment variables
export OPENAI_API_KEY="sk-or-v1-your-key-here"
export OPENAI_BASE_URL="https://openrouter.ai/api/v1"
export OPENAI_MODEL="qwen/qwen3-coder"

# Start Terra
terra
```

**Windows PowerShell:**
```powershell
$env:OPENAI_API_KEY="sk-or-v1-your-key-here"
$env:OPENAI_BASE_URL="https://openrouter.ai/api/v1"
$env:OPENAI_MODEL="qwen/qwen3-coder"
terra
```

#### API Provider Options

⚠️ **Regional Notice:**
- **Mainland China**: Use Alibaba Cloud Bailian or ModelScope
- **International**: Use Alibaba Cloud ModelStudio or OpenRouter

#### 🇨🇳 For Users in Mainland China

**Option 1: Alibaba Cloud Bailian** ([Apply for API Key](https://bailian.console.aliyun.com/))
```bash
export OPENAI_API_KEY="your_api_key_here"
export OPENAI_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"
export OPENAI_MODEL="qwen3-coder-plus"
```

**Option 2: ModelScope (Free Tier)** ([Apply for API Key](https://modelscope.cn/))
- ✅ 2,000 free API calls per day
- ⚠️ Connect your Aliyun account to avoid authentication errors
```bash
export OPENAI_API_KEY="your_api_key_here"
export OPENAI_BASE_URL="https://api-inference.modelscope.cn/v1"
export OPENAI_MODEL="Qwen/Qwen3-Coder-480B-A35B-Instruct"
```

#### 🌍 For International Users

**Option 1: Alibaba Cloud ModelStudio** ([Apply for API Key](https://dashscope.console.aliyun.com/))
```bash
export OPENAI_API_KEY="your_api_key_here"
export OPENAI_BASE_URL="https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
export OPENAI_MODEL="qwen3-coder-plus"
```

**Option 2: OpenRouter (Free Tier Available)** ([Apply for API Key](https://openrouter.ai/))
```bash
export OPENAI_API_KEY="your_api_key_here"
export OPENAI_BASE_URL="https://openrouter.ai/api/v1"
export OPENAI_MODEL="qwen/qwen3-coder:free"
```

### 3. VoyageAI API Key Setup when free creds  (for Semantic Search)

To enable semantic code indexing and search features, configure your VoyageAI API key:

**🎁 Free Tier**: VoyageAI offers **200M tokens free** when you add a payment method.

**🚀 Coming Soon**: Terra will support its own API keys for embeddings and LLMs, providing a unified experience.

#### User Settings Configuration

Edit your existing user settings file:

**Windows:**
```bash
cd %USERPROFILE%\.terra
notepad settings.json
```

**macOS/Linux:**
```bash
cd ~/.terra
nano settings.json
```

**Add the semantic configuration:**
```json
{
  "semantic": {
    "enabled": true,
    "voyageAI": {
      "apiKey": "your-voyageai-api-key-here",
      "model": "voyage-code-3",
      "baseURL": "https://api.voyageai.com/v1"
    }
  }
}
```

#### Getting Your VoyageAI API Key

1. Visit [VoyageAI](https://www.voyageai.com/)
2. Sign up for an account
3. **Add a payment method** to get **200M tokens free**
4. Generate a new API key
5. Copy the key and use it in your configuration

#### Verify Configuration

```bash
# Check if semantic features are available
terra> /semantic status

# Index your current project
terra> /semantic index .
```

## Usage Examples

### 🔍 Explore Codebases

```bash
cd your-project/
terra

# Architecture analysis
> Describe the main pieces of this system's architecture
> What are the key dependencies and how do they interact?
> Find all API endpoints and their authentication methods
```

### 💻 Code Development

```bash
# Refactoring
> Refactor this function to improve readability and performance
> Convert this class to use dependency injection
> Split this large module into smaller, focused components

# Code generation
> Create a REST API endpoint for user management
> Generate unit tests for the authentication module
> Add error handling to all database operations
```

### 🔄 Automate Workflows

```bash
# Git automation
> Analyze git commits from the last 7 days, grouped by feature
> Create a changelog from recent commits
> Find all TODO comments and create GitHub issues

# File operations
> Convert all images in this directory to PNG format
> Rename all test files to follow the *.test.ts pattern
> Find and remove all console.log statements
```

### 🐛 Debugging & Analysis

```bash
# Performance analysis
> Identify performance bottlenecks in this React component
> Find all N+1 query problems in the codebase

# Security audit
> Check for potential SQL injection vulnerabilities
> Find all hardcoded credentials or API keys
```

## Popular Tasks

### 📚 Understand New Codebases

```
> What are the core business logic components?
> What security mechanisms are in place?
> How does the data flow through the system?
> What are the main design patterns used?
> Generate a dependency graph for this module
```

### 🔨 Code Refactoring & Optimization

```
> What parts of this module can be optimized?
> Help me refactor this class to follow SOLID principles
> Add proper error handling and logging
> Convert callbacks to async/await pattern
> Implement caching for expensive operations
```

### 📝 Documentation & Testing

```
> Generate comprehensive JSDoc comments for all public APIs
> Write unit tests with edge cases for this component
> Create API documentation in OpenAPI format
> Add inline comments explaining complex algorithms
> Generate a README for this module
```

### 🚀 Development Acceleration

```
> Set up a new Express server with authentication
> Create a React component with TypeScript and tests
> Implement a rate limiter middleware
> Add database migrations for new schema
> Configure CI/CD pipeline for this project
```

## Commands & Shortcuts

### Core Commands

- **`/help`** - Display available commands
- **`/tools`** - List available tools
- **`/theme`** - Change the CLI theme
- **`/clear`** - Clear conversation history
- **`/compress`** - Compress conversation to save tokens
- **`/stats`** - Show current session information
- **`/exit`** or **`/quit`** - Exit Terra Code CLI

### Brain Commands (Priority)

- **`/brain upload <file>`** - Upload document to your brain (supports .txt, .md, .docx, .pdf)
- **`/brain kt`** - Interactive Knowledge Transfer session
- **`/brain remember <fact>`** - Remember personal facts and preferences

### Semantic Analysis Commands (Optional)

- **`/semantic index <project-path>`** - Index project for semantic search
- **`/semantic status`** - Check semantic analysis status

### Keyboard Shortcuts

- **`Ctrl+C`** - Cancel current operation
- **`Ctrl+D`** - Exit (on empty line)
- **`Up/Down`** - Navigate command history

> 📝 **Note**: Semantic analysis requires VoyageAI API key configuration. See Authorization section above.

## Development & Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) to learn how to contribute to the project.

For detailed authentication setup, see the [Authorization](#authorization) section above.

## Troubleshooting

If you encounter issues, check the [troubleshooting guide](docs/troubleshooting.md).

## Acknowledgments

This project is built on the powerful foundation of **Qwen** and **Google Gemini CLI**. We extend our heartfelt gratitude to:

- **Qwen Team**: For providing the robust AI foundation that powers Terra's intelligent capabilities
- **Google Gemini CLI Team**: For the excellent CLI framework that serves as our starting point

Our main contributions focus on enterprise knowledge management, semantic code analysis, and domain-specific adaptations that transform Terra into a comprehensive development brain.

## License

[Apache-2.0](LICENSE)

## Repository

This project is open source and available on GitHub: [https://github.com/TerraAGI/terra-code-cli](https://github.com/TerraAGI/terra-code-cli)

## Website & Support

- **Website**: [https://terra-agi.com/](https://terra-agi.com/)
- **Contact**: [info@terra-agi.com](mailto:info@terra-agi.com)
- **Issues**: [GitHub Issues](https://github.com/TerraAGI/terra-code-cli/issues)

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on how to get started.
