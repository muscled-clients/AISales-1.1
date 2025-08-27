# SmartCallMate Team Deployment Guide

Complete guide for deploying SmartCallMate to your team members without requiring them to set up development environments.

## 🎯 Deployment Options Summary

| Method | Pros | Cons | Best For |
|--------|------|------|----------|
| **Built Executables** | Easy install, no dev setup | Larger files, build required | Most teams |
| **Portable Builds** | No installation required | Manual updates | Temporary use |
| **Source Code** | Full control, free updates | Technical setup required | Dev teams |
| **Enterprise** | Centralized management | Complex setup | Large organizations |

## 🚀 Quick Deployment (Recommended)

### Step 1: Build Distribution Packages

**For Windows Team Members:**
```bash
# Run the automated build script
scripts\build-for-team.bat

# Or manually:
npm install
npm run build
npm run dist:win
```

**For macOS Team Members:**
```bash
# Run the automated build script
./scripts/build-for-team.sh

# Or manually:
npm install
npm run build
npm run dist:mac
```

**For Cross-Platform Teams:**
```bash
npm install
npm run build
npm run dist:all  # Builds for Windows, macOS, and Linux
```

### Step 2: Distribute Files

The build process creates these files in the `dist/` folder:

**Windows:**
- `SmartCallMate-Setup-1.0.0.exe` - Full installer (recommended)
- `SmartCallMate-1.0.0-win-x64.zip` - Portable version 64-bit
- `SmartCallMate-1.0.0-win-ia32.zip` - Portable version 32-bit

**macOS:**
- `SmartCallMate-1.0.0.dmg` - Installer package (recommended)
- `SmartCallMate-1.0.0-mac-x64.zip` - Portable Intel Macs
- `SmartCallMate-1.0.0-mac-arm64.zip` - Portable Apple Silicon

**Linux:**
- `SmartCallMate-1.0.0.AppImage` - Universal Linux app
- `SmartCallMate-1.0.0.deb` - Debian/Ubuntu package

## 📤 Distribution Methods

### Option 1: Cloud Storage (Easiest)
1. Upload installer files to:
   - Google Drive
   - Dropbox
   - OneDrive
   - Company file server
2. Share download links with team
3. Include setup instructions

### Option 2: Email Distribution
- **Small Team (<5 people)**: Email installer files directly
- **Large Team**: Use cloud links due to file size limits

### Option 3: Internal Network
- Host files on company file server
- Provide network path: `\\server\software\SmartCallMate\`
- Include installation instructions

### Option 4: Company Software Portal
- Upload to existing software deployment system
- Use SCCM, Jamf, or similar enterprise tools
- Deploy with pre-configured settings

## 👥 Team Member Instructions

### For Windows Users

#### Method A: Installer (Recommended)
1. Download `SmartCallMate-Setup-1.0.0.exe`
2. Right-click → "Run as administrator"
3. Follow installation wizard
4. Launch from Desktop shortcut or Start Menu

#### Method B: Portable
1. Download and extract `SmartCallMate-1.0.0-win-x64.zip`
2. Double-click `SmartCallMate.exe` to run
3. No installation required

### For macOS Users

#### Method A: DMG Installer (Recommended)
1. Download `SmartCallMate-1.0.0.dmg`
2. Double-click to mount the disk image
3. Drag SmartCallMate to Applications folder
4. First time: Right-click app → "Open" → "Open" (security)

#### Method B: Portable
1. Download and extract `SmartCallMate-1.0.0-mac-x64.zip`
2. Double-click SmartCallMate app to run

### First-Time Setup (All Platforms)
1. **Get API Keys:**
   - Deepgram: Sign up at [deepgram.com](https://deepgram.com)
   - OpenAI: Get key at [platform.openai.com](https://platform.openai.com)

2. **Configure SmartCallMate:**
   - Open app and click "⚙️ Settings"
   - Paste Deepgram API key
   - Paste OpenAI API key
   - Click "Save Settings"

3. **Test Functionality:**
   - Grant microphone permission when prompted
   - Click microphone button to test transcription
   - Try asking AI a question

## 🏢 Enterprise Deployment

### For Large Teams (10+ Users)

#### Centralized Configuration
1. **Pre-configure API Keys:**
   ```bash
   # Create settings template
   mkdir -p templates
   echo '{
     "deepgramApiKey": "YOUR_COMPANY_KEY",
     "openaiApiKey": "YOUR_COMPANY_KEY",
     "autoSuggestions": true,
     "autoTodos": true
   }' > templates/settings.json
   ```

2. **Deploy with Group Policy (Windows):**
   - Create MSI installer with pre-configured settings
   - Deploy via Active Directory Group Policy
   - Set registry keys for API configuration

3. **Deploy with MDM (macOS):**
   - Use Jamf, Workspace ONE, or similar
   - Create configuration profile
   - Push app and settings to managed devices

#### Network Installation Script
```batch
@echo off
echo Installing SmartCallMate for all users...
\\fileserver\software\SmartCallMate-Setup-1.0.0.exe /S
copy "\\fileserver\config\smartcallmate-settings.json" "%APPDATA%\ai-sales-assistant\"
echo Installation complete!
```

### Security Considerations
- **API Key Management:** Consider using environment variables
- **Network Policy:** Ensure access to deepgram.com and api.openai.com
- **User Permissions:** App needs microphone access
- **Firewall Rules:** Allow WebSocket connections for transcription

## 💰 Cost Planning for Teams

### API Usage Estimates (per person/month)

**Deepgram Transcription:**
- Light usage (1 hour/day): ~20 hours = $8
- Heavy usage (4 hours/day): ~80 hours = $32
- Free tier: 45,000 minutes total

**OpenAI Chat:**
- Light usage: ~50,000 tokens = $0.10
- Heavy usage: ~200,000 tokens = $0.40

**Total Monthly Cost per User:** $8-35 (depending on usage)

### Team Pricing Models

#### Option 1: Individual API Keys
- Each team member gets their own keys
- Individual billing and usage tracking
- Good for small teams (2-5 people)

#### Option 2: Shared Company Keys
- Single set of API keys for entire team
- Centralized billing and management
- Better for larger teams (5+ people)
- Requires enterprise-level API accounts

## 🔄 Updates and Maintenance

### Updating the App

#### Manual Updates
1. Build new version: `npm run dist`
2. Distribute new installer files
3. Team members install over existing version
4. Settings and data preserved

#### Automatic Updates (Advanced)
1. Set up update server
2. Configure electron-updater in app
3. Enable automatic update checks
4. Users get notified of new versions

### Version Control for Teams
```bash
# Tag releases
git tag v1.0.0
git push origin v1.0.0

