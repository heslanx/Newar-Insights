#!/usr/bin/env python3
"""
Convert Newar Insights project to a single Markdown file for AI context.
This creates a comprehensive markdown document with all file contents.
"""

import os
from pathlib import Path

# File extensions to include as text
TEXT_EXTENSIONS = {
    '.py', '.ts', '.js', '.tsx', '.jsx',
    '.md', '.txt', '.json', '.yml', '.yaml',
    '.sh', '.bash', '.env', '.example',
    '.toml', '.ini', '.cfg', '.conf',
    '.dockerfile', '.dockerignore', '.gitignore',
    '.sql', '.html', '.css', '.scss',
    '.xml', '.go', '.mod', '.sum', '.makefile'
}

# Files/directories to skip
SKIP_PATTERNS = {
    '__pycache__',
    'node_modules',
    'dist',
    '.venv',
    '.pyc',
    '.next',
    '.git',
    'package-lock.json',
    'go.sum',
    '.sqlite',
    '.db',
    'vendor',
    'build',
    'coverage',
    '.DS_Store'
}

def should_skip(path_str):
    """Check if path should be skipped."""
    for pattern in SKIP_PATTERNS:
        if pattern in path_str:
            return True
    return False

def should_include_file(filepath):
    """Check if file should be included in markdown."""
    path = Path(filepath)

    # Skip if matches skip patterns
    if should_skip(str(filepath)):
        return False

    # Check extension
    return path.suffix.lower() in TEXT_EXTENSIONS or path.name in [
        'Dockerfile', 'Makefile', '.dockerignore', '.gitignore', '.env.example'
    ]

def get_language_for_file(filename):
    """Get markdown language identifier for syntax highlighting."""
    ext = Path(filename).suffix.lower()

    lang_map = {
        '.py': 'python',
        '.go': 'go',
        '.ts': 'typescript',
        '.js': 'javascript',
        '.tsx': 'tsx',
        '.jsx': 'jsx',
        '.sh': 'bash',
        '.bash': 'bash',
        '.yml': 'yaml',
        '.yaml': 'yaml',
        '.json': 'json',
        '.toml': 'toml',
        '.ini': 'ini',
        '.sql': 'sql',
        '.html': 'html',
        '.css': 'css',
        '.xml': 'xml',
        '.md': 'markdown',
        '.mod': 'go',
    }

    if 'Dockerfile' in filename:
        return 'dockerfile'
    if 'Makefile' in filename:
        return 'makefile'

    return lang_map.get(ext, '')

def collect_files(root_dir):
    """Recursively collect all text files from directory."""
    text_files = []

    for root, dirs, files in os.walk(root_dir):
        # Skip directories that match skip patterns
        dirs[:] = [d for d in dirs if not should_skip(d)]

        for file in files:
            filepath = Path(root) / file
            if should_include_file(filepath):
                text_files.append(filepath)

    return sorted(text_files)

