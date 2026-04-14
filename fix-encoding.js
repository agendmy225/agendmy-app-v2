const fs = require('fs');
const path = require('path');

function decodeDoubleUTF8(buf) {
  // Try to decode as latin1 then re-encode as UTF-8
  const latin1 = buf.toString('latin1');
  try {
    // Check if this is double-encoded UTF-8
    const decoded = Buffer.from(latin1, 'latin1');
    const utf8 = decoded.toString('utf8');
    if (!utf8.includes('\uFFFD')) {
      return utf8;
    }
  } catch(e) {}
  return buf.toString('utf8');
}

function fixFile(filePath) {
  const buf = fs.readFileSync(filePath);
  const latin1str = buf.toString('latin1');
  
  // Try to re-decode as UTF-8
  const rebuf = Buffer.from(latin1str, 'latin1');
  const decoded = rebuf.toString('utf8');
  
  // Check if decoded version has fewer replacement chars
  const originalBadChars = (buf.toString('utf8').match(/\uFFFD/g) || []).length;
  const decodedBadChars = (decoded.match(/\uFFFD/g) || []).length;
  
  // Check if file has problematic patterns
  const originalUtf8 = buf.toString('utf8');
  
  // Fix common double-encoded Portuguese characters
  let fixed = originalUtf8;
  
  // These are the actual UTF-8 strings that appear in the file when read as utf8
  // but were originally double-encoded
  const replacements = [
    // 2-byte chars encoded twice (most common Portuguese)
    ['\u00c3\u00a3', 'ã'],  // ã
    ['\u00c3\u00a7', 'ç'],  // ç  
    ['\u00c3\u00a1', 'á'],  // á
    ['\u00c3\u00a9', 'é'],  // é
    ['\u00c3\u00aa', 'ê'],  // ê
    ['\u00c3\u00b3', 'ó'],  // ó
    ['\u00c3\u00ba', 'ú'],  // ú
    ['\u00c3\u00ad', 'í'],  // í
    ['\u00c3\u00a0', 'à'],  // à
    ['\u00c3\u00a2', 'â'],  // â
    ['\u00c3\u00b4', 'ô'],  // ô
    ['\u00c3\u00b5', 'õ'],  // õ
    ['\u00c3\u0089', 'É'],  // É
    ['\u00c3\u0093', 'Ó'],  // Ó
    ['\u00c3\u0094', 'Ô'],  // Ô
    ['\u00c3\u0095', 'Õ'],  // Õ
    ['\u00c3\u0087', 'Ç'],  // Ç
    ['\u00c3\u0081', 'Á'],  // Á
    ['\u00c3\u008d', 'Í'],  // Í
    // 3-byte emoji encoded twice
    ['\u00e2\u00ad\u0090', '⭐'],  // ⭐
    ['\u00e2\u0098\u0085', '★'],   // ★
    ['\u00e2\u0098\u0086', '☆'],   // ☆
    ['\u00e2\u009c\u0093', '✓'],   // ✓
    ['\u00e2\u009c\u0094', '✔'],   // ✔
    ['\u00e2\u009d\u00a4', '❤'],   // ❤
    ['\u00e2\u0080\u009c', '\u201c'],  // "
    ['\u00e2\u0080\u009d', '\u201d'],  // "
    ['\u00e2\u0080\u0099', '\u2019'],  // '
    ['\u00e2\u0080\u00a2', '\u2022'],  // •
    ['\u00e2\u0080\u0093', '-'],        // –
    ['\u00e2\u0080\u0094', '-'],        // —
    // timer emoji
    ['\u00e2\u00b1\u00ef\u00b8', '⏱'],  // ⏱
    // check mark
    ['\u00c3\u00a2\u00e2\u0082\u00ac\u00a2', '•'],
    // star
    ['\u00c3\u00a2\u00c2\u00ad\u00c2\u0090', '⭐'],
  ];
  
  let changed = false;
  for (const [bad, good] of replacements) {
    if (fixed.includes(bad)) {
      fixed = fixed.split(bad).join(good);
      changed = true;
    }
  }
  
  if (changed) {
    fs.writeFileSync(filePath, fixed, 'utf8');
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