# Create release builds
npm run dist
```

## 🛠️ Troubleshooting for Team Deployment

### Common Distribution Issues

#### "App won't start" (Windows)
- **Solution**: Install Visual C++ Redistributable
- **Prevention**: Include runtime in installer

#### "Developer cannot be verified" (macOS)
- **Solution**: Right-click → Open → Open
- **Prevention**: Code sign the app (requires Apple Developer account)

#### "Missing dependencies"
- **Solution**: Ensure complete dist package
- **Prevention**: Test installer on clean machine

### Support Strategy for Teams

1. **Create Internal Documentation**
   - Customize SETUP.md with company-specific info
   - Add internal support contacts
   - Include company API key procedures

2. **Designate App Champions**
   - Train 1-2 team members as super users
   - They handle first-line support
   - Escalate technical issues to developer

3. **Set Up Feedback Channel**
   - Slack channel or Teams group
   - Email alias for bug reports
   - Regular feedback sessions

## 📊 Deployment Checklist

### Pre-Deployment
- [ ] Test app on target operating systems
- [ ] Verify API keys work with expected usage
- [ ] Create installer packages
- [ ] Test installation on clean machines
- [ ] Prepare user documentation
- [ ] Set up support channels

### Distribution
- [ ] Upload files to distribution platform
- [ ] Send installation instructions to team
- [ ] Schedule training/demo session
- [ ] Monitor for installation issues
- [ ] Collect user feedback

### Post-Deployment
- [ ] Monitor API usage and costs
- [ ] Track user adoption and usage
- [ ] Gather feature requests
- [ ] Plan update schedule
- [ ] Document lessons learned

## 💡 Pro Tips for Team Success

1. **Start Small**: Deploy to 2-3 power users first
2. **Provide Training**: 15-minute demo is worth hours of support
3. **Monitor Usage**: Track API costs and usage patterns
4. **Gather Feedback**: Regular check-ins improve adoption
5. **Keep It Simple**: Focus on core features initially

---

## 🎯 Quick Decision Matrix

**Choose Built Executables if:**
- Team members are not technical
- You want professional installation experience
- Security policies require signed software

**Choose Portable Builds if:**
- Quick testing or temporary deployment
- Users can't install software
- You need maximum flexibility

**Choose Source Code if:**
- Team members are developers
- You need customization
- Budget is very limited

**Choose Enterprise Deployment if:**
- Large team (10+ people)
- Centralized IT management required
- Integration with existing tools needed

---

*Need help with deployment? Check the troubleshooting sections in README.md and SETUP.md, or contact support.*