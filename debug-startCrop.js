const fs = require('fs');

const filePath = 'src/features/business/BusinessSettingsScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// Adicionar log dentro do startImageCrop, no setCropConfig
const oldSetConfig = `setCropConfig({
          aspectRatio,
          outputWidth,
          outputHeight,
          storageKey,
          title,
          instruction,
          onSuccess,
        });`;

const newSetConfig = `console.log('[startImageCrop] Salvando cropConfig, tipo de onSuccess:', typeof onSuccess);
        const configToSave = {
          aspectRatio,
          outputWidth,
          outputHeight,
          storageKey,
          title,
          instruction,
          onSuccess,
        };
        console.log('[startImageCrop] configToSave keys:', Object.keys(configToSave));
        console.log('[startImageCrop] onSuccess no objeto:', typeof configToSave.onSuccess);
        setCropConfig(configToSave);`;

if (c.includes(oldSetConfig)) {
  c = c.replace(oldSetConfig, newSetConfig);
  console.log('Logs adicionados no startImageCrop');
}

// Tambem corrigir o type do cropConfig adicionando instruction
const oldType = `const [cropConfig, setCropConfig] = useState<{
    aspectRatio: number;
    outputWidth: number;
    outputHeight: number;
    storageKey: string;
    onSuccess: (url: string, path: string) => void;
    title: string;
  } | null>(null);`;

const newType = `const [cropConfig, setCropConfig] = useState<{
    aspectRatio: number;
    outputWidth: number;
    outputHeight: number;
    storageKey: string;
    onSuccess: (url: string, path: string) => void;
    title: string;
    instruction?: string;
  } | null>(null);`;

if (c.includes(oldType)) {
  c = c.replace(oldType, newType);
  console.log('Type cropConfig atualizado com instruction');
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Arquivo salvo!');
}
