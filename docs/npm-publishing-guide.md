# NPM Publishing Guide for Terra Code

This guide explains how to correctly publish Terra Code packages to npm, ensuring all packages are properly versioned and published.

## Prerequisites

- Node.js 20+ installed
- npm CLI installed and configured
- Access to the `@terra-code` npm organization
- Proper authentication (`npm login` completed)

## Package Structure

Terra Code uses a monorepo structure with the following packages:

```
packages/
├── cli/          # Main CLI package (@terra-code/terra-code)
├── core/         # Core functionality (@terra-code/terra-code-core)
└── test-utils/   # Test utilities (@terra-code/terra-code-test-utils)
```

## Step-by-Step Publishing Process

### 1. Version Synchronization

**CRITICAL**: All packages must have the same version number before publishing.

Update all package.json files to the target version:

```bash
# Update root package.json
sed -i 's/"version": "0.0.X"/"version": "0.0.Y"/g' package.json

# Update CLI package
sed -i 's/"version": "0.0.X"/"version": "0.0.Y"/g' packages/cli/package.json

# Update core package
sed -i 's/"version": "0.0.X"/"version": "0.0.Y"/g' packages/core/package.json

# Update test-utils package
sed -i 's/"version": "0.0.X"/"version": "0.0.Y"/g' packages/test-utils/package.json
```

**Manual Method** (if sed doesn't work on Windows):

- Open each `package.json` file
- Update the `"version"` field to the target version
- Save all files

### 2. Build the Project

Ensure all packages are built with the new versions:

```bash
npm run build
```

This should show all packages building with the same version number.

### 3. Publish CLI Package

Navigate to the CLI package directory and publish:

```bash
cd packages/cli
npm publish --access public
```

**Expected Output**:

```
📦  @terra-code/terra-code@0.0.Y
+ @terra-code/terra-code@0.0.Y
```

### 4. Publish Core Package

Navigate to the core package directory and publish:

```bash
cd ../core
npm publish --access public
```

**Expected Output**:

```
📦  @terra-code/terra-code-core@0.0.Y
+ @terra-code/terra-code-core@0.0.Y
```

### 5. Verify Global Installation

Return to root directory and test the CLI:

```bash
cd ../..
npm uninstall -g @terra-code/terra-code
npm install -g ./packages/cli
terra --version
```

Should display the new version number.

## Important Notes

### Version Consistency

- **NEVER** publish packages with different versions
- All packages in the monorepo must have identical version numbers
- The esbuild configuration will fail if versions don't match

### Package Dependencies

- CLI package depends on core package
- Core package is independent
- Test-utils package is marked as `"private": true` and should not be published

### Publishing Order

1. **Core package first** (if it has no dependencies)
2. **CLI package second** (depends on core)
3. **Test-utils package** (if needed, but currently private)

### Access Control

- Use `--access public` for all packages
- Ensure you're logged in as the correct npm user (`npm whoami`)

## Troubleshooting

### Version Mismatch Error

```
Error: Version mismatch: CLI version X != Core version Y
```

**Solution**: Update all package.json files to have the same version.

### Permission Denied

```
npm ERR! 403 Forbidden - PUT https://registry.npmjs.org/@terra-code/...
```

**Solution**:

- Check `npm whoami` - should show `terraagi`
- Ensure you have access to the `@terra-code` organization
- Try `npm login` again

### Build Failures

```
Build failed with X errors
```

**Solution**:

- Check for TypeScript compilation errors
- Ensure all dependencies are installed (`npm ci`)
- Verify Node.js version compatibility

### Global Installation Issues

```
terra : The term 'terra' is not recognized
```

**Solution**:

- Always install from CLI package: `npm install -g ./packages/cli`
- Never install from root: `npm install -g .` (root has no bin entry)
- Uninstall and reinstall if needed

## Verification Checklist

After publishing, verify:

- [ ] All packages show the same version in npm registry
- [ ] `terra --version` displays the correct version
- [ ] `terra --help` shows all commands
- [ ] No module loading errors occur
- [ ] Global installation works from any directory

## Local Testing Steps

For developers and contributors who want to test the CLI package locally before publishing, follow these steps to ensure the `terra` command works correctly:

### CLI Package Local Installation

When testing the CLI package from source, you need to install the specific CLI package rather than the root package to ensure the `terra` command is properly created.

1. **Build the packages first:**

   ```bash
   npm run build
   ```

2. **Install the CLI package globally (not the root package):**

   ```bash
   # Navigate to the CLI package directory
   cd packages/cli

   # Install the CLI package globally
   npm install -g .
   ```

3. **Verify the installation:**

   ```bash
   # Check if terra command files were created
   ls "C:\Users\[YourUsername]\AppData\Roaming\npm\terra*"

   # Test the terra command
   terra --help
   ```

### Why This Approach is Necessary

The root package (`@terra-code/terra-code`) doesn't contain the `bin` configuration needed to create the `terra` command. Only the CLI package (`packages/cli`) has the proper configuration:

```json
"bin": {
  "terra": "dist/terra-launcher.js"
}
```

### Troubleshooting Local Installation

If the `terra` command is not recognized after installation:

1. **Check if you installed the wrong package:**

   ```bash
   npm list -g --depth=0
   ```

   Look for `@terra-code/terra-code` (root package) vs `@terra-code/terra-code` (CLI package)

2. **Uninstall and reinstall correctly:**

   ```bash
   npm uninstall -g @terra-code/terra-code
   cd packages/cli
   npm install -g .
   ```

3. **Verify the command files exist:**
   - `terra` (Unix script)
   - `terra.cmd` (Windows command)
   - `terra.ps1` (PowerShell script)

### Alternative: Using npm link

For development purposes, you can also use `npm link` to create a symlink:

```bash
cd packages/cli
npm link
```

This creates a global symlink to your local CLI package, allowing you to test changes without reinstalling.

### Testing Before Publishing

Always test your local build before publishing:

```bash
# 1. Build and install locally
npm run build
cd packages/cli
npm install -g .

# 2. Test the command
terra --version
terra --help

# 3. Test basic functionality
terra -p "Hello, test this command"

# 4. If everything works, proceed with publishing
cd ../..
npm run publish-packages
```

## Example Complete Workflow

```bash
# 1. Update versions (example: to 0.0.20)
# Edit all package.json files manually or use sed

# 2. Build
npm run build

# 3. Publish CLI
cd packages/cli
npm publish --access public

# 4. Publish Core
cd ../core
npm publish --access public

# 5. Test installation
cd ../..
npm uninstall -g @terra-code/terra-code
npm install -g ./packages/cli
terra --version  # Should show 0.0.20
```

## Security Considerations

- Never commit API keys or secrets
- Use `.npmignore` to exclude sensitive files
- Verify package contents before publishing
- Use `npm pack --dry-run` to preview what will be published

## Rollback Procedure

If a bad version is published:

1. **DO NOT** unpublish (npm policy prevents this after 72 hours)
2. Publish a new patch version with fixes
3. Update documentation to reflect the correct version
4. Consider using npm dist-tags for version management

---

**Remember**: Always test locally before publishing, and ensure all packages are built and working correctly with the new version.
