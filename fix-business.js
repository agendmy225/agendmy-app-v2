const fs = require('fs');

let c = fs.readFileSync('src/features/business/BusinessDetailsScreen.tsx', 'utf8');

const fixes = [
  // Portuguese characters
  ['\u00c3\u00a3', 'ã'],
  ['\u00c3\u00a7', 'ç'],
  ['\u00c3\u00a1', 'á'],
  ['\u00c3\u00a9', 'é'],
  ['\u00c3\u00aa', 'ê'],
  ['\u00c3\u00b3', 'ó'],
  ['\u00c3\u00ba', 'ú'],
  ['\u00c3\u00ad', 'í'],
  ['\u00c3\u00b5', 'õ'],
  ['\u00c3\u00b4', 'ô'],
  ['\u00c3\u00a2', 'â'],
  ['\u00c3\u0089', 'É'],
  ['\u00c3\u0093', 'Ó'],
  ['\u00c3\u0094', 'Ô'],
  ['\u00c3\u0095', 'Õ'],
  ['\u00c3\u0087', 'Ç'],
  ['\u00c3\u0081', 'Á'],
  ['\u00c3\u008d', 'Í'],
  // Specific broken strings in this file
  ['J\u00c3\u00a1', 'Já'],
  ['inv\u00c3\u00aas', 'invés'],
  ['For\u00c3\u00a7a', 'Força'],
  ['n\u00c3\u00bamero', 'número'],
  ['j\u00c3\u00a1', 'já'],
  ['est\u00c3\u00a1', 'está'],
  ['inclu\u00c3\u00addo', 'incluído'],
  ['endere\u00c3\u00a7o', 'endereço'],
  ['n\u00c3\u00a3o', 'não'],
  ['duplicar', 'duplicar'],
  ['usu\u00c3\u00a1rio', 'usuário'],
  ['condi\u00c3\u00a7\u00c3\u00a3o', 'condição'],
  ['autentica\u00c3\u00a7\u00c3\u00a3o', 'autenticação'],
  ['neg\u00c3\u00b3cio', 'negócio'],
  ['avalia\u00c3\u00a7\u00c3\u00b5es', 'avaliações'],
  ['pr\u00c3\u00b3ximos', 'próximos'],
  ['dispon\u00c3\u00adveis', 'disponíveis'],
  ['bloquear', 'bloquear'],
  ['localiza\u00c3\u00a7\u00c3\u00a3o', 'localização'],
  ['cole\u00c3\u00a7\u00c3\u00a3o', 'coleção'],
  ['gerenci', 'gerenci'],
  ['poss\u00c3\u00advel', 'possível'],
  ['depend\u00c3\u00aancias', 'dependências'],
  ['necess\u00c3\u00a1rios', 'necessários'],
  ['ser\u00c3\u00a1', 'será'],
  ['servi\u00c3\u00a7o', 'serviço'],
  ['sele\u00c3\u00a7\u00c3\u00a3o', 'seleção'],
  ['m\u00c3\u00baltiplos', 'múltiplos'],
  ['escolher', 'escolher'],
  ['Servi\u00c3\u00a7o', 'Serviço'],
  ['propriet\u00c3\u00a1rio', 'proprietário'],
  ['iniciar', 'iniciar'],
  ['Indispon\u00c3\u00advel', 'Indisponível'],
  ['Data n\u00c3\u00a3o', 'Data não'],
  ['dispon\u00c3\u00advel', 'disponível'],
  ['avalia\u00c3\u00a7\u00c3\u00a3o', 'avaliação'],
  ['bot\u00c3\u00b5es', 'botões'],
  ['informa\u00c3\u00a7\u00c3\u00b5es', 'informações'],
  ['Nome n\u00c3\u00a3o', 'Nome não'],
  ['avalia\u00c3\u00a7\u00c3\u00b5es', 'avaliações'],
  ['Endere\u00c3\u00a7o', 'Endereço'],
  ['L\u00c3\u00b3gica', 'Lógica'],
  ['hor\u00c3\u00a1rio', 'horário'],
  ['Se\u00c3\u00a7\u00c3\u00a3o', 'Seção'],
  ['Contatos', 'Contatos'],
  ['Phone n\u00c3\u00a3o', 'Phone não'],
  ['Bot\u00c3\u00a3o', 'Botão'],
  ['Servi\u00c3\u00a7os', 'Serviços'],
  ['encontrado', 'encontrado'],
  ['Avalia\u00c3\u00a7\u00c3\u00b5es', 'Avaliações'],
  ['geral', 'geral'],
  ['necess\u00c3\u00a1rio', 'necessário'],
  ['estabelecimento', 'estabelecimento'],
  ['h\u00c3\u00a1', 'há'],
  ['Localiza\u00c3\u00a7\u00c3\u00a3o', 'Localização'],
  ['mapa', 'mapa'],
  ['Localizando endere\u00c3\u00a7o', 'Localizando endereço'],
  ['informado', 'informado'],
  ['reserva', 'reserva'],
  ['portf\u00c3\u00b3lio', 'portfólio'],
  ['S\u00c3\u00b3', 'Só'],
  ['realiza\u00c3\u00a7\u00c3\u00a3o', 'realização'],
  // Emojis
  ['\u00e2\u00ad\u0090', '⭐'],
  ['\u00e2\u0098\u0085', '★'],
  ['\u00c3\u00b0\u00c5\u00b8\u00e2\u0080\u0099\u00c2\u00b0', '💰'],
  ['\u00c3\u00b0\u00c5\u00b8\u00e2\u0080\u0099\u00c2\u00b7\u00c2\u00b8', '🏷️'],
];

