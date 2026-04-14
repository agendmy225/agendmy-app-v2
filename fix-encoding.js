const fs = require('fs');
const path = require('path');

function fixFile(filePath) {
  const buf = fs.readFileSync(filePath);
  let changed = false;
  
  // Convert buffer to array of bytes for processing
  const bytes = [];
  for (let i = 0; i < buf.length; i++) {
    bytes.push(buf[i]);
  }
  
  const result = [];
  let i = 0;
  
  while (i < bytes.length) {
    // Check for double-encoded UTF-8 sequences (0xC3 followed by 0x82 or 0x83)
    // Pattern: C3 A2 + 2 more bytes = double-encoded 3-byte UTF-8
    if (bytes[i] === 0xC3 && bytes[i+1] === 0xA2 && i+3 < bytes.length) {
      // This is â (U+00E2) double-encoded, likely an emoji
      // Get the next two bytes to determine the original character
      const b2 = bytes[i+2];
      const b3 = bytes[i+3];
      
      if (b2 === 0xC2 && b3 === 0xAD && i+5 < bytes.length) {
        // â­ = star emoji area
        const b4 = bytes[i+4];
        if (b4 === 0x90) {
          // ⭐ U+2B50
          result.push(0xE2, 0xAD, 0x90);
          i += 5;
          changed = true;
          continue;
        }
      }
      if (b2 === 0xC2 && b3 === 0xB1) {
        // â± = timer
        if (bytes[i+4] === 0xC2 && bytes[i+5] === 0xAF && bytes[i+6] === 0xC2 && bytes[i+7] === 0xB8) {
          // ⏱️
          result.push(0xE2, 0xB1, 0xAF, 0xB8);
          i += 8;
          changed = true;
          continue;
        }
      }
      if (b2 === 0xC2 && b3 === 0x98) {
        const b4 = bytes[i+4];
        if (b4 === 0x85) { result.push(0xE2, 0x98, 0x85); i+=5; changed=true; continue; } // ★
        if (b4 === 0x86) { result.push(0xE2, 0x98, 0x86); i+=5; changed=true; continue; } // ☆
      }
      if (b2 === 0xC2 && b3 === 0x9C) {
        const b4 = bytes[i+4];
        if (b4 === 0x93) { result.push(0xE2, 0x9C, 0x93); i+=5; changed=true; continue; } // ✓
        if (b4 === 0x94) { result.push(0xE2, 0x9C, 0x94); i+=5; changed=true; continue; } // ✔
      }
      if (b2 === 0xC2 && b3 === 0x80) {
        const b4 = bytes[i+4];
        if (b4 === 0x9C) { result.push(0xE2, 0x80, 0x9C); i+=5; changed=true; continue; } // "
        if (b4 === 0x9D) { result.push(0xE2, 0x80, 0x9D); i+=5; changed=true; continue; } // "
        if (b4 === 0x99) { result.push(0xE2, 0x80, 0x99); i+=5; changed=true; continue; } // '
        if (b4 === 0xA2) { result.push(0xE2, 0x80, 0xA2); i+=5; changed=true; continue; } // •
        if (b4 === 0x93) { result.push(0x2D); i+=5; changed=true; continue; } // -
        if (b4 === 0x94) { result.push(0x2D); i+=5; changed=true; continue; } // -
      }
    }
    
    // Check for double-encoded 2-byte sequences (C3 + byte)
    if (bytes[i] === 0xC3 && i+1 < bytes.length) {
      const b2 = bytes[i+1];
      // These are already single-byte encoded chars that got double-encoded
      if (b2 >= 0x80 && b2 <= 0xBF) {
        // Check if next byte is C2 (another double-encoding indicator)
        if (bytes[i+2] === 0xC2 && i+3 < bytes.length) {
          const b3 = bytes[i+3];
          // This is a double-encoded 2-byte UTF-8 sequence
          // Original char code = ((b2 & 0x3F) << 6) | (b3 & 0x3F)
          const charCode = ((b2 & 0x3F) << 6) | (b3 & 0x3F);
          if (charCode > 0x7F) {
            const str = String.fromCodePoint(charCode);
            const encoded = Buffer.from(str, 'utf8');
            for (const byte of encoded) result.push(byte);
            i += 4;
            changed = true;
            continue;
          }
        }
      }
    }
    
    result.push(bytes[i]);
    i++;
  }
  
  if (changed) {
    fs.writeFileSync(filePath, Buffer.from(result));
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
        if (fixFile(full)) console.log('Fixed:', file);
      } catch(e) {
        console.log('Error:', file, e.message);
      }
    }
  });
}

walkDir('./src');
console.log('Done!');
