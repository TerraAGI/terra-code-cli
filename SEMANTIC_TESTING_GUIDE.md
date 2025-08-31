# 🧪 Semantic Integration Testing Guide

## 🎯 **Installation Verification**

### ✅ **Installation Complete**

Your Terra CLI with semantic features has been successfully installed from source!

### 📂 **Data Storage Location**

```
C:\Users\[YourUsername]\.terra-code\semantic\
```

**Files that will be created:**

- `metadata.json` - Code chunk metadata and file information
- `embeddings.json` - Vector embeddings (simplified backend)
- `index.faiss` - FAISS index file (if using FAISS backend)

## 🚀 **Testing Steps**

### **Step 1: Start Terra CLI**

```bash
terra
```

### **Step 2: Enable Semantic Features**

1. In the Terra CLI, type: `/settings`
2. Navigate to "Semantic Analysis" section
3. Enable semantic analysis
4. Add your VoyageAI API key
5. Save settings and restart CLI

### **Step 3: Test Semantic Commands**

#### **Check Status**

```bash
/semantic:status
```

**Expected Output:**

```
Semantic Analysis Status:
✅ Enabled: true
🔑 VoyageAI API Key: Configured
📊 Vector Database: FAISS backend (0 chunks)
📁 Data Directory: C:\Users\[Username]\.terra-code\semantic
```

#### **Index a Project**

```bash
/semantic:index ./your-project-path
```

**Expected Output:**

```
Indexing project: ./your-project-path
📁 Discovering files...
🔍 Processing 15 files...
🧠 Generating embeddings...
💾 Storing in vector database...
✅ Indexed 45 code chunks successfully
```

#### **Search Code**

```bash
/semantic:search "find authentication functions"
```

**Expected Output:**

```
Search Results for "find authentication functions":
1. auth.js:15-25 (similarity: 0.89)
   function authenticateUser(username, password) {
     // authentication logic
   }

2. login.js:8-18 (similarity: 0.85)
   function login(credentials) {
     // login implementation
   }
```

## 🔍 **Verification Commands**

### **Check Data Directory**

```bash
# Windows PowerShell
ls "C:\Users\$env:USERNAME\.terra-code\semantic"

# Check if files exist
Test-Path "C:\Users\$env:USERNAME\.terra-code\semantic\metadata.json"
Test-Path "C:\Users\$env:USERNAME\.terra-code\semantic\embeddings.json"
```

### **View Metadata**

```bash
# View metadata structure
Get-Content "C:\Users\$env:USERNAME\.terra-code\semantic\metadata.json" | ConvertFrom-Json
```

### **Check File Sizes**

```bash
# Check storage usage
Get-ChildItem "C:\Users\$env:USERNAME\.terra-code\semantic" | Select-Object Name, Length
```

## 🎯 **Expected Behavior**

### **First Time Setup**

1. **Data Directory**: Will be created automatically on first use
2. **Backend Selection**: Automatically chooses FAISS if available, falls back to simplified
3. **API Configuration**: Requires VoyageAI API key in settings
4. **Indexing**: Processes files and creates embeddings
5. **Search**: Returns relevant code chunks with similarity scores

### **Performance Indicators**

- **Small Projects** (< 1,000 chunks): Fast indexing and search
- **Medium Projects** (1,000-10,000 chunks): Good performance with FAISS
- **Large Projects** (> 10,000 chunks): Optimal performance with FAISS

## 🛠️ **Troubleshooting**

### **Common Issues**

#### **1. "Semantic features not enabled"**

**Solution**: Enable in `/settings` and add VoyageAI API key

#### **2. "FAISS not available"**

**Solution**: System automatically falls back to simplified backend (same accuracy)

#### **3. "API key not configured"**

**Solution**: Add VoyageAI API key in settings

#### **4. "No search results"**

**Solution**: Index your project first with `/semantic:index`

### **Debug Information**

```bash
# Check CLI version
terra --version

# Check semantic module status
/semantic:status

# View detailed logs (if in debug mode)
terra --debug
```

## 📊 **Success Metrics**

### **✅ Installation Success**

- Terra CLI starts without errors
- `/semantic:status` command works
- Settings show semantic options

### **✅ Configuration Success**

- VoyageAI API key accepted
- Semantic features enabled
- Data directory created

### **✅ Functionality Success**

- Project indexing completes
- Search returns relevant results
- Data persists between sessions

## 🎉 **Ready to Test!**

Your semantic integration is now ready for testing! The system will:

1. **Auto-install FAISS** with the main package
2. **Intelligently choose backend** (FAISS or simplified)
3. **Maintain same accuracy** regardless of backend
4. **Store data locally** in your user directory
5. **Provide Cursor-level search** capabilities

Start with `/semantic:status` to verify everything is working! 🚀
