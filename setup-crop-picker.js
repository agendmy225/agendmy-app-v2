const fs = require('fs');

// ===== 1. AndroidManifest.xml =====
const manifestPath = 'android/app/src/main/AndroidManifest.xml';
let manifest = fs.readFileSync(manifestPath, 'utf8');
const origManifest = manifest;

// Adicionar permissões se não existirem
const permissions = [
  '<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />',
  '<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />',
  '<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />',
  '<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />',
  '<uses-permission android:name="android.permission.CAMERA" />',
];

for (const perm of permissions) {
  const attr = perm.match(/android:name="([^"]+)"/)[1];
  if (!manifest.includes(attr)) {
    manifest = manifest.replace(
      '<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>',
      `${perm}\n    <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>`
    );
  }
}

// Adicionar activity do crop picker dentro de <application>
if (!manifest.includes('com.yalantis.ucrop.UCropActivity')) {
  manifest = manifest.replace(
    '</application>',
    `      <activity
        android:name="com.yalantis.ucrop.UCropActivity"
        android:screenOrientation="portrait"
        android:theme="@style/Theme.AppCompat.Light.NoActionBar"/>
    </application>`
  );
}

if (manifest !== origManifest) {
  fs.writeFileSync(manifestPath, manifest, 'utf8');
  console.log('AndroidManifest.xml atualizado');
}

// ===== 2. android/build.gradle =====
const gradlePath = 'android/build.gradle';
let gradle = fs.readFileSync(gradlePath, 'utf8');
const origGradle = gradle;

// Garantir minSdkVersion >= 21 (requisito do crop picker)
if (gradle.match(/minSdkVersion\s*=?\s*(\d+)/)) {
  const match = gradle.match(/minSdkVersion\s*=?\s*(\d+)/);
  const current = parseInt(match[1]);
  if (current < 21) {
    gradle = gradle.replace(
      /minSdkVersion\s*=?\s*\d+/,
      'minSdkVersion = 21'
    );
    console.log(`android/build.gradle: minSdkVersion atualizado de ${current} para 21`);
  } else {
    console.log(`android/build.gradle: minSdkVersion = ${current} (OK, >= 21)`);
  }
}

if (gradle !== origGradle) {
  fs.writeFileSync(gradlePath, gradle, 'utf8');
}

// ===== 3. android/app/build.gradle =====
const appGradlePath = 'android/app/build.gradle';
let appGradle = fs.readFileSync(appGradlePath, 'utf8');
const origAppGradle = appGradle;

// Adicionar pickerLibrary config no defaultConfig se não existir
if (!appGradle.includes('pickerLibrary')) {
  // Nao eh obrigatorio, o react-native-image-crop-picker resolve sozinho
  console.log('app/build.gradle: pickerLibrary nao configurado (nao eh necessario)');
}

console.log('Setup do crop picker concluido!');
