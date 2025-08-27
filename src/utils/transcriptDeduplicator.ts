/**
 * TranscriptDeduplicator - Advanced deduplication for transcripts
 * Based on the proven approach from the original SmartCallMate app
 * Handles severe duplication issues with word-level and phrase-level detection
 */
class TranscriptDeduplicator {
  private recentTranscripts: string[] = [];
  private readonly maxHistorySize = 5;
  private lastCleanTranscript = '';
  private lastProcessedTime = 0;
  private previousFinalTranscript = '';

  /**
   * Clean and deduplicate a transcript
   * @param transcript - Raw transcript text
   * @param isInterim - Whether this is an interim transcript
   * @returns Cleaned transcript or null if should be skipped
   */
  clean(transcript: string, isInterim = false): string | null {
    if (!transcript || transcript.trim().length < 2) {
      return null;
    }

    let cleanText = transcript.trim();
    const now = Date.now();

    // Log for debugging
    console.log(`[Dedup] RAW Input: "${cleanText}" (interim: ${isInterim})`);

    // Skip if identical to last processed (within 25ms) - allow more live updates  
    if (cleanText === this.lastCleanTranscript && now - this.lastProcessedTime < 25) {
      console.log('[Dedup] Skipped - identical to last (within 25ms)');
      return null;
    }

    // Step 1: Remove sentence-level duplicates first
    cleanText = this.removeSentenceDuplicates(cleanText);

    // Step 2: Remove phrase-level duplicates
    cleanText = this.removePhraseDuplicates(cleanText);

    // Step 3: Remove word-level duplicates
    cleanText = this.removeWordDuplicates(cleanText);

    // Step 4: Clean up punctuation issues
    cleanText = this.cleanPunctuation(cleanText);

    // Step 5: Final cleanup
    cleanText = cleanText.replace(/\s+/g, ' ').trim();

    console.log(`[Dedup] CLEAN Output: "${cleanText}"`);

    // Check if result is meaningful
    if (!cleanText || cleanText.length < 2) {
      return null;
    }

    // Check against recent history for final transcripts
    if (!isInterim && this.isDuplicateOfRecent(cleanText)) {
      console.log('[Dedup] Skipped as duplicate of recent');
      return null;
    }

    // Update history
    this.lastCleanTranscript = cleanText;
    this.lastProcessedTime = now;

    // Store for comparison (only final transcripts)
    if (!isInterim) {
      this.previousFinalTranscript = cleanText;
      this.addToHistory(cleanText);
    }

    return cleanText;
  }

  /**
   * Remove sentence-level duplicates
   * "How are you? How are you?" -> "How are you?"
   */
  private removeSentenceDuplicates(text: string): string {
    const sentences = text.split(/([.!?]+)/);
    const seen = new Set<string>();
    const result: string[] = [];

    for (let i = 0; i < sentences.length; i += 2) {
      const sentence = sentences[i]?.trim();
      const punctuation = sentences[i + 1] || '';

      if (sentence) {
        const normalized = sentence.toLowerCase();
        if (!seen.has(normalized)) {
          seen.add(normalized);
          result.push(sentence + punctuation);
        }
      }
    }

    return result.join(' ');
  }

  /**
   * Remove phrase-level duplicates
   * "How are How are you" -> "How are you"
   */
  private removePhraseDuplicates(text: string): string {
    // Remove consecutive duplicate phrases (2-5 words)
    for (let phraseLength = 5; phraseLength >= 2; phraseLength--) {
      const regex = new RegExp(`\\b((?:\\w+\\W+){${phraseLength - 1}}\\w+)\\s+\\1\\b`, 'gi');
      let previousText: string;
      do {
        previousText = text;
        text = text.replace(regex, '$1');
      } while (text !== previousText);
    }

    return text;
  }

