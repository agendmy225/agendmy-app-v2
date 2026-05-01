const fs = require('fs');

const filePath = 'src/features/business/BusinessDetailsScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// 1. Atualizar renderReviewItem para mostrar a resposta do dono
const oldRender = `<Text style={styles.reviewComment}>{item.comment}</Text>
    </View>
  );`;

const newRender = `<Text style={styles.reviewComment}>{item.comment}</Text>
      {item.response && item.response.text ? (
        <View style={styles.ownerResponseContainer}>
          <View style={styles.ownerResponseHeader}>
            <Icon name="reply" size={14} color="#d31027" />
            <Text style={styles.ownerResponseLabel}>Resposta do estabelecimento</Text>
          </View>
          <Text style={styles.ownerResponseText}>{item.response.text}</Text>
        </View>
      ) : null}
    </View>
  );`;

if (c.includes(oldRender)) {
  c = c.replace(oldRender, newRender);
  console.log('1. JSX da resposta do dono adicionado');
} else {
  console.log('Padrao exato nao bateu, tentando regex');
  // Tentar regex flexivel
  const flexRegex = /<Text style=\{styles\.reviewComment\}>\{item\.comment\}<\/Text>\s*<\/View>\s*\);/;
  if (flexRegex.test(c)) {
    c = c.replace(flexRegex, newRender);
    console.log('1. JSX adicionado via regex');
  }
}

// 2. Adicionar estilos para a resposta do dono
if (!c.includes('ownerResponseContainer:')) {
  const styleAnchor = /reviewComment:\s*\{[^}]+\},/;
  const m = c.match(styleAnchor);
  if (m) {
    const newStyles = `${m[0]}
  ownerResponseContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f9f0f2',
    borderLeftWidth: 3,
    borderLeftColor: '#d31027',
    borderRadius: 6,
  },
  ownerResponseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  ownerResponseLabel: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#d31027',
  },
  ownerResponseText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },`;
    c = c.replace(m[0], newStyles);
    console.log('2. Estilos da resposta do dono adicionados');
  }
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Arquivo salvo!');
}

// Verificacao
const c2 = fs.readFileSync(filePath, 'utf8');
console.log('\n=== Verificacao ===');
console.log('JSX da resposta:', c2.includes('item.response.text') ? 'OK' : 'FALTA');
console.log('Label "Resposta do estabelecimento":', c2.includes('Resposta do estabelecimento') ? 'OK' : 'FALTA');
console.log('Estilo ownerResponseContainer:', c2.includes('ownerResponseContainer:') ? 'OK' : 'FALTA');
