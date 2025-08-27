# SmartCallMate Setup Guide

Complete installation and setup guide for SmartCallMate AI Sales Assistant on Windows and macOS.

## 📋 System Requirements

### Minimum Requirements
- **OS**: Windows 10/11 or macOS 10.15+
- **RAM**: 4GB (8GB recommended)
- **Storage**: 500MB free space
- **Network**: Internet connection for AI services
- **Audio**: Microphone access required

### Recommended Specifications
- **RAM**: 8GB or more
- **CPU**: Multi-core processor (Intel i5/AMD Ryzen 5 or better)
- **Audio**: High-quality microphone for better transcription

## 🚀 Installation Methods

### Method 1: Development Setup (Recommended for Technical Users)

#### Prerequisites
1. **Install Node.js** (version 16 or higher)
   - **Windows**: Download from [nodejs.org](https://nodejs.org/)
   - **macOS**: Use Homebrew: `brew install node` or download from nodejs.org

2. **Install Git**
   - **Windows**: Download from [git-scm.com](https://git-scm.com/)
   - **macOS**: `brew install git` or use Xcode Command Line Tools

#### Installation Steps

**Windows:**
```cmd
# Open Command Prompt or PowerShell as Administrator
# Clone the repository
git clone <repository-url>
cd SmartCallMate-React

# Install dependencies
npm install

# Start the application
npm start
```

**macOS:**
```bash
# Open Terminal
# Clone the repository
git clone <repository-url>
cd SmartCallMate-React

# Install dependencies
npm install

# Start the application
npm start
```

### Method 2: Pre-built Executables

#### For Windows (.exe)
1. Download `SmartCallMate-Setup-1.0.0.exe` from releases
2. Right-click → "Run as administrator"
3. Follow installation wizard
4. Launch from Desktop shortcut or Start Menu

#### For macOS (.dmg)
1. Download `SmartCallMate-1.0.0.dmg` from releases
2. Double-click the DMG file
3. Drag SmartCallMate to Applications folder
4. Launch from Applications or Launchpad

**macOS Security Note**: If you see "Cannot open because developer cannot be verified":
1. Right-click the app → "Open"
2. Click "Open" in the security dialog
3. Or go to System Preferences → Security & Privacy → General → "Open Anyway"

## 🔑 API Keys Configuration

### Required API Keys

#### 1. Deepgram API Key (Speech-to-Text)
1. Visit [deepgram.com](https://deepgram.com)
2. Create account and verify email
3. Go to Dashboard → API Keys
4. Create new API key
5. Copy the key (starts with `dg_...`)

**Free Tier**: 45,000 minutes of transcription

#### 2. OpenAI API Key (AI Features)
1. Visit [platform.openai.com](https://platform.openai.com)
2. Create account and add payment method
3. Go to API Keys section
4. Create new secret key
5. Copy the key (starts with `sk-...`)

**Pricing**: Pay-per-use, approximately $0.002 per 1K tokens

### Adding API Keys to SmartCallMate

#### Method 1: Settings Panel (Recommended)
1. Launch SmartCallMate
2. Click "⚙️ Settings" button
3. Paste your Deepgram API Key
4. Paste your OpenAI API Key
5. Click "Save Settings"

#### Method 2: Environment Variables

**Windows:**
```cmd
# Set environment variables (PowerShell)
$env:REACT_APP_DEEPGRAM_API_KEY="your_deepgram_key_here"
$env:REACT_APP_OPENAI_API_KEY="your_openai_key_here"

# Or set permanently in System Properties
# Right-click "This PC" → Properties → Advanced → Environment Variables
```

**macOS:**
```bash
# Add to ~/.zshrc or ~/.bash_profile
export REACT_APP_DEEPGRAM_API_KEY="your_deepgram_key_here"
export REACT_APP_OPENAI_API_KEY="your_openai_key_here"

# Reload shell configuration
source ~/.zshrc
```

## 🎯 First-Time Setup

### 1. Audio Configuration
1. **Grant Microphone Permission**
   - **Windows**: Settings → Privacy → Microphone → Allow apps
   - **macOS**: System Preferences → Security & Privacy → Microphone
2. **Test Audio Input**
   - Open app and click microphone button
   - Speak to verify transcription works
   - Adjust microphone sensitivity if needed

### 2. Feature Configuration
1. **Enable Auto Features** (optional)
   - Toggle "Auto AI" for automatic suggestions
   - Toggle "Auto Todos" for action item extraction
2. **Test AI Integration**
   - Start recording and speak
   - Try asking AI questions about transcripts
   - Verify responses are generated

### 3. Overlay Mode Setup
1. Click "⬜ Overlay Mode" button
2. Position overlay window as needed
3. Test smart text selection
4. Verify sync between main and overlay windows

## 🎮 Team Deployment Options

### Option 1: Source Code Distribution (Technical Teams)

**Pros:**
- Full control and customization
- Free distribution
- Easy updates via Git

**Cons:**
- Requires technical setup
- Each member needs development tools

**Steps:**
1. Share Git repository URL
2. Team members follow development setup
3. Each person configures their own API keys

### Option 2: Built Executables (Recommended)

**Pros:**
- No technical setup required
- Professional installer experience
- Easy to distribute

**Cons:**
- Requires build process
- Larger file sizes

**Steps:**
```bash
# Build for production
npm run build

# Create distribution packages
npm run dist

# This creates:
# - SmartCallMate-Setup-1.0.0.exe (Windows)
# - SmartCallMate-1.0.0.dmg (macOS)
# - SmartCallMate-1.0.0.AppImage (Linux)
```

**Distribution:**
- Share installer files via email, cloud storage, or internal network
- Each team member runs installer and configures API keys

### Option 3: Portable Version

**Pros:**
- No installation required
- Can run from USB drive
- Good for temporary use

**Steps:**
```bash
# Build portable version
npm run build
npm run dist:dir

# Creates unpacked application in dist/
# Share the entire folder
```

### Option 4: Enterprise Deployment

**For Large Teams (10+ users):**

1. **Centralized API Key Management**
   - Use environment variables on company machines
   - Deploy via Group Policy (Windows) or MDM (macOS)

2. **Network Installation**
   - Host installer on internal file server
   - Use deployment tools like SCCM, Jamf, or similar

3. **Configuration Management**
   - Pre-configure settings files
   - Deploy with standard company configurations

## 🔧 Advanced Configuration

### Custom Settings File

Create `settings.json` in app data directory:

**Windows:** `%APPDATA%\ai-sales-assistant\settings.json`
**macOS:** `~/Library/Application Support/ai-sales-assistant/settings.json`

```json
{
  "deepgramApiKey": "your_key_here",
  "openaiApiKey": "your_key_here",
  "autoSuggestions": true,
  "autoTodos": true,
  "maxTranscripts": 100,
  "theme": "dark"
}
```

### Performance Optimization

#### For Better Transcription:
- Use high-quality USB microphone
- Minimize background noise
- Speak clearly and at consistent volume
- Position microphone 6-8 inches from mouth

#### For Better Performance:
- Close unnecessary applications
- Ensure stable internet connection
- Monitor CPU and memory usage
- Use SSD storage for faster app loading

## 🛠️ Troubleshooting

### Common Issues

#### "Microphone not detected"
**Windows:**
1. Right-click sound icon → Recording devices
2. Ensure microphone is set as default
3. Check privacy settings for microphone access

**macOS:**
1. System Preferences → Sound → Input
2. Select correct microphone
3. Check Security & Privacy → Microphone permissions

#### "API key invalid" Error
1. Verify key was copied correctly (no extra spaces)
2. Check API key permissions and quotas
3. Ensure sufficient credits in OpenAI account
4. Test keys using API documentation

#### App Won't Start
**Windows:**
1. Run as Administrator
2. Disable antivirus temporarily
3. Install Visual C++ Redistributable
4. Check Windows Defender exclusions

**macOS:**
1. Check Gatekeeper settings
2. Verify app wasn't quarantined: `xattr -rd com.apple.quarantine /Applications/SmartCallMate.app`
3. Try running from Terminal for error messages

#### Poor Transcription Quality
1. Check microphone positioning and quality
2. Reduce background noise
3. Verify internet connection stability
4. Test with different Deepgram models
5. Adjust microphone sensitivity in system settings

#### Slow AI Responses
1. Check internet connection speed
2. Verify OpenAI API key has sufficient credits
3. Try shorter prompts or context
4. Monitor system resource usage

### Getting Detailed Logs

**Enable Debug Mode:**
1. Open app with developer tools: Ctrl+Shift+I (Windows) or Cmd+Option+I (macOS)
2. Check Console tab for errors
3. Look for network failures or API errors
4. Copy error messages for troubleshooting

## 📊 Resource Usage

### Typical Usage:
- **RAM**: 150-300MB
- **CPU**: 5-15% during transcription
- **Network**: 10-50 KB/s during active use
- **Storage**: 50-100MB for app + settings

### API Usage Estimates:
- **Deepgram**: ~1 minute = 1 credit
- **OpenAI**: ~100 words = ~150 tokens (~$0.0003)

## 🔄 Updates & Maintenance

### Updating the Application

**Development Setup:**
```bash
git pull origin main
npm install
npm start
```

**Built Executables:**
- Download new installer
- Run over existing installation
- Settings and API keys preserved

### Backup & Restore

**Settings Location:**
- **Windows**: `%APPDATA%\ai-sales-assistant\`
- **macOS**: `~/Library/Application Support/ai-sales-assistant/`

**Backup:** Copy the entire settings directory
**Restore:** Paste directory back to same location

## 📞 Support & Resources

### Documentation
- [README.md](README.md) - Overview and features
- [API Documentation](https://deepgram.com/docs) - Deepgram
- [OpenAI Documentation](https://platform.openai.com/docs) - OpenAI

### Community & Support
- GitHub Issues for bug reports
- Feature requests via GitHub Discussions
- Email support for enterprise users

---

## 🎯 Quick Start Checklist

- [ ] Install Node.js (development) OR download executable
- [ ] Get Deepgram API key
- [ ] Get OpenAI API key
- [ ] Install SmartCallMate
- [ ] Configure API keys in Settings
- [ ] Grant microphone permissions
- [ ] Test transcription
- [ ] Test AI chat functionality
- [ ] Try overlay mode
- [ ] Share with team members

**Estimated Setup Time**: 15-30 minutes for first-time users

---

*For additional help, check the troubleshooting section or contact support.*