def convert_project_to_markdown(project_dir, output_path):
    """Convert project contents to a single Markdown file."""

    print(f"Reading project: {project_dir}")

    # Collect all text files
    text_files = collect_files(project_dir)

    print(f"Found {len(text_files)} text files")

    # Build markdown content
    md_content = []

    # Header
    md_content.append("# Newar Insights Recording System - Complete Codebase")
    md_content.append("")
    md_content.append("**Generated from:** Newar Insights project directory")
    md_content.append("**Purpose:** AI/LLM context for understanding the complete system")
    md_content.append("**Version:** 1.0.0")
    md_content.append("")
    md_content.append("---")
    md_content.append("")

    # Table of Contents
    md_content.append("## 📋 Table of Contents")
    md_content.append("")
    md_content.append("1. [Overview](#overview)")
    md_content.append("2. [Project Structure](#project-structure)")
    md_content.append("3. [Statistics](#statistics)")
    md_content.append("4. [File Contents](#file-contents)")
    md_content.append("")
    md_content.append("---")
    md_content.append("")

    # Overview
    md_content.append("## Overview")
    md_content.append("")
    md_content.append("**Newar Insights Recording System** - A lightweight API for recording online meetings (Google Meet and Microsoft Teams) and saving audio files.")
    md_content.append("")
    md_content.append("### Key Features")
    md_content.append("- ✅ Record audio from Google Meet and Microsoft Teams")
    md_content.append("- ✅ Support for multiple simultaneous recordings")
    md_content.append("- ✅ REST API for managing recordings")
    md_content.append("- ✅ Audio files saved in WebM/Opus format (128kbps)")
    md_content.append("- ✅ Real-time streaming to storage (chunked upload)")
    md_content.append("")
    md_content.append("### Architecture")
    md_content.append("- **api-gateway** (port 8080): Routes API requests")
    md_content.append("- **admin-api** (port 8081): User and token management")
    md_content.append("- **bot-manager** (port 8082): Orchestrates bot lifecycle")
    md_content.append("- **recording-bot** (dynamic): Platform-agnostic meeting bot")
    md_content.append("- **sqlite**: Stores users, meetings, API tokens (local dev)")
    md_content.append("- **redis**: Message bus for bot commands")
    md_content.append("- **frontend**: Next.js admin dashboard")
    md_content.append("")
    md_content.append("---")
    md_content.append("")

    # Project Structure
    md_content.append("## Project Structure")
    md_content.append("")
    md_content.append("```")
    md_content.append("newar-insights/")
    md_content.append("├── services/                    # Backend Microservices (Go)")
    md_content.append("│   ├── api-gateway/")
    md_content.append("│   ├── admin-api/")
    md_content.append("│   ├── bot-manager/")
    md_content.append("│   └── recording-bot/           # TypeScript Bot")
    md_content.append("├── frontend/                    # Next.js Admin Dashboard")
    md_content.append("├── shared/                      # Shared Go packages")
    md_content.append("│   ├── types/")
    md_content.append("│   ├── constants/")
    md_content.append("│   └── utils/")
    md_content.append("├── migrations/                  # SQL migrations")
    md_content.append("├── storage/                     # Local storage")
    md_content.append("│   ├── database/               # SQLite database")
    md_content.append("│   └── recordings/             # Audio files")
    md_content.append("├── docker/                      # Dockerfiles")
    md_content.append("└── examples/                    # Usage examples")
    md_content.append("```")
    md_content.append("")
    md_content.append("---")
    md_content.append("")

    # Statistics
    md_content.append("## Statistics")
    md_content.append("")
    md_content.append(f"- **Total files included:** {len(text_files)}")
    md_content.append("")

    # Count by extension
    ext_count = {}
    for f in text_files:
        ext = f.suffix or 'no_extension'
        ext_count[ext] = ext_count.get(ext, 0) + 1

    md_content.append("### Files by Type")
    md_content.append("")
    for ext, count in sorted(ext_count.items(), key=lambda x: -x[1]):
        md_content.append(f"- **{ext}**: {count} files")
    md_content.append("")
    md_content.append("---")
    md_content.append("")

    # File Contents
    md_content.append("## File Contents")
    md_content.append("")
    md_content.append("All file contents are listed below with syntax highlighting.")
    md_content.append("")
    md_content.append("---")
    md_content.append("")

    # Add each file
    project_path = Path(project_dir)
    for i, filepath in enumerate(text_files, 1):
        # Get relative path from project root
        try:
            relative_path = filepath.relative_to(project_path)
        except ValueError:
            relative_path = filepath

        print(f"Processing {i}/{len(text_files)}: {relative_path}")

        # File header
        md_content.append(f"### File {i}/{len(text_files)}: `{relative_path}`")
        md_content.append("")

        # Read file content
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()

            # Get language for syntax highlighting
            lang = get_language_for_file(str(filepath))

            # Add content with code block
            md_content.append(f"```{lang}")
            md_content.append(content)
            md_content.append("```")
            md_content.append("")
            md_content.append("---")
            md_content.append("")

        except Exception as e:
            md_content.append(f"❌ Error reading file: {e}")
            md_content.append("")
            md_content.append("---")
            md_content.append("")

    # Footer
    md_content.append("## End of Codebase")
    md_content.append("")
    md_content.append("**Total files documented:** " + str(len(text_files)))
    md_content.append("")
    md_content.append("---")
    md_content.append("")
    md_content.append("**Generated by:** zip_to_markdown.py")
    md_content.append("**Purpose:** Complete codebase context for AI/LLM")
    md_content.append("**Note:** This markdown contains the entire Newar Insights Recording System codebase.")
    md_content.append("")

    # Write to file
    output_content = '\n'.join(md_content)

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(output_content)

    print(f"\n✅ Markdown created: {output_path}")
    print(f"📊 Total size: {len(output_content):,} characters")
    print(f"📄 Total files: {len(text_files)}")

if __name__ == '__main__':
    project_dir = '.'
    output_path = 'Newar-Insights-Complete.md'

    if not os.path.exists(project_dir):
        print(f"❌ Project directory not found: {project_dir}")
        exit(1)

    convert_project_to_markdown(project_dir, output_path)
    print(f"\n✨ Done! Use {output_path} as context for AI/LLM")
