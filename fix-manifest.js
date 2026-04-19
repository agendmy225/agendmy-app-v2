const fs = require('fs');

const manifestPath = 'android/app/src/main/AndroidManifest.xml';
let c = fs.readFileSync(manifestPath, 'utf8');
const original = c;

// Remover o service RNFirebaseMessagingService que não existe mais no Firebase v22
const serviceBlock = `      <!-- Configuracao do Firebase Messaging -->
      <service
          android:name="io.invertase.firebase.messaging.RNFirebaseMessagingService"
          android:exported="false">
          <intent-filter>
              <action android:name="com.google.firebase.MESSAGING_EVENT" />
          </intent-filter>
      </service>
      `;

if (c.includes(serviceBlock)) {
  c = c.replace(serviceBlock, '      <!-- Firebase Messaging configurado automaticamente pelo SDK v22 -->\n      ');
  console.log('Service obsoleto removido!');
}

// Variante alternativa por segurança
const altServiceBlock = `<service
          android:name="io.invertase.firebase.messaging.RNFirebaseMessagingService"
          android:exported="false">
          <intent-filter>
              <action android:name="com.google.firebase.MESSAGING_EVENT" />
          </intent-filter>
      </service>`;

if (c.includes(altServiceBlock)) {
  c = c.replace(altServiceBlock, '<!-- Firebase Messaging configurado automaticamente -->');
  console.log('Service removido (variante 2)');
}

if (c !== original) {
  fs.writeFileSync(manifestPath, c, 'utf8');
  console.log('AndroidManifest.xml salvo!');
} else {
  console.log('Nenhuma alteracao');
}
