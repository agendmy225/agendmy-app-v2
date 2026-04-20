const fs = require('fs');

// ===== 1. Adicionar prop "instruction" no ImageCropModal =====
const modalPath = 'src/components/common/ImageCropModal.tsx';
let modal = fs.readFileSync(modalPath, 'utf8');
const origModal = modal;

// Adicionar prop instruction no type
if (!modal.includes('instruction?:')) {
  modal = modal.replace(
    "title?: string;\n  onConfirm: (croppedUri: string) => void;",
    "title?: string;\n  instruction?: string;\n  onConfirm: (croppedUri: string) => void;"
  );
  console.log('Prop instruction adicionada ao type');
}

// Desestruturar a prop no componente
if (!modal.includes('instruction,')) {
  modal = modal.replace(
    "title = 'Ajustar imagem',\n  onConfirm,",
    "title = 'Ajustar imagem',\n  instruction,\n  onConfirm,"
  );
  console.log('Prop instruction adicionada ao destructure');
}

// Adicionar exibicao da instrucao no header (abaixo do titulo)
// e tambem no footer como texto destacado
if (!modal.includes('{instruction')) {
  // Adicionar no footer como texto destacado antes do texto de arrastar
  modal = modal.replace(
    `        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Arraste para posicionar  |  Pince para ampliar
          </Text>
        </View>`,
    `        <View style={styles.footer}>
          {instruction ? (
            <Text style={styles.footerInstruction}>{instruction}</Text>
          ) : null}
          <Text style={styles.footerText}>
            Arraste para posicionar  |  Pince para ampliar
          </Text>
        </View>`
  );
  console.log('Instruction adicionada no footer');
}

// Adicionar estilo footerInstruction
if (!modal.includes('footerInstruction:')) {
  modal = modal.replace(
    `  footerText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },`,
    `  footerInstruction: {
    color: '#ffc107',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  footerText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },`
  );
  console.log('Estilo footerInstruction adicionado');
}

if (modal !== origModal) {
  fs.writeFileSync(modalPath, modal, 'utf8');
  console.log('ImageCropModal salvo!');
}

// ===== 2. Passar a instrucao no BusinessSettingsScreen quando editar capa =====
const bsPath = 'src/features/business/BusinessSettingsScreen.tsx';
let bs = fs.readFileSync(bsPath, 'utf8');
const origBs = bs;

// Modificar o objeto cropConfig para incluir instruction
// Primeiro adicionar no type do state
if (!bs.includes('instruction?:')) {
  bs = bs.replace(
    /cropConfig[^,]*?title:\s*string;/,
    (m) => m.replace('title: string;', 'title: string;\n    instruction?: string;')
  );
  console.log('Type cropConfig atualizado com instruction');
}

// Modificar startImageCrop para aceitar instruction
if (!bs.includes('instruction?: string,')) {
  bs = bs.replace(
    /const startImageCrop = async \(\s*aspectRatio: number,\s*outputWidth: number,\s*outputHeight: number,\s*storageKey: string,\s*title: string,/,
    `const startImageCrop = async (
    aspectRatio: number,
    outputWidth: number,
    outputHeight: number,
    storageKey: string,
    title: string,
    instruction: string,`
  );
  console.log('startImageCrop agora aceita instruction');
}

// Passar instruction ao setCropConfig
if (!bs.match(/setCropConfig\(\{[^}]*instruction/)) {
  bs = bs.replace(
    /setCropConfig\(\{\s*aspectRatio,\s*outputWidth,\s*outputHeight,\s*storageKey,\s*title,\s*onSuccess,\s*\}\);/,
    `setCropConfig({
          aspectRatio,
          outputWidth,
          outputHeight,
          storageKey,
          title,
          instruction,
          onSuccess,
        });`
  );
  console.log('setCropConfig agora inclui instruction');
}

// Passar instruction para o ImageCropModal
bs = bs.replace(
  /title=\{cropConfig\.title\}\s*onConfirm=\{handleCropConfirm\}/,
  `title={cropConfig.title}
          instruction={cropConfig.instruction}
          onConfirm={handleCropConfirm}`
);

// Atualizar a chamada do handleUploadLogo (sem instruction)
bs = bs.replace(
  `    startImageCrop(
      1,
      512,
      512,
      storageKey,
      'Ajustar Logo',
      async (_url, path) => {`,
  `    startImageCrop(
      1,
      512,
      512,
      storageKey,
      'Ajustar Logo',
      '',
      async (_url, path) => {`
);

// Atualizar a chamada do handleUploadCoverImage (com instruction)
bs = bs.replace(
  `    startImageCrop(
      3,
      1200,
      400,
      storageKey,
      'Ajustar Capa',
      async (_url, path) => {`,
  `    startImageCrop(
      3,
      1200,
      400,
      storageKey,
      'Ajustar Capa',
      '📸 Tire a foto com o celular na horizontal para enquadrar melhor a capa',
      async (_url, path) => {`
);

if (bs !== origBs) {
  fs.writeFileSync(bsPath, bs, 'utf8');
  console.log('BusinessSettingsScreen salvo!');
}

console.log('\nDone!');
