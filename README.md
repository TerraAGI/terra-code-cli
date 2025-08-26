# Terra Code

<div align="center">

![Terra Code Screenshot](./docs/assets/terra-screenshot.png)

[![npm version](https://img.shields.io/npm/v/@terra-code/terra-code.svg)](https://www.npmjs.com/package/@terra-code/terra-code)
[![License](https://img.shields.io/github/license/terra-code/terra-code.svg)](./LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![Downloads](https://img.shields.io/npm/dm/@terra-code/terra-code.svg)](https://www.npmjs.com/package/@terra-code/terra-code)

**AI-powered command-line workflow tool for developers**

[Installation](#installation) • [Quick Start](#quick-start) • [Features](#key-features) • [Documentation](./docs/) • [Contributing](./CONTRIBUTING.md)

</div>

<div align="center">
  
  <!-- Keep these links. Translations will automatically update with the README. -->
  <a href="https://readme-i18n.com/de/terra-code/terra-code">Deutsch</a> | 
  <a href="https://readme-i18n.com/es/terra-code/terra-code">Español</a> | 
  <a href="https://readme-i18n.com/fr/terra-code/terra-code">français</a> | 
  <a href="https://readme-i18n.com/ja/terra-code/terra-code">日本語</a> | 
  <a href="https://readme-i18n.com/ko/terra-code/terra-code">한국어</a> | 
  <a href="https://readme-i18n.com/pt/terra-code/terra-code">Português</a> | 
  <a href="https://readme-i18n.com/ru/terra-code/terra-code">Русский</a> | 
  <a href="https://readme-i18n.com/zh/terra-code/terra-code">中文</a>
  
</div>

Terra Code is a powerful command-line AI workflow tool adapted from [**Gemini CLI**](https://github.com/google-gemini/gemini-cli) ([details](./README.gemini.md)), specifically optimized for [Qwen3-Coder](https://github.com/QwenLM/Qwen3-Coder) models and enhanced with Terra AGI services. It enhances your development workflow with advanced code understanding, automated tasks, and intelligent assistance.

## 💡 Free Options Available

Get started with Terra Code at no cost using any of these free options:

### 🔥 Qwen OAuth (Recommended)

- **2,000 requests per day** with no token limits
- **60 requests per minute** rate limit
- Simply run `terra` and authenticate with your qwen.ai account
- Automatic credential management and refresh
- **Bonus**: Automatic Terra AGI services activation
- Use `/auth` command to switch to Qwen OAuth if you have initialized with OpenAI compatible mode

### 🌏 Regional Free Tiers

- **Mainland China**: ModelScope offers **2,000 free API calls per day**
- **International**: OpenRouter provides **up to 1,000 free API calls per day** worldwide

For detailed setup instructions, see [Authorization](#authorization).

> [!WARNING]
> **Token Usage Notice**: Terra Code may issue multiple API calls per cycle, resulting in higher token usage (similar to Claude Code). We're actively optimizing API efficiency.

## Key Features

- **Code Understanding & Editing** - Query and edit large codebases beyond traditional context window limits
- **Workflow Automation** - Automate operational tasks like handling pull requests and complex rebases
- **Enhanced Parser** - Adapted parser specifically optimized for Terra-Coder models
- **Terra AGI Services** - Vector database, knowledge base, and enhanced AI capabilities

## Installation

### Prerequisites

Ensure you have [Node.js version 20](https://nodejs.org/en/download) or higher installed.

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
git clone https://github.com/terra-code/terra-code.git
cd terra-code
npm install
npm install -g .
```

## Quick Start

```bash
# Start Terra Code
terra

# Example commands
> Explain this codebase structure
> Help me refactor this function
> Generate unit tests for this module
```

### Session Management

Control your token usage with configurable session limits to optimize costs and performance.

#### Configure Session Token Limit

Create or edit `.terra/settings.json` in your home directory:

```json
{
  "sessionTokenLimit": 32000
}
```

#### Session Commands

- **`/compress`** - Compress conversation history to continue within token limits
- **`/clear`** - Clear all conversation history and start fresh
- **`/stats`** - Check current token usage and limits

> 📝 **Note**: Session token limit applies to a single conversation, not cumulative API calls.

### Authorization

Choose your preferred authentication method based on your needs:

#### 1. Qwen OAuth (🚀 Recommended - Start in 30 seconds)

The easiest way to get started - completely free with generous quotas:

```bash
# Just run this command and follow the browser authentication
terra
```

**What happens:**

1. **Instant Setup**: CLI opens your browser automatically
2. **One-Click Login**: Authenticate with your qwen.ai account
3. **Automatic Management**: Credentials cached locally for future use
4. **Terra Services**: Automatically activates Terra AGI services
5. **No Configuration**: Zero setup required - just start coding!

**Free Tier Benefits:**

- ✅ **2,000 requests/day** (no token counting needed)
- ✅ **60 requests/minute** rate limit
- ✅ **Automatic credential refresh**
- ✅ **Zero cost** for individual users
- ✅ **Terra AGI services** included automatically
- ℹ️ **Note**: Model fallback may occur to maintain service quality

#### 2. OpenAI-Compatible API

Use API keys for OpenAI or other compatible providers:

**Configuration Methods:**

1. **Environment Variables**

   ```bash
   export OPENAI_API_KEY="your_api_key_here"
   export OPENAI_BASE_URL="your_api_endpoint"
   export OPENAI_MODEL="your_model_choice"
   ```

2. **Project `.env` File**
   Create a `.env` file in your project root:
   ```env
   OPENAI_API_KEY=your_api_key_here
   OPENAI_BASE_URL=your_api_endpoint
   OPENAI_MODEL=your_model_choice
   ```

**API Provider Options**

> ⚠️ **Regional Notice:**
>
> - **Mainland China**: Use Alibaba Cloud Bailian or ModelScope
> - **International**: Use Alibaba Cloud ModelStudio or OpenRouter

<details>
<summary><b>🇨🇳 For Users in Mainland China</b></summary>

**Option 1: Alibaba Cloud Bailian** ([Apply for API Key](https://bailian.console.aliyun.com/))

```bash
export OPENAI_API_KEY="your_api_key_here"
export OPENAI_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"
export OPENAI_MODEL="qwen3-coder-plus"
```

**Option 2: ModelScope (Free Tier)** ([Apply for API Key](https://modelscope.cn/docs/model-service/API-Inference/intro))

- ✅ **2,000 free API calls per day**
- ⚠️ Connect your Aliyun account to avoid authentication errors

```bash
export OPENAI_API_KEY="your_api_key_here"
export OPENAI_BASE_URL="https://api-inference.modelscope.cn/v1"
export OPENAI_MODEL="Qwen/Qwen3-Coder-480B-A35B-Instruct"
```

</details>

<details>
<summary><b>🌍 For International Users</b></summary>

**Option 1: Alibaba Cloud ModelStudio** ([Apply for API Key](https://modelstudio.console.alibabacloud.com/))

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

</details>

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

```text
> What are the core business logic components?
> What security mechanisms are in place?
> How does the data flow through the system?
> What are the main design patterns used?
> Generate a dependency graph for this module
```

### 🔨 Code Refactoring & Optimization

```text
> What parts of this module can be optimized?
> Help me refactor this class to follow SOLID principles
> Add proper error handling and logging
> Convert callbacks to async/await pattern
> Implement caching for expensive operations
```

### 📝 Documentation & Testing

```text
> Generate comprehensive API documentation
> Create unit tests for this function
> Write a README for this project
> Document the deployment process
> Create integration tests for this module
```

## Terra AGI Services

Terra Code includes powerful AGI services that enhance your development workflow:

### 🧠 Development Brain

```bash
# Upload documents to your brain
terra> /brain upload README.md
✅ Document uploaded successfully to your Terra brain

# Upload knowledge to your brain  
terra> /brain upload deployment-guide.md
✅ Knowledge uploaded successfully to your Terra brain
```

### 🧠 Enhanced AI Capabilities

```bash
# Cross-model comparisons
terra> /compare "Explain dependency injection" --models qwen,gpt-4,claude

# Knowledge-enhanced responses
terra> /enhance "How do I implement OAuth2?"
🚀 Enhancing response with Terra brain...
```

## Commands Reference

### Core Commands

- **`/help`** - Show available commands
- **`/tools`** - List available tools
- **`/theme`** - Change the CLI theme
- **`/clear`** - Clear conversation history
- **`/compress`** - Compress conversation to save tokens
- **`/stats`** - Show usage statistics
- **`/exit`** or **`/quit`** - Exit Terra Code

### Terra-Specific Commands

- **`/brain upload <file>`** - Upload document to your brain
- **`/brain kt`** - Interactive Knowledge Transfer session
- **`/enhance <prompt>`** - Enhance response with Terra brain
- **`/compare <prompt> --models <list>`** - Compare responses across models

## Performance Benchmarks

| Tool | Model | HumanEval | MBPP | MMLU-Pro |
|------|-------|-----------|------|----------|
| Terra Code | Qwen3-Coder-480A35 | 37.5%    | 42.1% | 68.3%    |
| Terra Code | Qwen3-Coder-30BA3B | 31.3%    | 38.7% | 65.9%    |

*Benchmarks based on standard evaluation metrics. Performance may vary based on specific use cases and configurations.*

## Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details on how to submit pull requests, report issues, and contribute to the project.

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](./LICENSE) file for details.

## Acknowledgments

Terra Code is built upon the excellent work of:
- [Gemini CLI](https://github.com/google-gemini/gemini-cli) - Original CLI framework
- [Qwen3-Coder](https://github.com/QwenLM/Qwen3-Coder) - AI models and user-level adaptations to better support Qwen-Coder models.

---

<div align="center">

[![Star History Chart](https://api.star-history.com/svg?repos=terra-code/terra-code&type=Date)](https://star-history.com/#terra-code/terra-code&Date)

</div>
