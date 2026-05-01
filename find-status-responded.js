const fs = require('fs');
const c = fs.readFileSync('src/features/reviews/ReviewsManagementScreen.tsx', 'utf8');

const search = "status: 'responded'";
let pos = -1;
let n = 0;
while ((pos = c.indexOf(search, pos + 1)) !== -1) {
  n++;
  const lineNum = c.substring(0, pos).split('\n').length;
  console.log('--- Ocorrencia ' + n + ' em linha ' + lineNum + ' ---');
  console.log(c.substring(Math.max(0, pos - 300), pos + 300));
  console.log('');
}
console.log('Total de ocorrencias:', n);
