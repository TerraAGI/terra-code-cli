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
```

### 🔄 Multi-Model Intelligence

```bash
# Cross-model comparisons
terra> /compare "Explain dependency injection" --models qwen,gpt-4,claude

# Auto-enhanced responses (automatic - no command needed)
# AI automatically uses your brain's knowledge in every response
```

## Commands Reference

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
