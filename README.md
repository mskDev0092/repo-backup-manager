# RepoSync - Repository Backup Manager

A GitHub Desktop-like application built with Tauri + Rust + Vite + React that works on Linux, with the primary feature of backing up all repositories and keeping them in sync and available locally.

## Features

### Core Features
- **Repository Management**: Add, remove, and manage Git repositories from multiple providers (GitHub, GitLab, Bitbucket)
- **Automatic Sync**: Keep all repositories up-to-date with configurable sync intervals
- **Backup System**: Create compressed backups of repositories with retention policies
- **GitHub Integration**: Import repositories directly from your GitHub account
- **Activity Logging**: Track all operations with detailed activity logs

### Repository Operations
- Clone repositories to local storage
- Pull latest changes from remote
- Create and restore backups
- View repository status and statistics

### Backup Features
- Automatic scheduled backups
- Compressed tar.gz archives
- Configurable retention period
- Maximum backup limits per repository
- Backup restoration to any location

### User Interface
- Dark theme optimized for developers
- Dashboard with overview statistics
- Repository list with filtering and search
- Settings panel for configuration
- Activity log with history

## Tech Stack

- **Backend**: Rust with Tauri v2
- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4
- **State Management**: React Context + useReducer
- **Icons**: Lucide React
- **Date Handling**: date-fns

## Prerequisites

### Linux (Ubuntu/Debian)

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install system dependencies for Tauri
sudo apt update
sudo apt install -y \
  libwebkit2gtk-4.1-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev

# Install Node.js (if not already installed)
# Using nvm:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install --lts
```

### Other Linux Distributions

For Fedora:
```bash
sudo dnf install \
  webkit2gtk4.1-devel \
  gtk3-devel \
  libappindicator-gtk3-devel \
  librsvg2-devel
```

For Arch Linux:
```bash
sudo pacman -S \
  webkit2gtk-4.1 \
  gtk3 \
  libappindicator-gtk3 \
  librsvg
```

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd repo-backup-manager
```

2. Install npm dependencies:
```bash
npm install
```

3. Build and run in development mode:
```bash
npm run tauri dev
```

4. Build for production:
```bash
npm run tauri build
```

The built application will be in `src-tauri/target/release/bundle/`.

## Project Structure

```
repo-backup-manager/
├── src/                    # React frontend
│   ├── components/         # Reusable UI components
│   ├── contexts/           # React Context for state management
│   ├── pages/              # Page components
│   ├── types/              # TypeScript type definitions
│   ├── App.tsx             # Main App component
│   └── index.css           # Global styles
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── lib.rs          # Main library entry
│   │   ├── git.rs          # Git operations
│   │   ├── backup.rs       # Backup management
│   │   ├── github.rs       # GitHub API integration
│   │   ├── commands.rs     # Tauri command handlers
│   │   └── state.rs        # Application state
│   ├── Cargo.toml          # Rust dependencies
│   └── tauri.conf.json     # Tauri configuration
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

## Configuration

### Backup Settings
- **Backup Path**: Directory where backups are stored
- **Auto Backup**: Enable/disable automatic backups
- **Backup Interval**: How often to create backups (in minutes)
- **Retention Days**: How long to keep backups
- **Max Backups**: Maximum number of backups per repository
- **Compression**: Enable/disable tar.gz compression

### Application Settings
- **Theme**: Dark, Light, or System
- **Startup Behavior**: Normal, Minimized, or Hidden
- **Sync Interval**: How often to sync repositories
- **Notifications**: Desktop notification preferences

## GitHub Integration

To use GitHub integration:

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Create a new token with `repo` and `user:email` scopes
3. In the app, go to Settings → GitHub and enter your token

This allows you to:
- Import all your GitHub repositories at once
- View repository details (stars, forks, description)
- Automatically set up sync for imported repositories

## API Reference

The application exposes the following Tauri commands:

### Repository Commands
- `get_repositories` - Get all repositories
- `add_repository` - Add a new repository
- `remove_repository` - Remove a repository
- `clone_repository` - Clone a repository
- `sync_repository` - Sync (pull) a repository
- `sync_all_repositories` - Sync all repositories
- `get_repository_status` - Get Git status of a repository

### Backup Commands
- `create_backup` - Create a backup of a repository
- `restore_backup` - Restore a backup
- `list_backups` - List all backups for a repository
- `delete_backup` - Delete a backup
- `get_backup_config` - Get backup configuration
- `set_backup_config` - Update backup configuration

### GitHub Commands
- `authenticate_github` - Authenticate with GitHub
- `get_github_user` - Get authenticated user info
- `get_github_repos` - Get user's GitHub repositories
- `import_github_repos` - Import repositories from GitHub

### Settings Commands
- `get_settings` - Get application settings
- `set_settings` - Update application settings

### Activity Commands
- `get_activity_log` - Get activity log
- `clear_activity_log` - Clear activity log

## Development

### Running in Development Mode

```bash
npm run tauri dev
```

This starts both the Vite development server and the Tauri application.

### Building for Production

```bash
npm run tauri build
```

This creates optimized production builds for your platform.

## License

MIT License

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Roadmap

- [ ] GitLab integration
- [ ] Bitbucket integration
- [ ] System tray integration
- [ ] Background sync service
- [ ] Conflict resolution UI
- [ ] Branch management
- [ ] Commit history viewer
- [ ] Multiple remote support
- [ ] Encrypted backups
- [ ] Cloud storage integration
