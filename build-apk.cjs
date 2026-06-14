const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// 1. Identify Android build.gradle path
const gradlePath = path.join(__dirname, 'android', 'app', 'build.gradle');

if (!fs.existsSync(gradlePath)) {
    console.error('❌ Error: build.gradle not found at:', gradlePath);
    process.exit(1);
}

// Global variable to store the version name for Step 5
let finalVersionName = '1.0';

// ----------------------------------------------------------------------
// ☕ SMART JAVA_HOME DETECTION FOR WINDOWS
// ----------------------------------------------------------------------
const isWindows = process.platform === 'win32';
if (isWindows) {
    const androidStudioJdkPath = 'C:\\Program Files\\Android\\Android Studio\\jbr';
    if (fs.existsSync(androidStudioJdkPath)) {
        // Force the script's child process to use Android Studio's modern JDK 17/21
        process.env.JAVA_HOME = androidStudioJdkPath;
        console.log(`☕ Java detected: Using Android Studio JDK at: ${androidStudioJdkPath}`);
    } else {
        console.log('⚠️ Warning: Android Studio JBR path not found. Falling back to system default Java.');
    }
}
// ----------------------------------------------------------------------

console.log('\n🔄 Step 1: Automatically updating Android version...');
let gradleContent = fs.readFileSync(gradlePath, 'utf8');

// Regex to find and increment versionCode by 1
const versionCodeRegex = /(versionCode\s*=?\s*)(\d+)/;
const codeMatch = gradleContent.match(versionCodeRegex);
let newCode = 1;

if (codeMatch) {
    const currentCode = parseInt(codeMatch[2], 10);
    newCode = currentCode + 1;
    gradleContent = gradleContent.replace(versionCodeRegex, `$1${newCode}`);
    console.log(`   ✅ Updated versionCode: ${currentCode} ➡️ ${newCode}`);
} else {
    console.log('   ⚠️ Warning: versionCode not found in build.gradle.');
}

// Regex to find and increment versionName (e.g., "5.62" to "5.63")
const versionNameRegex = /(versionName\s*=?\s*")([^"]+)(")/;
const nameMatch = gradleContent.match(versionNameRegex);

if (nameMatch) {
    const currentName = nameMatch[2];
    finalVersionName = currentName; // Fallback if left unchanged
    const parts = currentName.split('.');
    
    if (parts.length === 2 && !isNaN(parts[1])) {
        parts[1] = parseInt(parts[1], 10) + 1;
        const newName = parts.join('.');
        finalVersionName = newName; // Capture updated version
        gradleContent = gradleContent.replace(versionNameRegex, `$1${newName}$3`);
        console.log(`   ✅ Updated versionName: "${currentName}" ➡️ "${newName}"`);
    } else if (parts.length === 3 && !isNaN(parts[2])) {
        parts[2] = parseInt(parts[2], 10) + 1;
        const newName = parts.join('.');
        finalVersionName = newName; // Capture updated version
        gradleContent = gradleContent.replace(versionNameRegex, `$1${newName}$3`);
        console.log(`   ✅ Updated versionName: "${currentName}" ➡️ "${newName}"`);
    } else {
        console.log(`   ℹ️ Current version "${currentName}" left unchanged.`);
    }
}

// Save changes to build.gradle
fs.writeFileSync(gradlePath, gradleContent, 'utf8');

// 2. Build React (Vite) offline assets
console.log('\n📦 Step 2: Building React (Vite) offline assets...');
execSync('npm run build', { stdio: 'inherit' });

// 3. Sync files with Capacitor
console.log('\n🔄 Step 3: Syncing assets with Capacitor...');
execSync('npx @capacitor/cli sync', { stdio: 'inherit' });

// 4. Compile the final APK via Gradle (OFFLINE MODE ACTIVATED)
console.log('\n🤖 Step 4: Compiling the final APK via Gradle (Offline Mode)...');

const buildCommand = isWindows
    ? 'cd android && gradlew assembleDebug'
    : 'cd android && chmod +x gradlew && ./gradlew assembleDebug';

try {
    execSync(buildCommand, { stdio: 'inherit' });
    console.log('\n🎉 Build Successful!');
} catch (error) {
    console.error('\n❌ APK Build Failed. If you recently added new native dependencies, please disable the --offline flag once to download them.');
    process.exit(1);
}

// ----------------------------------------------------------------------
// 🚚 SMART STEP 5: COPY FINAL APK TO WINDOWS DESKTOP
// ----------------------------------------------------------------------
console.log('\n🚚 Step 5: Copying final APK directly to your Desktop...');

const apkSource = path.join(__dirname, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');

if (fs.existsSync(apkSource)) {
    // Detect Windows Desktop Path (handles standard and OneDrive desktop paths automatically)
    const homeDir = os.homedir();
    let desktopPath = path.join(homeDir, 'Desktop');
    
    if (!fs.existsSync(desktopPath)) {
        const oneDriveDesktop = path.join(homeDir, 'OneDrive', 'Desktop');
        if (fs.existsSync(oneDriveDesktop)) {
            desktopPath = oneDriveDesktop;
        }
    }

    // Dynamic filename based on the detected version
    const apkDest = path.join(desktopPath, `sokkarak mazboot (${finalVersionName}).apk`);

    try {
        fs.copyFileSync(apkSource, apkDest);
        console.log('\n🎉 SUCCESS! Your offline app has been built and copied to Desktop!');
        console.log('📍 File is ready for your phone at:');
        console.log(`   👉 Desktop/sokkarak mazboot (${finalVersionName}).apk`);
    } catch (copyError) {
        console.error('⚠️ Warning: Could not copy APK to Desktop automatically:', copyError.message);
        console.log('📍 You can still find your APK here:');
        console.log(`   👉 ${apkSource}`);
    }
} else {
    console.error('❌ Error: Compiled APK file not found at source path.');
}