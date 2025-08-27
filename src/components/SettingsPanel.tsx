import React, { useState, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';

const SettingsPanel: React.FC = () => {
  // Zustand performance: subscribe only to settings
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);
  
  const [localSettings, setLocalSettings] = useState(settings);
  const [hasChanges, setHasChanges] = useState(false);
  const [testingDeepgram, setTestingDeepgram] = useState(false);
  const [testingOpenAI, setTestingOpenAI] = useState(false);
  const [deepgramStatus, setDeepgramStatus] = useState<string>('');
  const [openaiStatus, setOpenAIStatus] = useState<string>('');

  // Update local settings when global settings change
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSettingChange = (key: keyof typeof settings, value: string | boolean) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    setHasChanges(JSON.stringify(newSettings) !== JSON.stringify(settings));
  };


  const handleSave = async () => {
    // Just call updateSettings which handles everything
    await updateSettings(localSettings);
    setHasChanges(false);
  };

  const handleReset = () => {
    setLocalSettings(settings);
    setHasChanges(false);
  };

  const handleTestDeepgram = async () => {
    if (!localSettings.deepgramKey) {
      setDeepgramStatus('❌ Please enter your Deepgram API key first');
      return;
    }

    setTestingDeepgram(true);
    setDeepgramStatus('🔄 Testing connection...');

    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.testDeepgram(localSettings.deepgramKey);
        setDeepgramStatus(result.success ? `✅ ${result.message}` : `❌ ${result.message}`);
      } else {
        setDeepgramStatus('❌ Electron API not available');
      }
    } catch (error: any) {
      setDeepgramStatus(`❌ Test failed: ${error.message}`);
    } finally {
      setTestingDeepgram(false);
    }
  };

  const handleTestOpenAI = async () => {
    if (!localSettings.openaiKey) {
      setOpenAIStatus('❌ Please enter your OpenAI API key first');
      return;
    }

    setTestingOpenAI(true);
    setOpenAIStatus('🔄 Testing connection...');

    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.testOpenAI(localSettings.openaiKey);
        setOpenAIStatus(result.success ? `✅ ${result.message}` : `❌ ${result.message}`);
      } else {
        setOpenAIStatus('❌ Electron API not available');
      }
    } catch (error: any) {
      setOpenAIStatus(`❌ Test failed: ${error.message}`);
    } finally {
      setTestingOpenAI(false);
    }
  };

  const validateApiKey = (key: string): boolean => {
    return key.length > 10; // Basic validation
  };

  return (
    <div className="panel">
      <div style={{ padding: '16px', borderBottom: '1px solid #333' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <span style={{ fontSize: '12px', color: '#888' }}>
            Configuration
          </span>
          
          {hasChanges && (
            <span style={{
              fontSize: '11px',
              color: '#ffc107',
              background: 'rgba(255, 193, 7, 0.1)',
              padding: '2px 6px',
              borderRadius: '3px'
            }}>
              ⚠️ Unsaved Changes
            </span>
          )}
        </div>

        {hasChanges && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button
              onClick={handleSave}
              style={{
                flex: 1,
                padding: '6px 12px',
                background: '#28a745',
                border: 'none',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              💾 Save Changes
            </button>
            <button
              onClick={handleReset}
              style={{
                flex: 1,
                padding: '6px 12px',
                background: '#6c757d',
                border: 'none',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              🔄 Reset
            </button>
          </div>
        )}
      </div>
      
      <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* API Keys Section */}
          <section>
            <h4 style={{ 
              fontSize: '14px', 
              fontWeight: '600', 
              marginBottom: '16px',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              🔐 API Configuration
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '500',
                  marginBottom: '6px',
                  color: '#ccc'
                }}>
                  Deepgram API Key
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    value={localSettings.deepgramKey}
                    onChange={(e) => handleSettingChange('deepgramKey', e.target.value)}
                    placeholder="Enter your Deepgram API key..."
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: '#333',
                      border: `1px solid ${validateApiKey(localSettings.deepgramKey) ? '#28a745' : '#555'}`,
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#007acc'}
                    onBlur={(e) => e.target.style.borderColor = validateApiKey(localSettings.deepgramKey) ? '#28a745' : '#555'}
                  />
                  {localSettings.deepgramKey && (
                    <span style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '12px',
                      color: validateApiKey(localSettings.deepgramKey) ? '#28a745' : '#dc3545'
                    }}>
                      {validateApiKey(localSettings.deepgramKey) ? '✓' : '✗'}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                  <button
                    onClick={handleTestDeepgram}
                    disabled={testingDeepgram || !localSettings.deepgramKey}
                    style={{
                      padding: '6px 12px',
                      background: testingDeepgram ? '#6c757d' : '#007acc',
                      border: 'none',
                      borderRadius: '4px',
                      color: '#fff',
                      fontSize: '12px',
                      cursor: testingDeepgram || !localSettings.deepgramKey ? 'not-allowed' : 'pointer',
                      opacity: testingDeepgram || !localSettings.deepgramKey ? 0.6 : 1
                    }}
                  >
                    {testingDeepgram ? '🔄 Testing...' : '🔌 Test Connection'}
                  </button>
                  {deepgramStatus && (
                    <span style={{ fontSize: '12px', color: deepgramStatus.includes('✅') ? '#28a745' : '#dc3545' }}>
                      {deepgramStatus}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                  Required for speech-to-text transcription
                </p>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '500',
                  marginBottom: '6px',
                  color: '#ccc'
                }}>
                  OpenAI API Key
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    value={localSettings.openaiKey}
                    onChange={(e) => handleSettingChange('openaiKey', e.target.value)}
                    placeholder="Enter your OpenAI API key..."
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: '#333',
                      border: `1px solid ${validateApiKey(localSettings.openaiKey) ? '#28a745' : '#555'}`,
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#007acc'}
                    onBlur={(e) => e.target.style.borderColor = validateApiKey(localSettings.openaiKey) ? '#28a745' : '#555'}
                  />
                  {localSettings.openaiKey && (
                    <span style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '12px',
                      color: validateApiKey(localSettings.openaiKey) ? '#28a745' : '#dc3545'
                    }}>
                      {validateApiKey(localSettings.openaiKey) ? '✓' : '✗'}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                  <button
                    onClick={handleTestOpenAI}
                    disabled={testingOpenAI || !localSettings.openaiKey}
                    style={{
                      padding: '6px 12px',
                      background: testingOpenAI ? '#6c757d' : '#007acc',
                      border: 'none',
                      borderRadius: '4px',
                      color: '#fff',
                      fontSize: '12px',
                      cursor: testingOpenAI || !localSettings.openaiKey ? 'not-allowed' : 'pointer',
                      opacity: testingOpenAI || !localSettings.openaiKey ? 0.6 : 1
                    }}
                  >
                    {testingOpenAI ? '🔄 Testing...' : '🔌 Test Connection'}
                  </button>
                  {openaiStatus && (
                    <span style={{ fontSize: '12px', color: openaiStatus.includes('✅') ? '#28a745' : '#dc3545' }}>
                      {openaiStatus}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                  Required for AI chat and analysis features
                </p>
              </div>
            </div>
          </section>

          {/* Automation Settings */}
          <section>
            <h4 style={{ 
              fontSize: '14px', 
              fontWeight: '600', 
              marginBottom: '16px',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              🤖 Automation Settings
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                {
                  key: 'autoTranscription' as const,
                  label: 'Auto Transcription',
                  description: 'Automatically start transcription when recording begins',
                  icon: '📝'
                },
                {
                  key: 'autoTodos' as const,
                  label: 'Auto Todo Detection',
                  description: 'AI automatically detects and creates todos from conversations',
                  icon: '✅'
                },
                {
                  key: 'autoSuggestions' as const,
                  label: 'Auto AI Suggestions',
                  description: 'Generate contextual suggestions during conversations',
                  icon: '💡'
                }
              ].map((setting) => (
                <div
                  key={setting.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'rgba(45, 45, 45, 0.6)',
                    border: '1px solid #333',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: '500',
                      color: '#fff',
                      marginBottom: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      {setting.icon} {setting.label}
                    </div>
                    <div style={{ fontSize: '11px', color: '#888' }}>
                      {setting.description}
                    </div>
                  </div>
                  
                  <label style={{
                    position: 'relative',
                    display: 'inline-block',
                    width: '44px',
                    height: '24px',
                    marginLeft: '16px'
                  }}>
                    <input
                      type="checkbox"
                      checked={localSettings[setting.key]}
                      onChange={(e) => handleSettingChange(setting.key, e.target.checked)}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: 'absolute',
                      cursor: 'pointer',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: localSettings[setting.key] ? '#007acc' : '#666',
                      borderRadius: '24px',
                      transition: '0.3s'
                    }}>
                      <div style={{
                        position: 'absolute',
                        height: '18px',
                        width: '18px',
                        left: localSettings[setting.key] ? '23px' : '3px',
                        bottom: '3px',
                        background: 'white',
                        borderRadius: '50%',
                        transition: '0.3s'
                      }} />
                    </span>
                  </label>
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;