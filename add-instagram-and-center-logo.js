const fs = require('fs');

// ===== 1. Adicionar campo instagram no tipo Business =====
const businessesPath = 'src/services/businesses.ts';
let bs = fs.readFileSync(businessesPath, 'utf8');
const origBs = bs;

if (!bs.match(/instagram\??:\s*string/)) {
  // Adicionar instagram?: string apos phone
  bs = bs.replace(
    /(\bphone\??:\s*string;)/,
    `$1\n  instagram?: string;`
  );
  console.log('Campo instagram adicionado em Business');
}

if (bs !== origBs) {
  fs.writeFileSync(businessesPath, bs, 'utf8');
}

// ===== 2. Adicionar campo no BusinessSettingsScreen =====
const settingsPath = 'src/features/business/BusinessSettingsScreen.tsx';
let st = fs.readFileSync(settingsPath, 'utf8');
const origSt = st;

// Adicionar tipo BusinessSettings
if (!st.match(/instagram\??:\s*string/)) {
  // Achar o type local com phone: string;
  st = st.replace(
    /(\bphone:\s*string;)/,
    `$1\n  instagram?: string;`
  );
  console.log('Tipo local atualizado com instagram');
}

// Adicionar instagram no estado inicial (procurar primeiro phone: '')
let phoneStateCount = 0;
st = st.replace(/phone:\s*''/g, (match) => {
  phoneStateCount++;
  return `phone: '',\n          instagram: ''`;
});
// Remover o segundo "instagram: ''" se foi adicionado em mais de um lugar
// Na verdade, vamos verificar se o initial state ja tem instagram
const stateMatches = (st.match(/instagram:\s*''/g) || []).length;
console.log('Estado inicial atualizado, vezes que instagram aparece:', stateMatches);

// Adicionar carregar instagram do businessData (linha 249 onde tem phone: businessData.phone)
st = st.replace(
  /phone:\s*businessData\.phone\s*\|\|\s*prevSettings\.phone,/,
  `phone: businessData.phone || prevSettings.phone,
          instagram: businessData.instagram || prevSettings.instagram || '',`
);
console.log('Carregamento do instagram do businessData adicionado');

// Adicionar campo de input do instagram apos o phone
// Procurar o TextInput do phone
const phoneInputPattern = /value=\{settings\.phone\}\s*onChangeText=\{[^}]+\}\s*[^}]*keyboardType="phone-pad"\s*[^}]*\/>/;
const phoneInputMatch = st.match(phoneInputPattern);
if (phoneInputMatch) {
  // Achar o fim do componente que contem esse TextInput
  const idx = st.indexOf(phoneInputMatch[0]) + phoneInputMatch[0].length;
  // Procurar o fechamento do componente pai (proximo </View> apos)
  // Vamos achar o proximo </View> a partir de idx
  const endViewIdx = st.indexOf('</View>', idx);
  if (endViewIdx > -1) {
    const insertPos = endViewIdx + '</View>'.length;
    const instagramInput = `

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Instagram</Text>
          <TextInput
            style={styles.input}
            value={settings.instagram || ''}
            onChangeText={(value) => updateSettings('instagram', value)}
            placeholder="@seu_instagram"
            autoCapitalize="none"
          />
        </View>`;
    st = st.substring(0, insertPos) + instagramInput + st.substring(insertPos);
    console.log('Input do Instagram adicionado apos phone');
  }
}

if (st !== origSt) {
  fs.writeFileSync(settingsPath, st, 'utf8');
}

// ===== 3. Adicionar botao do Instagram no BusinessDetailsScreen =====
const detailsPath = 'src/features/business/BusinessDetailsScreen.tsx';
let dt = fs.readFileSync(detailsPath, 'utf8');
const origDt = dt;

// Importar Linking se nao tiver
if (!dt.match(/import \{[^}]*Linking[^}]*\} from 'react-native'/)) {
  dt = dt.replace(
    /import \{([^}]+)\} from 'react-native';/,
    (m, imports) => {
      if (imports.includes('Linking')) return m;
      return `import {${imports}, Linking} from 'react-native';`;
    }
  );
  console.log('Linking importado no BusinessDetailsScreen');
}

// Adicionar botao do Instagram apos o telefone na secao de contato
// Procurar a secao de contato (linha 494 era contactRow com phone)
const phoneContactPattern = /(<Text style=\{styles\.contactText\}>\{business\.phone[^<]+<\/Text>\s*<\/View>)/;
const phoneContactMatch = dt.match(phoneContactPattern);
if (phoneContactMatch) {
  const insertPos = dt.indexOf(phoneContactMatch[0]) + phoneContactMatch[0].length;
  const instagramRow = `
              {business.instagram ? (
                <TouchableOpacity
                  style={styles.contactRow}
                  onPress={() => {
                    const username = (business.instagram || '').replace('@', '').trim();
                    if (!username) return;
                    const appUrl = \`instagram://user?username=\${username}\`;
                    const webUrl = \`https://instagram.com/\${username}\`;
                    Linking.canOpenURL(appUrl).then((supported) => {
                      Linking.openURL(supported ? appUrl : webUrl);
                    });
                  }}
                >
                  <Icon name="camera-alt" size={16} color={colors.text} style={styles.contactIcon} />
                  <Text style={[styles.contactText, { color: '#d31027' }]}>{business.instagram}</Text>
                </TouchableOpacity>
              ) : null}`;
  dt = dt.substring(0, insertPos) + instagramRow + dt.substring(insertPos);
  console.log('Botao do Instagram adicionado no BusinessDetailsScreen');
}

// ===== 4. Centralizar a logo sobreposta =====
const oldLogoStyle = `logoOverlayContainer: {
    position: 'absolute',
    left: 16,
    bottom: -45,
    zIndex: 10,
  },`;

const newLogoStyle = `logoOverlayContainer: {
    position: 'absolute',
    left: '50%',
    marginLeft: -49, // metade da largura (90 + 4*2 borda) = 49 para centralizar
    bottom: -45,
    zIndex: 10,
  },`;

if (dt.includes(oldLogoStyle)) {
  dt = dt.replace(oldLogoStyle, newLogoStyle);
  console.log('Logo centralizada');
}

if (dt !== origDt) {
  fs.writeFileSync(detailsPath, dt, 'utf8');
}

console.log('\nDone!');
