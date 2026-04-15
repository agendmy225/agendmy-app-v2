const fs = require('fs');
const path = require('path');

function fixBuffer(buf) {
  const result = [];
  let i = 0;
  let changed = false;
  
  while (i < buf.length) {
    // Pattern 1: c3 XX c3 YY = double encoded 2-byte sequences
    if (buf[i] === 0xc3 && i+3 < buf.length && buf[i+2] === 0xc3) {
      const b2 = buf[i+1]; // first char high bits
      const b4 = buf[i+3]; // second char low bits
      const codePoint = ((b2 & 0x3F) << 6) | (b4 & 0x3F);
      if (codePoint >= 0x80 && codePoint <= 0x7FF) {
        const str = String.fromCodePoint(codePoint);
        const enc = Buffer.from(str, 'utf8');
        result.push(...enc);
        i += 4;
        changed = true;
        continue;
      }
    }
    
    // Pattern 2: c3 XX c2 YY = double encoded 2-byte sequences  
    if (buf[i] === 0xc3 && i+3 < buf.length && buf[i+2] === 0xc2) {
      const b2 = buf[i+1];
      const b4 = buf[i+3];
      const codePoint = ((b2 & 0x3F) << 6) | (b4 & 0x3F);
      if (codePoint >= 0x80 && codePoint <= 0x7FF) {
        const str = String.fromCodePoint(codePoint);
        const enc = Buffer.from(str, 'utf8');
        result.push(...enc);
        i += 4;
        changed = true;
        continue;
      }
    }
    
    // Pattern 3: e2 94 9c c2 XX = box drawing + latin char
    if (buf[i] === 0xe2 && buf[i+1] === 0x94 && buf[i+2] === 0x9c && buf[i+3] === 0xc2) {
      const b5 = buf[i+4];
      const codePoint = 0x80 | (b5 & 0x3F);
      // Map to correct Portuguese chars
      const charMap = {
        0xa1: 'í', 0xa3: 'ã', 0xa7: 'ç', 0xa9: 'é', 0xaa: 'ê',
        0xad: 'í', 0xb3: 'ó', 0xba: 'ú', 0xb4: 'ô', 0xb5: 'õ',
        0xa0: 'à', 0xa2: 'â', 0xb1: 'ñ', 0xb2: 'ò',
      };
      const ch = charMap[b5] || String.fromCodePoint(0xC0 | (b5 >> 6), 0x80 | (b5 & 0x3F));
      const enc = Buffer.from(ch, 'utf8');
      result.push(...enc);
      i += 5;
      changed = true;
      continue;
    }

    // Pattern 4: e0 a2 XX c5 YY = triple encoded
    if (buf[i] === 0xe0 && buf[i+1] === 0xa2 && i+4 < buf.length) {
      const b3 = buf[i+2];
      const b4 = buf[i+3];
      const b5 = buf[i+4];
      if (b4 === 0xc5 || b4 === 0xc2 || b4 === 0xc3) {
        const codePoint = ((b3 & 0x3F) << 6) | (b5 & 0x3F);
        if (codePoint >= 0x80 && codePoint <= 0x7FF) {
          const str = String.fromCodePoint(codePoint);
          const enc = Buffer.from(str, 'utf8');
          result.push(...enc);
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
  let hasIssues = false;
  for (let i = 0; i < buf.length - 3; i++) {
    if (buf[i] === 0xc3 && (buf[i+2] === 0xc3 || buf[i+2] === 0xc2)) { hasIssues = true; break; }
    if (buf[i] === 0xe2 && buf[i+1] === 0x94 && buf[i+2] === 0x9c) { hasIssues = true; break; }
    if (buf[i] === 0xe0 && buf[i+1] === 0xa2) { hasIssues = true; break; }
  }
  if (!hasIssues) return false;
  
  let current = buf;
  let totalChanged = false;
  
  // Run multiple passes until stable
  for (let pass = 0; pass < 5; pass++) {
    const { buf: fixed, changed } = fixBuffer(current);
    if (!changed) break;
    current = fixed;
    totalChanged = true;
  }
  
  if (totalChanged) {
    fs.writeFileSync(filePath, current);
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