  /**
   * Remove word-level duplicates while preserving compound words
   * "Hey Hey bro bro" -> "Hey bro"
   * "I I want want to to go" -> "I want to go"
   */
  private removeWordDuplicates(text: string): string {
    const words = text.split(/\s+/);
    const result: string[] = [];

    for (let i = 0; i < words.length; i++) {
      const currentWord = words[i];
      const currentNormalized = currentWord.toLowerCase().replace(/[.,!?;:]/g, '');

      // Look back at previous 2 words for duplicates
      let isDuplicate = false;

      for (let j = Math.max(0, result.length - 2); j < result.length; j++) {
        const prevWord = result[j];
        const prevNormalized = prevWord.toLowerCase().replace(/[.,!?;:]/g, '');

        // Handle compound words (only check adjacent words)
        if (j === result.length - 1) {
          // Check if previous word is prefix of current (e.g., "Mac" -> "MacBook")
          if (prevNormalized.length < currentNormalized.length && 
              currentNormalized.toLowerCase().startsWith(prevNormalized.toLowerCase())) {
            const suffix = currentNormalized.substring(prevNormalized.length);
            // If suffix doesn't match common word endings, it's likely a compound
            if (!suffix.match(/^(ed|ing|er|est|ly|ness|ment|ful|less|ish|ous|ive|able|ible)$/)) {
              continue; // Keep both words
            }
          }

          // Check if current is prefix of previous
          if (currentNormalized.length < prevNormalized.length && 
              prevNormalized.toLowerCase().startsWith(currentNormalized.toLowerCase())) {
            const suffix = prevNormalized.substring(currentNormalized.length);
            if (!suffix.match(/^(ed|ing|er|est|ly|ness|ment|ful|less|ish|ous|ive|able|ible)$/)) {
              isDuplicate = true; // Remove current as it's the base of the compound
              break;
            }
          }
        }

        // Check for exact duplicate
        if (currentNormalized === prevNormalized && currentNormalized.length > 0) {
          isDuplicate = true;
          // Keep punctuation from the second occurrence if it has any
          if (currentWord.match(/[.,!?;:]$/) && !prevWord.match(/[.,!?;:]$/)) {
            result[j] = currentWord;
          }
          break;
        }
      }

      if (!isDuplicate) {
        result.push(currentWord);
      }
    }

    return result.join(' ');
  }

  /**
   * Clean up punctuation issues
   */
  private cleanPunctuation(text: string): string {
    // Remove unnecessary periods after single words
    text = text.replace(/\b(\w{2,})\.\s+(\w)/g, (match, word, nextChar) => {
      const abbreviations = ['Mr', 'Mrs', 'Dr', 'Ms', 'Prof', 'Sr', 'Jr'];
      if (abbreviations.includes(word)) {
        return match;
      }
      // Remove period if next word doesn't start with capital
      if (nextChar === nextChar.toLowerCase()) {
        return `${word} ${nextChar}`;
      }
      return match;
    });

    // Fix multiple punctuation
    text = text.replace(/([.!?])\1+/g, '$1');
    
    // Fix space before punctuation
    text = text.replace(/\s+([.,!?;:])/g, '$1');
    
    // Ensure space after punctuation
    text = text.replace(/([.,!?;:])([A-Za-z])/g, '$1 $2');

    return text;
  }

  /**
   * Check if text is a duplicate of recent transcripts
   */
  private isDuplicateOfRecent(text: string): boolean {
    const normalized = text.toLowerCase();
    
    for (const recent of this.recentTranscripts) {
      if (recent === normalized) {
        console.log('[Dedup] Exact duplicate found in history');
        return true;
      }
      
      // Only filter if it's a small substring (less than 50% of original)
      // This prevents filtering valid partial sentences
      if (recent.includes(normalized) && normalized.length < recent.length * 0.5) {
        console.log('[Dedup] Small substring of recent transcript');
        return true;
      }
    }
    
    return false;
  }

  /**
   * Add text to history
   */
  private addToHistory(text: string): void {
    const normalized = text.toLowerCase();
    this.recentTranscripts.push(normalized);
    
    if (this.recentTranscripts.length > this.maxHistorySize) {
      this.recentTranscripts.shift();
    }
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.recentTranscripts = [];
    this.lastCleanTranscript = '';
    this.lastProcessedTime = 0;
    this.previousFinalTranscript = '';
  }
}

export const transcriptDeduplicator = new TranscriptDeduplicator();