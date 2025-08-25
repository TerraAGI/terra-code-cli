# KT (Knowledge Transfer) Commands

The Terra CLI provides interactive commands for collecting knowledge from developers and team leads through conversational sessions. This allows teams to capture valuable expertise and make it searchable in the knowledge base.

## Overview

The KT system enables developers and team leads to share their knowledge in a natural, conversational way. The entire conversation is recorded and automatically uploaded to the vector database, making it searchable for other team members.

## Commands

### `/vector kt`

Starts an interactive KT (Knowledge Transfer) collection session.

**Usage:**
```bash
/vector kt
```

**What it does:**
- Initiates a conversational session for knowledge collection
- Records the entire conversation between the developer and AI
- Provides guidance on what knowledge to share
- Allows for natural, back-and-forth discussion

**Example session:**
```
User: /vector kt
CLI: 🚀 Starting Interactive KT (Knowledge Transfer) Session...

This session will help you collect knowledge from developers and team leads.
The entire conversation will be recorded and uploaded to your KT knowledge base.

Available commands during this session:
• Type "/finish" when you're done sharing knowledge to complete and upload the session
• Type "/cancel" to abort the collection without saving

What knowledge would you like to share with the team?

User: I want to share our deployment process for the microservices
AI: Great! Tell me about your deployment process. What tools do you use?
User: We use Docker containers with Kubernetes...
```

### `/finish`

Completes the current KT session and uploads the conversation to the vector database.

**Usage:**
```bash
/finish
```

**What it does:**
- Summarizes the collected knowledge
- Saves the entire conversation to a formatted text file
- Uploads the file to your personal KT collection in the vector database
- Makes the knowledge searchable for other team members

**Example output:**
```
📝 KT session completed! Saving conversation to "kt_session_username_2024-01-15T10-30-00-000Z.txt"...
✅ Successfully uploaded KT session "kt_session_username_2024-01-15T10-30-00-000Z.txt" to collection "username_kt".

The knowledge you shared has been saved to your team's knowledge base and can now be searched by other team members.
```

### `/cancel`

Cancels the current KT session without saving any knowledge.

**Usage:**
```bash
/cancel
```

**What it does:**
- Aborts the current KT session
- No conversation is saved or uploaded
- Returns to normal CLI operation

**Example output:**
```
❌ KT session cancelled. No knowledge was saved to the database.

You can start a new KT session anytime with /vector kt.
```

## How It Works

1. **Start Session**: Use `/vector kt` to begin a knowledge collection session
2. **Share Knowledge**: Have a natural conversation with the AI about your expertise
3. **Complete Session**: Type `/finish` when you're done sharing
4. **Automatic Upload**: The conversation is automatically formatted and uploaded to your KT collection
5. **Searchable**: Other team members can now search for this knowledge using `/vector search` or `/vector intelligent`

## Best Practices

### For Knowledge Providers (Developers/Team Leads)

- **Be Specific**: Share concrete examples, code snippets, and step-by-step processes
- **Include Context**: Explain why certain approaches were chosen and what alternatives were considered
- **Share Lessons Learned**: Include common pitfalls, troubleshooting tips, and best practices
- **Use Natural Language**: Don't worry about perfect formatting - the AI will help structure the conversation

### For Knowledge Seekers

- **Search Effectively**: Use `/vector search` with specific keywords related to your question
- **Try Intelligent Search**: Use `/vector intelligent` for complex queries that require multiple searches
- **Explore Related Content**: Look at the suggested follow-up queries to discover related knowledge

## Example Use Cases

### Deployment Processes
- CI/CD pipeline configurations
- Environment setup procedures
- Rollback strategies
- Monitoring and alerting setup

### Code Architecture
- Design patterns used in the project
- Database schema decisions
- API design principles
- Testing strategies

### Troubleshooting
- Common error scenarios and solutions
- Performance optimization techniques
- Debugging workflows
- Log analysis patterns

### Team Workflows
- Code review processes
- Release management procedures
- On-call responsibilities
- Knowledge sharing practices

## File Format

When a KT session is completed, the conversation is saved in a structured text format:

```markdown
# Knowledge Transfer Session

Date: 2024-01-15T10:30:00.000Z
Participant: username
Type: Interactive KT Collection

## Conversation Transcript

### Developer/Team Lead

I want to share our deployment process for the microservices...

### AI Assistant

Great! Tell me about your deployment process. What tools do you use?...

### Developer/Team Lead

We use Docker containers with Kubernetes...
```

This format makes the knowledge easily readable and searchable while maintaining the conversational context.

## Integration with Vector Database

All KT sessions are automatically uploaded to your personal collection named `{username}_kt`. This collection can be searched using:

- `/vector search <query>` - Basic search within your KT collection
- `/vector intelligent <query>` - Advanced search with multiple refinement strategies

The AI automatically uses your Terra credentials to ensure all knowledge is properly associated with your account and accessible to your team. 