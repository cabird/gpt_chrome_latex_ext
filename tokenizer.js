// Simplified GPT tokenizer for browser use
// This is a lightweight approximation that's more accurate than word count
// For exact counts, would need to load full tokenizer library

class SimpleTokenizer {
  constructor() {
    // Common token patterns based on GPT tokenization rules
    this.patterns = {
      // Whitespace and punctuation typically become separate tokens
      whitespace: /\s+/g,
      punctuation: /[.,!?;:'"()\[\]{}]/g,
      // Common LaTeX commands are often single tokens
      latexCommand: /\\[a-zA-Z]+/g,
      // Numbers are usually one token per sequence
      numbers: /\d+(\.\d+)?/g,
      // Words get split at certain boundaries
      words: /[a-zA-Z]+/g
    };
  }

  // Approximate token count based on GPT-3/4 tokenization patterns
  countTokens(text) {
    if (!text) return 0;
    
    let tokenCount = 0;
    
    // Count whitespace (usually 1 token each)
    const whitespace = text.match(this.patterns.whitespace);
    if (whitespace) tokenCount += whitespace.length;
    
    // Count punctuation (1 token each)
    const punctuation = text.match(this.patterns.punctuation);
    if (punctuation) tokenCount += punctuation.length;
    
    // Count LaTeX commands (1 token each)
    const latexCommands = text.match(this.patterns.latexCommand);
    if (latexCommands) tokenCount += latexCommands.length;
    
    // Count numbers (1 token each)
    const numbers = text.match(this.patterns.numbers);
    if (numbers) tokenCount += numbers.length;
    
    // Remove all counted elements to get remaining text
    let remaining = text
      .replace(this.patterns.whitespace, ' ')
      .replace(this.patterns.punctuation, ' ')
      .replace(this.patterns.latexCommand, ' ')
      .replace(this.patterns.numbers, ' ');
    
    // Count remaining words (approximately 1.3 tokens per word on average)
    const words = remaining.match(this.patterns.words);
    if (words) {
      words.forEach(word => {
        // Longer words often split into multiple tokens
        if (word.length <= 3) {
          tokenCount += 1;
        } else if (word.length <= 6) {
          tokenCount += Math.ceil(word.length / 4);
        } else {
          tokenCount += Math.ceil(word.length / 3.5);
        }
      });
    }
    
    return Math.ceil(tokenCount);
  }
  
  // Get token count with formatted string
  getFormattedCount(text) {
    const count = this.countTokens(text);
    return {
      count: count,
      formatted: count.toLocaleString(),
      warning: count > 120000 // Warn if approaching typical model limits
    };
  }
}

// Create singleton instance
const tokenizer = new SimpleTokenizer();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SimpleTokenizer;
}