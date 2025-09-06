# Terra Code

**The AI-powered development companion with persistent memory and knowledge.**

## 🧠 What Makes Terra Unique

Terra isn't just another AI coding assistant. It's a **comprehensive development brain** that:

### **🔗 Builds Your Knowledge Universe**

- **Upload any document**: READMEs, architecture docs, API specs, deployment guides
- **Capture team knowledge**: Interactive KT sessions with senior developers
- **Remember across projects**: Your org-level patterns, standards, and learnings

### **🚀 Enhanced AI Responses**

- **Context-aware**: AI automatically uses your uploaded knowledge in every response
- **Project-specific**: Knows your codebase, patterns, and architectural decisions
- **Continuous learning**: Gets smarter as you feed it more information

### **💾 Persistent Memory**

- **Personal preferences**: "I prefer TypeScript", "Use async/await over Promises"
- **Team standards**: Code style, deployment processes, review guidelines
- **Cross-session continuity**: Never lose context between conversations

### **🔄 Multi-Model Support**

- **Compare responses**: Get answers from multiple AI models simultaneously
- **Best of both worlds**: Leverage strengths of different models for different tasks

---

## Quick Start

### Installation

```bash
npm install -g terra-code-cli
```

### 🧠 Development Brain

```bash
# Upload documents to your brain
terra> /brain upload README.md
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

### 🔄 Multi-Model Intelligence

```bash
# Cross-model comparisons
terra> /compare "Explain dependency injection" --models qwen,gpt-4,claude

# Auto-enhanced responses (automatic - no command needed)
# AI automatically uses your brain's knowledge in every response
```

## Configuration

### VoyageAI API Key Setup (for Semantic Search)

To enable semantic code indexing and search features, you need to configure your VoyageAI API key. This allows Terra to create embeddings of your codebase for intelligent search capabilities.

**🎁 Free Tier**: VoyageAI offers **200M tokens free** when you add a payment method, providing generous capacity for large codebases.

#### User Settings Configuration

Edit your existing user settings file:

**Windows:**
```bash
# Navigate to your user directory
cd %USERPROFILE%\.terra

# Edit the existing settings.json file
notepad settings.json
```

**Windows PowerShell:**
```powershell
# Navigate to your user directory
cd $env:USERPROFILE\.terra

# Edit the existing settings.json file
notepad settings.json
```

**macOS/Linux:**
```bash
# Navigate to your home directory
cd ~/.terra

# Edit the existing settings.json file
nano settings.json
```

**Add the semantic configuration to your existing settings:**
```json
{
  "selectedAuthType": "qwen-oauth",
  "terraApiKey": "your-terra-api-key",
  "terraUsername": "your-terra-username",
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

**Note**: If you don't have a settings file yet, create it with just the semantic configuration above.

#### Getting Your VoyageAI API Key

1. Visit [VoyageAI](https://www.voyageai.com/)
2. Sign up for an account
3. **Add a payment method** to get **200M tokens free** with higher rate limits
4. Navigate to your API keys section
5. Generate a new API key
6. Copy the key and use it in your configuration

**💡 Pro Tip**: Adding a payment method unlocks VoyageAI's generous free tier with 200M tokens, providing ample capacity for semantic indexing of large codebases.

#### Verify Configuration

After setting up your API key, restart Terra and test semantic indexing:

```bash
# Check if semantic features are available
terra> /semantic status

# Index your current project
terra> /semantic index .
```

---

### Core Commands

- **`/help`** - Show available commands
- **`/tools`** - List available tools
- **`/theme`** - Change the CLI theme
- **`/clear`** - Clear conversation history
- **`/compress`** - Compress conversation to save tokens

### Brain Commands (Priority)

- **`/brain upload <file>`** - Upload document to your brain
- **`/brain kt`** - Interactive Knowledge Transfer session
- **`/brain remember <fact>`** - Remember personal facts and preferences
- **`/compare <prompt> --models <list>`** - Compare responses across models

### Semantic Analysis Commands (Optional)

- **`/semantic index <project-path>`** - Index project for semantic search
- **`/semantic status`** - Check semantic analysis status

**Note**: Semantic analysis requires VoyageAI API key configuration. See Configuration section above.
