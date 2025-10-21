import React from 'react';

interface MessageContentProps {
  content: string;
  role: 'user' | 'assistant';
}

const MessageContent: React.FC<MessageContentProps> = ({ content, role }) => {
  // Function to parse and format the content
  const formatContent = (text: string) => {
    // Check if text starts with quoted content (for context display)
    if (text.startsWith('"') && role === 'user') {
      const endQuoteIndex = text.indexOf('"\n\n');
      if (endQuoteIndex > 0) {
        const quotedText = text.substring(1, endQuoteIndex);
        const userMessage = text.substring(endQuoteIndex + 3);
        
        return (
          <>
            <div style={{
              fontSize: '13px',
              color: 'rgba(255, 255, 255, 0.7)',
              borderLeft: '2px solid rgba(255, 255, 255, 0.2)',
              paddingLeft: '10px',
              marginBottom: '8px',
              fontStyle: 'italic'
            }}>
              {quotedText}
            </div>
            <div>{userMessage}</div>
          </>
        );
      }
    }
    
    // Split by line breaks to handle paragraphs
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let currentList: string[] = [];
    let listType: 'bullet' | 'numbered' | null = null;
    let inCodeBlock = false;
    let codeContent = '';
    let codeLanguage = '';
    
    lines.forEach((line, index) => {
      // Check for code blocks
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeLanguage = line.slice(3).trim();
          codeContent = '';
        } else {
          inCodeBlock = false;
          elements.push(
            <pre key={`code-${index}`} style={{
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '8px 12px',
              borderRadius: '6px',
              margin: '8px 0',
              overflowX: 'auto',
              fontSize: '13px',
              fontFamily: 'Monaco, Consolas, "Courier New", monospace'
            }}>
              <code>{codeContent.trim()}</code>
            </pre>
          );
          codeContent = '';
        }
        return;
      }
      
      if (inCodeBlock) {
        codeContent += line + '\n';
        return;
      }
      
      // Handle bold text
      let processedLine = line;
      if (processedLine.includes('**')) {
        const parts = processedLine.split(/\*\*(.*?)\*\*/g);
        const formattedParts = parts.map((part, i) => 
          i % 2 === 1 ? <strong key={`bold-${index}-${i}`}>{part}</strong> : part
        );
        processedLine = <span key={`line-${index}`}>{formattedParts}</span> as any;
      }
      
      // Handle inline code
      if (typeof processedLine === 'string' && processedLine.includes('`')) {
        const parts = processedLine.split(/`(.*?)`/g);
        const formattedParts = parts.map((part, i) => 
          i % 2 === 1 ? 
            <code key={`inline-${index}-${i}`} style={{
              background: 'rgba(0, 0, 0, 0.2)',
              padding: '2px 6px',
              borderRadius: '3px',
              fontSize: '13px',
              fontFamily: 'Monaco, Consolas, monospace'
            }}>{part}</code> : 
            part
        );
        processedLine = <span key={`line-${index}`}>{formattedParts}</span> as any;
      }
      
      // Check for bullet points
      const bulletMatch = line.match(/^[\s]*[-•*]\s+(.+)/);
      const numberedMatch = line.match(/^[\s]*(\d+)\.\s+(.+)/);
      
      if (bulletMatch) {
        if (listType !== 'bullet') {
          if (currentList.length > 0) {
            elements.push(
              <ul key={`list-${index}`} style={{ 
                marginLeft: '20px', 
                margin: '8px 0 8px 20px',
                paddingLeft: '0'
              }}>
                {currentList.map((item, i) => (
                  <li key={`item-${i}`} style={{ marginBottom: '4px' }}>{item}</li>
                ))}
              </ul>
            );
            currentList = [];
          }
          listType = 'bullet';
        }
        currentList.push(bulletMatch[1].trim());
      } else if (numberedMatch) {
        if (listType !== 'numbered') {
          if (currentList.length > 0) {
            elements.push(
              <ol key={`list-${index}`} style={{ 
                marginLeft: '20px',
                margin: '8px 0 8px 20px',
                paddingLeft: '0'
              }}>
                {currentList.map((item, i) => (
                  <li key={`item-${i}`} style={{ marginBottom: '4px' }}>{item}</li>
                ))}
              </ol>
            );
            currentList = [];
          }
          listType = 'numbered';
        }
        currentList.push(numberedMatch[2].trim());
      } else {
        // Flush any pending list
        if (currentList.length > 0) {
          elements.push(
            listType === 'numbered' ? (
              <ol key={`list-${index}`} style={{ 
                marginLeft: '20px',
                margin: '8px 0 8px 20px',
                paddingLeft: '0'
              }}>
                {currentList.map((item, i) => (
                  <li key={`item-${i}`} style={{ marginBottom: '4px' }}>{item}</li>
                ))}
              </ol>
            ) : (
              <ul key={`list-${index}`} style={{ 
                marginLeft: '20px',
                margin: '8px 0 8px 20px',
                paddingLeft: '0'
              }}>
                {currentList.map((item, i) => (
                  <li key={`item-${i}`} style={{ marginBottom: '4px' }}>{item}</li>
                ))}
              </ul>
            )
          );
          currentList = [];
          listType = null;
        }
        
        // Handle headers
        if (line.startsWith('### ')) {
          elements.push(
            <h4 key={`h3-${index}`} style={{ 
              fontSize: '15px', 
              fontWeight: 'bold', 
              margin: '12px 0 8px 0' 
            }}>
              {line.slice(4)}
            </h4>
          );
        } else if (line.startsWith('## ')) {
          elements.push(
            <h3 key={`h2-${index}`} style={{ 
              fontSize: '16px', 
              fontWeight: 'bold', 
              margin: '12px 0 8px 0' 
            }}>
              {line.slice(3)}
            </h3>
          );
        } else if (line.startsWith('# ')) {
          elements.push(
            <h2 key={`h1-${index}`} style={{ 
              fontSize: '18px', 
              fontWeight: 'bold', 
              margin: '12px 0 8px 0' 
            }}>
              {line.slice(2)}
            </h2>
          );
        } else if (line.trim()) {
          // Regular paragraph
          elements.push(
            <p key={`p-${index}`} style={{ 
              margin: '8px 0',
              lineHeight: '1.5'
            }}>
              {processedLine}
            </p>
          );
        }
      }
    });
    
    // Flush any remaining list
    if (currentList.length > 0) {
      elements.push(
        listType === 'numbered' ? (
          <ol key={`list-final`} style={{ 
            marginLeft: '20px',
            margin: '8px 0 8px 20px',
            paddingLeft: '0'
          }}>
            {currentList.map((item, i) => (
              <li key={`item-${i}`} style={{ marginBottom: '4px' }}>{item}</li>
            ))}
          </ol>
        ) : (
          <ul key={`list-final`} style={{ 
            marginLeft: '20px',
            margin: '8px 0 8px 20px',
            paddingLeft: '0'
          }}>
            {currentList.map((item, i) => (
              <li key={`item-${i}`} style={{ marginBottom: '4px' }}>{item}</li>
            ))}
          </ul>
        )
      );
    }
    
    return elements;
  };
  
  return (
    <div style={{ 
      wordBreak: 'break-word',
      whiteSpace: 'pre-wrap'
    }}>
      {formatContent(content)}
    </div>
  );
};

export default MessageContent;