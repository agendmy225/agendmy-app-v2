const fs = require('fs');
const path = require('path');

function fixBuffer(buf) {
  const result = [];
  let i = 0;
  let changed = false;
  
  while (i < buf.length) {
    // Pattern: e2 94 9c = ├ (box drawing character used as encoding artifact)
    // followed by c2 XX = the actual character
    if (buf[i] === 0xe2 && buf[i+1] === 0x94 && buf[i+2] === 0x9c && buf[i+3] === 0xc2) {
      // This is a corrupted 2-byte UTF-8 sequence
      // The actual char is at buf[i+3], buf[i+4]
      const b2 = buf[i+3];
      const b3 = buf[i+4];
      
      // Map common Portuguese characters
      const map = {
        0xa1: [0xc3, 0xad], // í
        0xa3: [0xc3, 0xa3], // ã  
        0xa7: [0xc3, 0xa7], // ç
        0xa0: [0xc3, 0xa0], // à
        0xa1: [0xc3, 0xad], // í
        0xaa: [0xc3, 0xaa], // ê
        0xa9: [0xc3, 0xa9], // é
        0xb3: [0xc3, 0xb3], // ó
        0xba: [0xc3, 0xba], // ú
        0xad: [0xc3, 0xad], // í
        0xb4: [0xc3, 0xb4], // ô
        0xb5: [0xc3, 0xb5], // õ
        0xa2: [0xc3, 0xa2], // â
      };
      
      if (b2 === 0xc2 && map[b3]) {
        result.push(...map[b3]);
        i += 5;
        changed = true;
        continue;
      }
      // Generic: push c3 + (b3 & 0x3F | 0x80) - attempt to fix
      if (b2 === 0xc2) {
        result.push(0xc3, b3);
        i += 5;
        changed = true;
        continue;
      }
    }
    
    // Pattern: c3 XX c2 XX = double encoded 2-byte UTF-8
    if (buf[i] === 0xc3 && buf[i+2] === 0xc2 && i+3 < buf.length) {
      const b2 = buf[i+1];
      const b3 = buf[i+3];
      // Decode: original char = ((b2 & 0x3F) << 6) | (b3 & 0x3F)
      if (b2 >= 0x80 && b2 <= 0xBF && b3 >= 0x80 && b3 <= 0xBF) {
        const codePoint = ((b2 & 0x3F) << 6) | (b3 & 0x3F);
        if (codePoint >= 0x80 && codePoint <= 0x7FF) {
          // Valid 2-byte UTF-8
          const encoded = Buffer.from(String.fromCodePoint(codePoint), 'utf8');
          result.push(...encoded);
          i += 4;
          changed = true;
          continue;
        }
      }
    }
    
    // Pattern: e0 a2 XX c2 XX = triple encoded
    if (buf[i] === 0xe0 && buf[i+1] === 0xa2 && i+4 < buf.length) {
      const b3 = buf[i+2];
      const b4 = buf[i+3];
      const b5 = buf[i+4];
      
      if (b4 === 0xc2) {
        // e0 a2 XX c2 YY -> try to decode
        // This might be a 3-byte char encoded as c3 a2 + c2 XX
        // which got re-encoded as e0 a2...
        const codePoint2 = ((b3 & 0x3F) << 6) | (b5 & 0x3F);
        if (codePoint2 >= 0x80) {
          const encoded = Buffer.from(String.fromCodePoint(codePoint2), 'utf8');
          result.push(...encoded);
          i += 5;
          changed = true;
          continue;
        }
      }
    }
    
    result.push(buf[i]);
    i++;
  }
  
  return { buf: Buffer.from(result), changed };
}

function processFile(filePath) {
  const buf = fs.readFileSync(filePath);
  
  // Check if file has problematic patterns
  let hasIssues = false;
  for (let i = 0; i < buf.length - 4; i++) {
    if (buf[i] === 0xe2 && buf[i+1] === 0x94 && buf[i+2] === 0x9c) { hasIssues = true; break; }
    if (buf[i] === 0xc3 && buf[i+2] === 0xc2) { hasIssues = true; break; }
    if (buf[i] === 0xe0 && buf[i+1] === 0xa2) { hasIssues = true; break; }
  }
  
  if (!hasIssues) return false;
  
  const { buf: fixed, changed } = fixBuffer(buf);
  if (changed) {
    fs.writeFileSync(filePath, fixed);
    return true;
  }
  return false;
}

function walkDir(dir) {
  fs.readdirSync(dir).forEach(file => {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      walkDir(full);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      try {
        if (processFile(full)) console.log('Fixed:', file);
      } catch(e) {
        console.log('Error:', file, e.message);
      }
    }
  });
}

walkDir('./src');
console.log('Done!');
