const fs = require('fs');
const path = require('path');

function fixEncoding(dir) {
  fs.readdirSync(dir).forEach(file => {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      fixEncoding(full);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      const bytes = fs.readFileSync(full);
      // Decode as latin1 then re-encode properly
      const latin1 = bytes.toString('latin1');
      const utf8 = Buffer.from(latin1, 'latin1').toString('utf8');
      
      // Check if file has corrupted chars
      if (latin1.includes('\xc3') || latin1.includes('\xc2')) {
        // Re-interpret the bytes as utf8
        const content = bytes.toString('utf8');
        console.log('Already UTF8:', file);
        return;
      }
      
      // Fix double-encoded UTF8
      let content = bytes.toString('utf8');
      const original = content;
      
      // Common Portuguese double-encoded characters
      content = content.replace(/N\u00c3\u0192\u00e2\u20ac\u201ao/g, 'Não');
      content = content.replace(/\u00c3\u00a3/g, 'ã');
      content = content.replace(/\u00c3\u00a7/g, 'ç');
      content = content.replace(/\u00c3\u00a1/g, 'á');
      content = content.replace(/\u00c3\u00a9/g, 'é');
      content = content.replace(/\u00c3\u00aa/g, 'ê');
      content = content.replace(/\u00c3\u00b3/g, 'ó');
      content = content.replace(/\u00c3\u00ba/g, 'ú');
      content = content.replace(/\u00c3\u00ad/g, 'í');
      content = content.replace(/\u00c3\u00a0/g, 'à');
      content = content.replace(/\u00c3\u0089/g, 'É');
      content = content.replace(/\u00c3\u0093/g, 'Ó');
      content = content.replace(/\u00c3\u0094/g, 'Ô');
      content = content.replace(/\u00c3\u00b4/g, 'ô');
      content = content.replace(/\u00c3\u0087/g, 'Ç');
      content = content.replace(/\u00c3\u0095/g, 'Õ');
      content = content.replace(/\u00c3\u00b5/g, 'õ');
      content = content.replace(/\u00c3\u0080/g, 'À');
      content = content.replace(/\u00c3\u00b1/g, 'ñ');
      content = content.replace(/\u00c3\u00b2/g, 'ò');
      content = content.replace(/\u00e2\u20ac\u009c/g, '"');
      content = content.replace(/\u00e2\u20ac\u009d/g, '"');
      content = content.replace(/\u00e2\u20ac\u02dc/g, "'");
      content = content.replace(/\u00e2\u20ac\u2122/g, "'");
      content = content.replace(/\u00e2\u20ac\u00a2/g, '•');
      content = content.replace(/\u00c3\u00a2\u00c5\u201c\u00e2\u20ac\u009c/g, '✓');
      
      if (content !== original) {
        fs.writeFileSync(full, content, 'utf8');
        console.log('Fixed:', file);
      }
    }
  });
}

fixEncoding('./src');
console.log('Done!');
