// Paleta de cores do aplicativo AgendMy
const colors = {  // Paleta Principal do App AGENDMY
  primary: '#3D312A',      // Cor primária do app
  background: '#FFEFEF',   // Cor de fundo principal (MUDOU PARA PRETO)
  accent: '#000000',       // Cor de destaque (preto)

  // Gradiente de fundo (bem leve: off-white quase puro até um toque sutil de vermelho claro)
  backgroundGradientStart: '#FCFCFC',   // â€œoff-white” quase puro
  backgroundGradientEnd: '#D3102720',   // â€œgelo avermelhado” muito transparente (~12% de opacidade)
  // Cores básicas e utilitárias
  text: '#333333',          // Texto escuro padrão
  lightText: '#777777',     // Texto claro para legendas, placeholders
  offWhite: '#FAFAFA',      // Off-white para textos em fundos escuros
  white: '#FFFFFF',
  black: '#000000',
  gray: '#cccccc',          // Cinza médio para elementos neutros
  lightGray: '#eeeeee',     // Para bordas, divisores, fundos de input sutis
  card: '#f5f5f5',         // Cor para cards e superfícies elevadas

  // Cores de feedback
  error: '#D32F2F',         // Vermelho para erros
  success: '#4CAF50',       // Verde para sucesso
  warning: '#FFA000',       // Laranja/Amarelo para avisos

  // Cores para o gradiente da Logo
  logoGradientStart: '#33001b',
  logoGradientEnd: '#d31027',

  transparent: 'transparent',
  // Cores Adicionais com base nas Referências Visuais
  brandRed: '#d31027', // Cor dos botões e fundos nas telas de login de referência
  placeholderText: '#999999', // Texto placeholder em inputs
  welcomeText: '#FFFFFF',
  authButtonInactiveBackground: 'rgba(255, 255, 255, 0.3)',
  authButtonInactiveText: '#FFFFFF',
};

// Estrutura compatível com sistema de temas
const Colors = {
  light: {
    text: colors.text,
    background: colors.background,
    tint: colors.primary,
    tabIconDefault: colors.lightText,
    tabIconSelected: colors.primary,
    card: colors.card,
  },
  dark: {
    text: colors.white,
    background: colors.primary,
    tint: colors.white,
    tabIconDefault: colors.lightText,
    tabIconSelected: colors.white,
    card: colors.black,
  },
};

export { colors };
export default Colors;
