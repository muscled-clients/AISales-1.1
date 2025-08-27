# SmartCallMate - AI-Powered Sales Assistant

SmartCallMate is a cross-platform desktop application that provides real-time AI assistance during sales calls and meetings. Built with React, Electron, and TypeScript, it offers live transcription, AI insights, and intelligent todo generation.

## ✨ Features

### 🎯 Core Functionality
- **Live Transcription** - Real-time speech-to-text using Deepgram API
- **AI Chat Assistant** - Powered by OpenAI GPT for intelligent insights
- **Smart Todo Generation** - Automatic action item extraction from conversations
- **Context-Aware Responses** - Select transcript text for targeted AI analysis
- **Overlay Mode** - Always-on-top floating window for seamless integration

### 🔧 Advanced Features
- **Smart Text Selection** - Double-click, Ctrl+click, or drag to select transcript text
- **Auto-scroll** - Automatically follows new transcripts and messages
- **Performance Optimized** - Smooth scrolling and responsive UI
- **Cross-Platform** - Works on Windows, macOS, and Linux
- **System Tray Integration** - Minimize to tray for background operation
- **Secure Settings** - Encrypted storage of API keys

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Deepgram API key (for transcription)
- OpenAI API key (for AI features)

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd SmartCallMate-React

# Install dependencies
npm install

# Start development server
npm start
```

For detailed setup instructions, see [SETUP.md](SETUP.md).

## 🎮 Usage

### Getting Started
1. **Configure API Keys** - Go to Settings and add your Deepgram and OpenAI API keys
2. **Start Recording** - Click the microphone button to begin live transcription
3. **Use AI Chat** - Ask questions about your transcripts or get insights
4. **Enable Auto Features** - Turn on Auto AI suggestions and Auto Todos in settings

### Smart Text Selection
- **Double-click** any transcript to select it as context
- **Ctrl+click** multiple transcripts for multi-selection
- **Drag to select** specific portions of text
- Selected context appears in the chat panel for targeted AI queries

### Overlay Mode
- Click "⬜ Overlay Mode" to open the floating window
- Split-panel view with Live Transcripts and AI Chat
- Smart text selection and context sync between windows
- Main window hides automatically when overlay opens

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 18 with TypeScript
- **Desktop**: Electron 27
- **State Management**: Zustand with Immer
- **AI Services**: OpenAI GPT-3.5-turbo
- **Speech-to-Text**: Deepgram WebSocket API
- **Build Tools**: Create React App, electron-builder

### Project Structure
```
SmartCallMate-React/
├── src/
│   ├── components/         # React components
│   ├── stores/            # Zustand state management
│   ├── services/          # AI and transcription services
│   ├── styles/            # CSS and styling
│   └── types/             # TypeScript type definitions
├── public/                # Electron main process files
├── build/                 # Production build output
└── dist/                  # Distribution packages
```

## 🔧 Configuration

### API Keys Setup
1. **Deepgram**: Sign up at [deepgram.com](https://deepgram.com) for transcription
2. **OpenAI**: Get API key from [platform.openai.com](https://platform.openai.com)
3. Enter keys in Settings panel or set environment variables:
   ```bash
   REACT_APP_DEEPGRAM_API_KEY=your_key_here
   REACT_APP_OPENAI_API_KEY=your_key_here
   ```

### Performance Settings
- **Auto AI Suggestions**: Toggle automatic AI insights
- **Auto Todos**: Enable/disable automatic todo extraction
- **Transcript Limit**: Adjust how many transcripts to keep in memory

## 🎯 Use Cases

### Sales Calls
- Live transcription of client conversations
- AI-generated follow-up suggestions
- Automatic extraction of next steps and commitments
- Context-aware responses for objection handling

### Team Meetings
- Real-time meeting notes
- Action item tracking
- Decision point documentation
- Post-meeting summary generation

### Customer Support
- Call transcript documentation
- Issue resolution tracking
- Customer sentiment analysis
- Support ticket generation

## 🛠️ Development

### Available Scripts
- `npm start` - Start development server
- `npm run electron` - Run Electron app
- `npm run build` - Build for production
- `npm run dist` - Create distribution packages
- `npm test` - Run test suite

### Building for Production
```bash
# Build React app
npm run build

# Create distribution packages
npm run dist
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📦 Distribution Options

### For Team Members
See detailed deployment options in [SETUP.md](SETUP.md#team-deployment-options).

**Quick Options:**
1. **Source Code** - Share repository for technical team members
2. **Portable Build** - Share built executable files
3. **Installer Packages** - Create MSI/DMG installers
4. **Cloud Deployment** - Deploy as web application (limited features)

## 🔐 Security & Privacy

- **Local Processing** - All audio processing happens on your machine
- **Encrypted Storage** - API keys stored securely
- **No Data Collection** - No telemetry or usage tracking
- **GDPR Compliant** - Full control over your data

## 📝 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

## 🆘 Support

### Common Issues
- **Microphone Permission** - Ensure browser/system microphone access
- **API Key Errors** - Verify keys are valid and have sufficient credits
- **Audio Issues** - Check system audio settings and device selection

### Getting Help
1. Check the [SETUP.md](SETUP.md) troubleshooting section
2. Review console logs for error messages
3. Verify API key configuration
4. Test with different audio input devices

## 🔄 Updates & Changelog

### Version 1.0.0
- Initial release with core features
- React + Electron architecture
- Deepgram + OpenAI integration
- Overlay mode implementation
- Smart text selection
- Performance optimizations

## 🎉 Acknowledgments

- **Deepgram** for excellent speech-to-text API
- **OpenAI** for powerful AI capabilities
- **Electron** for cross-platform desktop framework
- **React** community for excellent tooling and ecosystem

---

**Made with ❤️ for better sales conversations**

*SmartCallMate helps sales professionals have more effective conversations by providing real-time AI assistance and automatic documentation.*