for (const [bad, good] of fixes) {
  while (c.includes(bad)) {
    c = c.split(bad).join(good);
  }
}

// Fix the star/rating icon - ԡÉ pattern
c = c.replace(/ԡÉ/g, '⭐');
// Fix duration icon
c = c.replace(/ÔÅ▒´©Å/g, '⏱️');
// Fix broken text patterns
c = c.replace(/├[íi]/g, 'í');
c = c.replace(/├[áa]/g, 'á');
c = c.replace(/├[éé]/g, 'é');
c = c.replace(/├[úu]/g, 'ú');
c = c.replace(/├[óo]/g, 'ó');
c = c.replace(/├[êe]/g, 'ê');
c = c.replace(/├[ôo]/g, 'ô');
c = c.replace(/├[õo]/g, 'õ');
c = c.replace(/├[ãa]/g, 'ã');
c = c.replace(/├[çc]/g, 'ç');
c = c.replace(/├[âa]/g, 'â');
c = c.replace(/├[àa]/g, 'à');
c = c.replace(/├Á/g, 'ã');
c = c.replace(/├º/g, 'ú');
c = c.replace(/├│/g, 'ó');
c = c.replace(/├®/g, 'é');
c = c.replace(/├¡/g, 'í');
c = c.replace(/├ú/g, 'ú');
c = c.replace(/├ñ/g, 'ñ');
c = c.replace(/Ã£/g, 'ã');
c = c.replace(/Ã§/g, 'ç');
c = c.replace(/Ã¡/g, 'á');
c = c.replace(/Ã©/g, 'é');
c = c.replace(/Ãª/g, 'ê');
c = c.replace(/Ã³/g, 'ó');
c = c.replace(/Ãº/g, 'ú');
c = c.replace(/Ã­/g, 'í');
c = c.replace(/Ã´/g, 'ô');
c = c.replace(/Ãµ/g, 'õ');
c = c.replace(/Indispon├¡vel/g, 'Indisponível');
c = c.replace(/dispon├¡vel/g, 'disponível');
c = c.replace(/poss├¡vel/g, 'possível');
c = c.replace(/n├úo/g, 'não');
c = c.replace(/N├úo/g, 'Não');
c = c.replace(/├ºo/g, 'ão');
c = c.replace(/├Áes/g, 'ões');
c = c.replace(/├Á/g, 'ã');
c = c.replace(/j├í/g, 'já');
c = c.replace(/J├í/g, 'Já');
c = c.replace(/est├í/g, 'está');
c = c.replace(/├¡do/g, 'ído');
c = c.replace(/endere├ºo/g, 'endereço');
c = c.replace(/Endere├ºo/g, 'Endereço');
c = c.replace(/servi├ºo/g, 'serviço');
c = c.replace(/Servi├ºo/g, 'Serviço');
c = c.replace(/servi├ºos/g, 'serviços');
c = c.replace(/Servi├ºos/g, 'Serviços');
c = c.replace(/avalia├º├úo/g, 'avaliação');
c = c.replace(/Avalia├º├úo/g, 'Avaliação');
c = c.replace(/avalia├º├Áes/g, 'avaliações');
c = c.replace(/Avalia├º├Áes/g, 'Avaliações');
c = c.replace(/localiza├º├úo/g, 'localização');
c = c.replace(/Localiza├º├úo/g, 'Localização');
c = c.replace(/sele├º├úo/g, 'seleção');
c = c.replace(/condi├º├úo/g, 'condição');
c = c.replace(/cole├º├úo/g, 'coleção');
c = c.replace(/autentica├º├úo/g, 'autenticação');
c = c.replace(/se├º├úo/g, 'seção');
c = c.replace(/Se├º├úo/g, 'Seção');
c = c.replace(/informa├º├Áes/g, 'informações');
c = c.replace(/bot├Áes/g, 'botões');
c = c.replace(/Bot├Áes/g, 'Botões');
c = c.replace(/Bot├úo/g, 'Botão');
c = c.replace(/bot├úo/g, 'botão');
c = c.replace(/For├ºa/g, 'Força');
c = c.replace(/for├ºa/g, 'força');
c = c.replace(/usu├írio/g, 'usuário');
c = c.replace(/Usu├írio/g, 'Usuário');
c = c.replace(/n├║mero/g, 'número');
c = c.replace(/N├║mero/g, 'Número');
c = c.replace(/neg├│cio/g, 'negócio');
c = c.replace(/Neg├│cio/g, 'Negócio');
c = c.replace(/propriet├írio/g, 'proprietário');
c = c.replace(/Propriet├írio/g, 'Proprietário');
c = c.replace(/pr├│ximos/g, 'próximos');
c = c.replace(/portf├│lio/g, 'portfólio');
c = c.replace(/hor├írio/g, 'horário');
c = c.replace(/necess├írio/g, 'necessário');
c = c.replace(/necess├írios/g, 'necessários');
c = c.replace(/S├│/g, 'Só');
c = c.replace(/s├│/g, 'só');
c = c.replace(/dispon├¡veis/g, 'disponíveis');
c = c.replace(/Indispon├¡vel/g, 'Indisponível');
c = c.replace(/poss├¡vel/g, 'possível');
c = c.replace(/inclu├¡do/g, 'incluído');
c = c.replace(/depend├¬ncias/g, 'dependências');
c = c.replace(/├ís/g, 'às');
c = c.replace(/L├│gica/g, 'Lógica');
c = c.replace(/h├í/g, 'há');
c = c.replace(/inv├®s/g, 'invés');
c = c.replace(/ser├í/g, 'será');
c = c.replace(/realiza├º├úo/g, 'realização');
c = c.replace(/m├║ltiplos/g, 'múltiplos');
c = c.replace(/ÔÅ▒´©Å /g, '⏱️ ');

fs.writeFileSync('src/features/business/BusinessDetailsScreen.tsx', c, 'utf8');
console.log('Done!');
