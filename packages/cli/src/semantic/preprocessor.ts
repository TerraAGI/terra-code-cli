/**
 * Universal Code Preprocessor
 * Handles file chunking and semantic analysis for ALL text-based files
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { detectFileType } from '@terra-code/terra-code-core';
import { CodeChunk } from './index.js';

export class CodePreprocessor {
  private ignorePatterns: string[];

  constructor() {
    // No longer limited to specific extensions - supports ALL text files
    this.ignorePatterns = [
      // Build and output directories
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/.nuxt/**',
      '**/.output/**',
      '**/out/**',
      '**/target/**',
      '**/bin/**',
      '**/obj/**',
      '**/.build/**',
      '**/build-*/**',
      '**/dist-*/**',
      
      // Version control
      '**/.git/**',
      '**/.svn/**',
      '**/.hg/**',
      
      // IDE and editor files
      '**/.vscode/**',
      '**/.idea/**',
      '**/.vs/**',
      '**/*.swp',
      '**/*.swo',
      '**/*~',
      '**/.DS_Store',
      '**/Thumbs.db',
      
      // Coverage and testing
      '**/coverage/**',
      '**/.nyc_output/**',
      '**/.jest/**',
      '**/.pytest_cache/**',
      '**/__pycache__/**',
      '**/.tox/**',
      '**/.mypy_cache/**',
      
      // Cache directories
      '**/.cache/**',
      '**/.parcel-cache/**',
      '**/.eslintcache',
      '**/.stylelintcache',
      '**/.sass-cache/**',
      '**/.babel-cache/**',
      '**/.webpack/**',
      '**/.rollup/**',
      
      // Temporary directories
      '**/tmp/**',
      '**/temp/**',
      '**/.tmp/**',
      '**/.temp/**',
      
      // Virtual environments and package managers
      '**/venv/**',
      '**/env/**',
      '**/.venv/**',
      '**/.env/**',
      '**/virtualenv/**',
      '**/.virtualenv/**',
      '**/env.bak/**',
      '**/venv.bak/**',
      '**/.python-version',
      '**/.node-version',
      '**/.nvmrc',
      '**/.ruby-version',
      '**/.ruby-gemset',
      
      // Package manager files (lock files, etc.)
      '**/package-lock.json',
      '**/yarn.lock',
      '**/pnpm-lock.yaml',
      '**/Cargo.lock',
      '**/composer.lock',
      '**/Gemfile.lock',
      '**/mix.lock',
      '**/pubspec.lock',
      '**/cabal.project.freeze',
      '**/stack.yaml.lock',
      '**/poetry.lock',
      '**/Pipfile.lock',
      '**/requirements.txt.lock',
      
      // Log files
      '**/*.log',
      '**/*.log.*',
      '**/logs/**',
      '**/.log/**',
      
      // Database files
      '**/*.db',
      '**/*.sqlite',
      '**/*.sqlite3',
      '**/*.db-journal',
      
      // Backup files
      '**/*.bak',
      '**/*.backup',
      '**/*.old',
      '**/*.orig',
      
      // Generated files
      '**/*.min.js',
      '**/*.min.css',
      '**/*.bundle.js',
      '**/*.bundle.css',
      '**/*.chunk.js',
      '**/*.chunk.css',
      '**/generated/**',
      '**/.generated/**',
      
      // Documentation build
      '**/docs/build/**',
      '**/docs/_build/**',
      '**/site/**',
      '**/.site/**',
      
      // Docker and container files
      '**/Dockerfile.prod',
      '**/Dockerfile.dev',
      '**/docker-compose.override.yml',
      '**/.dockerignore',
      
      // CI/CD files
      '**/.github/workflows/**',
      '**/.gitlab-ci.yml',
      '**/.travis.yml',
      '**/.circleci/**',
      '**/.jenkins/**',
      
      // Environment and config files
      '**/.env.local',
      '**/.env.development',
      '**/.env.test',
      '**/.env.production',
      '**/.env.staging',
      '**/config.local.*',
      '**/config.dev.*',
      '**/config.test.*',
      '**/config.prod.*',
      
      // OS generated files
      '**/.fseventsd',
      '**/.Spotlight-V100',
      '**/.Trashes',
      '**/ehthumbs.db',
      '**/Icon?',
      '**/*.lnk',
      
      // Language-specific generated files
      '**/*.pyc',
      '**/*.pyo',
      '**/*.pyd',
      '**/*.so',
      '**/*.dll',
      '**/*.dylib',
      '**/*.class',
      '**/*.jar',
      '**/*.war',
      '**/*.ear',
      '**/*.o',
      '**/*.a',
      '**/*.lib',
      '**/*.exe',
      '**/*.app',
      '**/*.dmg',
      '**/*.pkg',
      '**/*.deb',
      '**/*.rpm',
      '**/*.msi',
      '**/*.zip',
      '**/*.tar.gz',
      '**/*.rar',
      '**/*.7z',
      
      // Large files that shouldn't be indexed
      '**/*.iso',
      '**/*.img',
      '**/*.vmdk',
      '**/*.vdi',
      '**/*.vbox',
      '**/*.ova',
      '**/*.ovf',
      
      // Binary and media files
      '**/*.png',
      '**/*.jpg',
      '**/*.jpeg',
      '**/*.gif',
      '**/*.bmp',
      '**/*.tiff',
      '**/*.ico',
      '**/*.svg',
      '**/*.mp3',
      '**/*.mp4',
      '**/*.avi',
      '**/*.mov',
      '**/*.wmv',
      '**/*.flv',
      '**/*.webm',
      '**/*.pdf',
      '**/*.doc',
      '**/*.docx',
      '**/*.xls',
      '**/*.xlsx',
      '**/*.ppt',
      '**/*.pptx',
      
      // Font files
      '**/*.ttf',
      '**/*.otf',
      '**/*.woff',
      '**/*.woff2',
      '**/*.eot',
      
      // Archive files
      '**/*.zip',
      '**/*.tar',
      '**/*.gz',
      '**/*.bz2',
      '**/*.xz',
      '**/*.7z',
      '**/*.rar',
      
      // Executable files
      '**/*.exe',
      '**/*.msi',
      '**/*.deb',
      '**/*.rpm',
      '**/*.dmg',
      '**/*.pkg',
      '**/*.app',
    ];
  }

  async discoverFiles(projectPath: string): Promise<string[]> {
    // Use universal pattern to find ALL files, then filter by text type
    const allFiles = await glob('**/*', {
        cwd: projectPath,
        absolute: true,
      ignore: this.ignorePatterns,
      nodir: true, // Only files, not directories
    });

    const textFiles: string[] = [];
    let skippedLargeFiles = 0;
    let skippedNonTextFiles = 0;
    
    // Check each file to see if it's a text file and not too large
    for (const filePath of allFiles) {
      try {
        // Check file size first (skip files larger than 1MB)
        const stats = await fs.promises.stat(filePath);
        if (stats.size > 1024 * 1024) { // 1MB limit
          skippedLargeFiles++;
          continue;
        }
        
        const fileType = await detectFileType(filePath);
        if (fileType === 'text') {
          textFiles.push(filePath);
        } else {
          skippedNonTextFiles++;
        }
      } catch (_error) {
        // Skip files that can't be processed
        continue;
      }
    }

    // Store statistics for reporting
    this.lastIndexStats = {
      totalFilesFound: allFiles.length,
      textFilesIndexed: textFiles.length,
      skippedLargeFiles,
      skippedNonTextFiles,
      ignoredByPatterns: allFiles.length - textFiles.length - skippedLargeFiles - skippedNonTextFiles,
    };

    return textFiles;
  }

  // Statistics from the last indexing operation
  private lastIndexStats?: {
    totalFilesFound: number;
    textFilesIndexed: number;
    skippedLargeFiles: number;
    skippedNonTextFiles: number;
    ignoredByPatterns: number;
  };

  getLastIndexStats() {
    return this.lastIndexStats;
  }

  async processFile(
    filePath: string,
    maxChunkSize: number = 1000,
    overlapSize: number = 100,
  ): Promise<CodeChunk[]> {
    const content = await fs.promises.readFile(filePath, 'utf8');
    const language = this.detectLanguage(filePath);

    return this.chunkFile(
      content,
      filePath,
      language,
      maxChunkSize,
      overlapSize,
    );
  }

  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath).toLowerCase();
    
    // Comprehensive language mapping for 50+ programming languages
    const languageMap: Record<string, string> = {
      // JavaScript/TypeScript ecosystem
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.mjs': 'javascript',
      '.cjs': 'javascript',
      
      // Python ecosystem
      '.py': 'python',
      '.pyw': 'python',
      '.pyi': 'python',
      '.pyx': 'python',
      '.pxd': 'python',
      
      // Java ecosystem
      '.java': 'java',
      '.class': 'java',
      '.jar': 'java',
      
      // C/C++ ecosystem
      '.c': 'c',
      '.h': 'c',
      '.cpp': 'cpp',
      '.cc': 'cpp',
      '.cxx': 'cpp',
      '.hpp': 'cpp',
      '.hxx': 'cpp',
      
      // Go
      '.go': 'go',
      
      // Rust
      '.rs': 'rust',
      
      // C#
      '.cs': 'csharp',
      
      // PHP
      '.php': 'php',
      '.phtml': 'php',
      
      // Ruby
      '.rb': 'ruby',
      '.erb': 'ruby',
      
      // Swift
      '.swift': 'swift',
      
      // Kotlin
      '.kt': 'kotlin',
      '.kts': 'kotlin',
      
      // Scala
      '.scala': 'scala',
      
      // Dart
      '.dart': 'dart',
      
      // R
      '.r': 'r',
      '.R': 'r',
      
      // MATLAB
      '.m': 'matlab',
      
      // Julia
      '.jl': 'julia',
      
      // Haskell
      '.hs': 'haskell',
      '.lhs': 'haskell',
      
      // F#
      '.fs': 'fsharp',
      '.fsx': 'fsharp',
      
      // Clojure
      '.clj': 'clojure',
      '.cljs': 'clojure',
      
      // Elixir
      '.ex': 'elixir',
      '.exs': 'elixir',
      
      // Erlang
      '.erl': 'erlang',
      '.hrl': 'erlang',
      
      // OCaml
      '.ml': 'ocaml',
      '.mli': 'ocaml',
      
      // Assembly
      '.asm': 'assembly',
      '.s': 'assembly',
      '.S': 'assembly',
      
      // Shell/Bash
      '.sh': 'bash',
      '.bash': 'bash',
      '.zsh': 'bash',
      '.fish': 'bash',
      
      // PowerShell
      '.ps1': 'powershell',
      '.psm1': 'powershell',
      
      // Batch
      '.bat': 'batch',
      '.cmd': 'batch',
      
      // Makefile
      '.make': 'makefile',
      '.mk': 'makefile',
      
      // CMake
      '.cmake': 'cmake',
      '.cmake.in': 'cmake',
      
      // Docker
      '.dockerfile': 'dockerfile',
      
      // SQL
      '.sql': 'sql',
      
      // HTML/CSS
      '.html': 'html',
      '.htm': 'html',
      '.xhtml': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.sass': 'sass',
      '.less': 'less',
      
      // XML
      '.xml': 'xml',
      '.xsd': 'xml',
      '.xsl': 'xml',
      
      // JSON/YAML/TOML
      '.json': 'json',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.toml': 'toml',
      
      // Markdown
      '.md': 'markdown',
      '.markdown': 'markdown',
      
      // Configuration files
      '.ini': 'ini',
      '.cfg': 'ini',
      '.conf': 'ini',
      '.config': 'ini',
      
      // Lua
      '.lua': 'lua',
      
      // Perl
      '.pl': 'perl',
      '.pm': 'perl',
      '.plx': 'perl',
      
      // Fortran
      '.f': 'fortran',
      '.f90': 'fortran',
      '.f95': 'fortran',
      
      // Ada
      '.adb': 'ada',
      '.ads': 'ada',
      
      // COBOL
      '.cob': 'cobol',
      '.cbl': 'cobol',
      
      // Prolog
      '.pro': 'prolog',
      '.prolog': 'prolog',
      
      // VHDL
      '.vhd': 'vhdl',
      '.vhdl': 'vhdl',
      
      // Verilog
      '.v': 'verilog',
      '.sv': 'verilog',
      
      // TeX/LaTeX
      '.tex': 'latex',
      '.ltx': 'latex',
      
      // Groovy
      '.groovy': 'groovy',
      
      // Nim
      '.nim': 'nim',
      
      // Crystal
      '.cr': 'crystal',
      
      // V
      '.vlang': 'v',
      
      // Zig
      '.zig': 'zig',
      
      // Odin
      '.odin': 'odin',
      
      // Jai
      '.jai': 'jai',
      
      // Carbon
      '.carbon': 'carbon',
      
      // Mojo
      '.mojo': 'mojo',
      '.🔥': 'mojo',
    };
    
    // Check for special file names (like Makefile, Dockerfile, etc.)
    const specialFiles: Record<string, string> = {
      'makefile': 'makefile',
      'dockerfile': 'dockerfile',
      'cmakelists.txt': 'cmake',
      'readme': 'markdown',
      'license': 'text',
      'changelog': 'text',
      'contributing': 'markdown',
      'package.json': 'json',
      'package-lock.json': 'json',
      'yarn.lock': 'yarn-lock',
      'pnpm-lock.yaml': 'yaml',
      'cargo.toml': 'toml',
      'cargo.lock': 'toml',
      'go.mod': 'go-mod',
      'go.sum': 'go-sum',
      'requirements.txt': 'python-requirements',
      'setup.py': 'python',
      'pyproject.toml': 'toml',
      'pom.xml': 'xml',
      'build.gradle': 'groovy',
      'build.gradle.kts': 'kotlin',
      'composer.json': 'json',
      'composer.lock': 'json',
      'gemfile': 'ruby',
      'gemfile.lock': 'ruby',
      'mix.exs': 'elixir',
      'mix.lock': 'elixir',
      'pubspec.yaml': 'yaml',
      'pubspec.lock': 'yaml',
      'cabal.project': 'cabal',
      'stack.yaml': 'yaml',
      'dune': 'dune',
      'dune-project': 'dune',
      'Cargo.toml': 'toml',
      'Cargo.lock': 'toml',
    };
    
    // First check for special file names
    if (specialFiles[fileName]) {
      return specialFiles[fileName];
    }
    
    // Then check for extensions
    if (languageMap[ext]) {
      return languageMap[ext];
    }
    
    // Default to 'text' for any other text file
    return 'text';
  }

  private chunkFile(
    content: string,
    filePath: string,
    language: string,
    maxChunkSize: number,
    overlapSize: number,
  ): CodeChunk[] {
    const lines = content.split('\n');
    const chunks: CodeChunk[] = [];

    for (let i = 0; i < lines.length; i += Math.max(1, maxChunkSize - overlapSize)) {
      const chunkLines = lines.slice(
        i,
        Math.min(i + maxChunkSize, lines.length),
      );
      const chunkContent = chunkLines.join('\n');

      if (chunkContent.trim().length === 0) continue;

      chunks.push({
        id: `${filePath}_${i}`,
        content: chunkContent,
        filePath,
        startLine: i + 1,
        endLine: Math.min(i + maxChunkSize, lines.length),
        language,
        metadata: {
          functionName: this.extractFunctionName(chunkContent, language),
          className: this.extractClassName(chunkContent, language),
          complexity: this.calculateComplexity(chunkContent),
          dependencies: this.extractDependencies(chunkContent, language),
        },
      });
    }

    return chunks;
  }

  private extractFunctionName(
    content: string,
    language: string,
  ): string | undefined {
    // Comprehensive regex-based function extraction for 50+ languages
    const patterns: Record<string, RegExp[]> = {
      javascript: [
        /function\s+(\w+)\s*\(/,
        /const\s+(\w+)\s*=\s*\(/,
        /let\s+(\w+)\s*=\s*\(/,
        /var\s+(\w+)\s*=\s*\(/,
        /(\w+)\s*:\s*function\s*\(/,
        /(\w+)\s*\([^)]*\)\s*=>/,
      ],
      typescript: [
        /function\s+(\w+)\s*\(/,
        /const\s+(\w+)\s*:\s*\w+\s*=\s*\(/,
        /let\s+(\w+)\s*:\s*\w+\s*=\s*\(/,
        /(\w+)\s*\([^)]*\)\s*:\s*\w+\s*=>/,
        /(\w+)\s*\([^)]*\)\s*=>/,
      ],
      python: [
        /def\s+(\w+)\s*\(/,
        /async\s+def\s+(\w+)\s*\(/,
        /class\s+(\w+)\s*\(/,
      ],
      java: [
        /(?:public|private|protected)?\s*(?:static\s+)?\w+\s+(\w+)\s*\(/,
        /(?:public|private|protected)?\s*(?:static\s+)?\w+\[\]\s+(\w+)\s*\(/,
      ],
      cpp: [
        /(?:void|int|string|bool|auto|double|float|char|long|short|unsigned|signed)\s+(\w+)\s*\(/,
        /(?:void|int|string|bool|auto|double|float|char|long|short|unsigned|signed)\s+\w+::(\w+)\s*\(/,
      ],
      go: [
        /func\s+(\w+)\s*\(/,
        /func\s*\(\s*\w+\s+\w+\s*\)\s*(\w+)\s*\(/,
      ],
      rust: [
        /fn\s+(\w+)\s*\(/,
        /impl\s+\w+\s*\{\s*fn\s+(\w+)\s*\(/,
      ],
      csharp: [
        /(?:public|private|protected|internal)?\s*(?:static\s+)?\w+\s+(\w+)\s*\(/,
        /(?:public|private|protected|internal)?\s*(?:static\s+)?\w+\[\]\s+(\w+)\s*\(/,
      ],
      php: [
        /function\s+(\w+)\s*\(/,
        /(?:public|private|protected)?\s*function\s+(\w+)\s*\(/,
        /(?:public|private|protected)?\s*static\s+function\s+(\w+)\s*\(/,
      ],
      ruby: [
        /def\s+(\w+)/,
        /def\s+self\.(\w+)/,
      ],
      swift: [
        /func\s+(\w+)\s*\(/,
        /static\s+func\s+(\w+)\s*\(/,
        /class\s+func\s+(\w+)\s*\(/,
      ],
      kotlin: [
        /fun\s+(\w+)\s*\(/,
        /fun\s+\w+\.(\w+)\s*\(/,
      ],
      scala: [
        /def\s+(\w+)\s*\(/,
        /def\s+(\w+)\s*\[/,
      ],
      dart: [
        /(\w+)\s*\([^)]*\)\s*\{/,
        /static\s+(\w+)\s*\([^)]*\)\s*\{/,
      ],
      r: [
        /(\w+)\s*<-\s*function\s*\(/,
        /(\w+)\s*=\s*function\s*\(/,
      ],
      matlab: [
        /function\s+(\w+)/,
        /function\s+\[[^\]]*\]\s*=\s*(\w+)/,
      ],
      julia: [
        /function\s+(\w+)/,
        /(\w+)\s*\([^)]*\)\s*=/,
      ],
      haskell: [
        /(\w+)\s*::\s*\w+/,
        /(\w+)\s*[^=]*=/,
      ],
      fsharp: [
        /let\s+(\w+)\s*[^=]*=/,
        /member\s+(\w+)\s*[^=]*=/,
      ],
      clojure: [
        /\(defn\s+(\w+)/,
        /\(def\s+(\w+)/,
      ],
      elixir: [
        /def\s+(\w+)/,
        /defp\s+(\w+)/,
      ],
      erlang: [
        /(\w+)\s*\([^)]*\)\s*->/,
      ],
      ocaml: [
        /let\s+(\w+)\s*[^=]*=/,
        /let\s+rec\s+(\w+)\s*[^=]*=/,
      ],
      assembly: [
        /(\w+):/,
        /(\w+)\s+proc/,
      ],
      bash: [
        /(\w+)\s*\(\)\s*\{/,
        /function\s+(\w+)/,
      ],
      powershell: [
        /function\s+(\w+)/,
        /(\w+)\s*\([^)]*\)\s*\{/,
      ],
      batch: [
        /:(\w+)/,
      ],
      makefile: [
        /(\w+):/,
      ],
      cmake: [
        /function\s*\((\w+)/,
        /macro\s*\((\w+)/,
      ],
      dockerfile: [
        /(\w+)\s*\([^)]*\)/,
      ],
      sql: [
        /CREATE\s+FUNCTION\s+(\w+)/,
        /CREATE\s+PROCEDURE\s+(\w+)/,
      ],
      lua: [
        /function\s+(\w+)/,
        /local\s+function\s+(\w+)/,
      ],
      perl: [
        /sub\s+(\w+)/,
      ],
      fortran: [
        /FUNCTION\s+(\w+)/,
        /SUBROUTINE\s+(\w+)/,
      ],
      ada: [
        /procedure\s+(\w+)/,
        /function\s+(\w+)/,
      ],
      cobol: [
        /(\w+)\s+SECTION/,
        /(\w+)\s+PARAGRAPH/,
      ],
      prolog: [
        /(\w+)\s*\([^)]*\)\s*:-/,
      ],
      vhdl: [
        /entity\s+(\w+)/,
        /architecture\s+(\w+)/,
      ],
      verilog: [
        /module\s+(\w+)/,
        /function\s+(\w+)/,
      ],
      latex: [
        /\\newcommand\{\\(\w+)\}/,
        /\\def\\(\w+)/,
      ],
      groovy: [
        /def\s+(\w+)/,
        /(?:public|private|protected)?\s*def\s+(\w+)/,
      ],
      nim: [
        /proc\s+(\w+)/,
        /func\s+(\w+)/,
      ],
      crystal: [
        /def\s+(\w+)/,
      ],
      v: [
        /fn\s+(\w+)/,
        /pub\s+fn\s+(\w+)/,
      ],
      zig: [
        /fn\s+(\w+)/,
        /pub\s+fn\s+(\w+)/,
      ],
      odin: [
        /(\w+)\s*::\s*proc/,
      ],
      jai: [
        /(\w+)\s*::\s*\(/,
      ],
      carbon: [
        /fn\s+(\w+)/,
      ],
      mojo: [
        /fn\s+(\w+)/,
        /struct\s+(\w+)/,
      ],
      text: [
        /(\w+)\s*\([^)]*\)/,
      ],
    };

    const patternsForLanguage = patterns[language] || patterns.text;
    
    for (const pattern of patternsForLanguage) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return undefined;
  }

  private extractClassName(
    content: string,
    language: string,
  ): string | undefined {
    // Comprehensive regex-based class extraction for 50+ languages
    const patterns: Record<string, RegExp[]> = {
      javascript: [
        /class\s+(\w+)/,
        /(\w+)\s*:\s*React\.Component/,
      ],
      typescript: [
        /class\s+(\w+)/,
        /interface\s+(\w+)/,
        /type\s+(\w+)/,
        /enum\s+(\w+)/,
      ],
      python: [
        /class\s+(\w+)/,
        /dataclass\s+(\w+)/,
      ],
      java: [
        /class\s+(\w+)/,
        /interface\s+(\w+)/,
        /enum\s+(\w+)/,
        /abstract\s+class\s+(\w+)/,
      ],
      cpp: [
        /class\s+(\w+)/,
        /struct\s+(\w+)/,
        /enum\s+(\w+)/,
        /namespace\s+(\w+)/,
      ],
      go: [
        /type\s+(\w+)\s+struct/,
        /type\s+(\w+)\s+interface/,
      ],
      rust: [
        /struct\s+(\w+)/,
        /enum\s+(\w+)/,
        /trait\s+(\w+)/,
        /impl\s+(\w+)/,
      ],
      csharp: [
        /class\s+(\w+)/,
        /interface\s+(\w+)/,
        /enum\s+(\w+)/,
        /struct\s+(\w+)/,
      ],
      php: [
        /class\s+(\w+)/,
        /interface\s+(\w+)/,
        /trait\s+(\w+)/,
      ],
      ruby: [
        /class\s+(\w+)/,
        /module\s+(\w+)/,
      ],
      swift: [
        /class\s+(\w+)/,
        /struct\s+(\w+)/,
        /enum\s+(\w+)/,
        /protocol\s+(\w+)/,
      ],
      kotlin: [
        /class\s+(\w+)/,
        /interface\s+(\w+)/,
        /enum\s+(\w+)/,
        /data\s+class\s+(\w+)/,
      ],
      scala: [
        /class\s+(\w+)/,
        /trait\s+(\w+)/,
        /object\s+(\w+)/,
        /case\s+class\s+(\w+)/,
      ],
      dart: [
        /class\s+(\w+)/,
        /abstract\s+class\s+(\w+)/,
      ],
      r: [
        /setClass\s*\(\s*["'](\w+)["']/,
      ],
      matlab: [
        /classdef\s+(\w+)/,
      ],
      julia: [
        /struct\s+(\w+)/,
        /abstract\s+type\s+(\w+)/,
      ],
      haskell: [
        /data\s+(\w+)/,
        /newtype\s+(\w+)/,
        /class\s+(\w+)/,
      ],
      fsharp: [
        /type\s+(\w+)/,
        /interface\s+(\w+)/,
      ],
      clojure: [
        /\(defrecord\s+(\w+)/,
        /\(defprotocol\s+(\w+)/,
      ],
      elixir: [
        /defmodule\s+(\w+)/,
        /defprotocol\s+(\w+)/,
      ],
      erlang: [
        /-module\s*\((\w+)\)/,
      ],
      ocaml: [
        /type\s+(\w+)/,
        /module\s+(\w+)/,
      ],
      assembly: [
        /\.class\s+(\w+)/,
      ],
      bash: [
        /(\w+)\s*\(\)\s*\{/,
      ],
      powershell: [
        /class\s+(\w+)/,
      ],
      sql: [
        /CREATE\s+TABLE\s+(\w+)/,
        /CREATE\s+VIEW\s+(\w+)/,
      ],
      lua: [
        /(\w+)\s*=\s*\{\s*--/,
      ],
      perl: [
        /package\s+(\w+)/,
      ],
      fortran: [
        /MODULE\s+(\w+)/,
      ],
      ada: [
        /package\s+(\w+)/,
      ],
      cobol: [
        /(\w+)\s+COPYBOOK/,
      ],
      prolog: [
        /:-module\s*\((\w+)/,
      ],
      vhdl: [
        /entity\s+(\w+)/,
        /architecture\s+(\w+)/,
      ],
      verilog: [
        /module\s+(\w+)/,
      ],
      latex: [
        /\\documentclass\s*\{(\w+)\}/,
      ],
      groovy: [
        /class\s+(\w+)/,
        /interface\s+(\w+)/,
      ],
      nim: [
        /type\s+(\w+)/,
        /object\s+(\w+)/,
      ],
      crystal: [
        /class\s+(\w+)/,
        /struct\s+(\w+)/,
      ],
      v: [
        /struct\s+(\w+)/,
        /interface\s+(\w+)/,
      ],
      zig: [
        /const\s+(\w+)/,
      ],
      odin: [
        /(\w+)\s*::\s*struct/,
      ],
      jai: [
        /(\w+)\s*::\s*struct/,
      ],
      carbon: [
        /class\s+(\w+)/,
      ],
      mojo: [
        /struct\s+(\w+)/,
        /fn\s+(\w+)/,
      ],
      text: [
        /(\w+)\s*\{/,
      ],
    };

    const patternsForLanguage = patterns[language] || patterns.text;
    
    for (const pattern of patternsForLanguage) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return undefined;
  }

  private calculateComplexity(content: string): number {
    // Simple complexity calculation based on lines and control structures
    const lines = content.split('\n');
    let complexity = 1;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.includes('if ') || trimmed.includes('else')) complexity += 1;
      if (trimmed.includes('for ') || trimmed.includes('while '))
        complexity += 2;
      if (trimmed.includes('switch ') || trimmed.includes('case '))
        complexity += 1;
      if (trimmed.includes('try ') || trimmed.includes('catch '))
        complexity += 1;
    }

    return Math.min(complexity, 10); // Cap at 10
  }

  private extractDependencies(content: string, language: string): string[] {
    const dependencies: string[] = [];

    // Comprehensive import/require extraction for 50+ languages
    const importPatterns: Record<string, RegExp[]> = {
      javascript: [
        /import\s+.*?from\s+['"]([^'"]+)['"]/g,
        /require\s*\(\s*['"]([^'"]+)['"]/g,
        /import\s*\(\s*['"]([^'"]+)['"]/g,
      ],
      typescript: [
        /import\s+.*?from\s+['"]([^'"]+)['"]/g,
        /require\s*\(\s*['"]([^'"]+)['"]/g,
        /import\s*\(\s*['"]([^'"]+)['"]/g,
      ],
      python: [
        /import\s+(\w+)/g,
        /from\s+(\w+)\s+import/g,
        /import\s+(\w+)\s+as/g,
      ],
      java: [
        /import\s+([\w.]+)/g,
        /import\s+static\s+([\w.]+)/g,
      ],
      cpp: [
        /#include\s+[<"]([^>"]+)[>"]/g,
        /#include\s+([^>\s]+)/g,
      ],
      go: [
        /import\s+['"]([^'"]+)['"]/g,
        /import\s+\(\s*['"]([^'"]+)['"]/g,
      ],
      rust: [
        /use\s+([\w:]+)/g,
        /extern\s+crate\s+(\w+)/g,
      ],
      csharp: [
        /using\s+([\w.]+)/g,
        /using\s+static\s+([\w.]+)/g,
      ],
      php: [
        /use\s+([\w\\]+)/g,
        /require\s+['"]([^'"]+)['"]/g,
        /include\s+['"]([^'"]+)['"]/g,
      ],
      ruby: [
        /require\s+['"]([^'"]+)['"]/g,
        /require_relative\s+['"]([^'"]+)['"]/g,
        /load\s+['"]([^'"]+)['"]/g,
      ],
      swift: [
        /import\s+(\w+)/g,
      ],
      kotlin: [
        /import\s+([\w.]+)/g,
      ],
      scala: [
        /import\s+([\w.]+)/g,
      ],
      dart: [
        /import\s+['"]([^'"]+)['"]/g,
        /export\s+['"]([^'"]+)['"]/g,
      ],
      r: [
        /library\s*\(\s*["']([^"']+)["']/g,
        /require\s*\(\s*["']([^"']+)["']/g,
      ],
      matlab: [
        /addpath\s*\(\s*["']([^"']+)["']/g,
      ],
      julia: [
        /using\s+(\w+)/g,
        /import\s+(\w+)/g,
      ],
      haskell: [
        /import\s+([\w.]+)/g,
        /import\s+qualified\s+([\w.]+)/g,
      ],
      fsharp: [
        /open\s+([\w.]+)/g,
      ],
      clojure: [
        /\(require\s+\[([^\]]+)\]/g,
        /\(use\s+\[([^\]]+)\]/g,
      ],
      elixir: [
        /alias\s+([\w.]+)/g,
        /import\s+([\w.]+)/g,
        /require\s+([\w.]+)/g,
      ],
      erlang: [
        /-include\s*\(\s*["']([^"']+)["']/g,
        /-include_lib\s*\(\s*["']([^"']+)["']/g,
      ],
      ocaml: [
        /open\s+(\w+)/g,
        /include\s+(\w+)/g,
      ],
      assembly: [
        /\.include\s+["']([^"']+)["']/g,
        /\.extern\s+(\w+)/g,
      ],
      bash: [
        /source\s+["']([^"']+)["']/g,
        /\.\s+["']([^"']+)["']/g,
      ],
      powershell: [
        /Import-Module\s+["']([^"']+)["']/g,
        /\.\s+["']([^"']+)["']/g,
      ],
      sql: [
        /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+(\w+)/g,
      ],
      lua: [
        /require\s+["']([^"']+)["']/g,
        /dofile\s+["']([^"']+)["']/g,
      ],
      perl: [
        /use\s+(\w+)/g,
        /require\s+["']([^"']+)["']/g,
      ],
      fortran: [
        /USE\s+(\w+)/g,
        /INCLUDE\s+["']([^"']+)["']/g,
      ],
      ada: [
        /with\s+(\w+)/g,
        /use\s+(\w+)/g,
      ],
      cobol: [
        /COPY\s+(\w+)/g,
      ],
      prolog: [
        /:-use_module\s*\((\w+)\)/g,
        /:-ensure_loaded\s*\((\w+)\)/g,
      ],
      vhdl: [
        /use\s+(\w+)/g,
        /library\s+(\w+)/g,
      ],
      verilog: [
        /`include\s+["']([^"']+)["']/g,
      ],
      latex: [
        /\\usepackage\s*\{([^}]+)\}/g,
        /\\input\s*\{([^}]+)\}/g,
      ],
      groovy: [
        /import\s+([\w.]+)/g,
      ],
      nim: [
        /import\s+(\w+)/g,
      ],
      crystal: [
        /require\s+["']([^"']+)["']/g,
      ],
      v: [
        /import\s+(\w+)/g,
        /module\s+(\w+)/g,
      ],
      zig: [
        /@import\s*\(\s*["']([^"']+)["']/g,
      ],
      odin: [
        /import\s+["']([^"']+)["']/g,
      ],
      jai: [
        /#import\s+(\w+)/g,
      ],
      carbon: [
        /import\s+(\w+)/g,
      ],
      mojo: [
        /from\s+(\w+)\s+import/g,
        /import\s+(\w+)/g,
      ],
      text: [
        /import\s+(\w+)/g,
        /require\s+(\w+)/g,
      ],
    };

    const patterns = importPatterns[language] || importPatterns.text;
    for (const pattern of patterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          dependencies.push(match[1]);
        }
      }
    }

    return dependencies.slice(0, 10); // Limit to 10 dependencies
  }
}
