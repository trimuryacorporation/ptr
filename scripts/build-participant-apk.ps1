$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$buildToolsRoot = Join-Path $projectRoot '.android-tools'
$jdkFolder = Get-ChildItem (Join-Path $buildToolsRoot 'jdk') -Directory | Select-Object -First 1
if (-not $jdkFolder) { throw 'Install JDK 21 or place it in .android-tools/jdk.' }
$env:JAVA_HOME = $jdkFolder.FullName
$env:ANDROID_HOME = Join-Path $buildToolsRoot 'sdk'
$env:GRADLE_USER_HOME = Join-Path $buildToolsRoot 'gradle'
$env:PATH = 'C:\Program Files\nodejs;' + $env:JAVA_HOME + '\bin;' + $env:PATH
Push-Location (Join-Path $projectRoot 'frontend')
try {
 & npm.cmd run build:participant
 if ($LASTEXITCODE -ne 0) { throw 'Participant frontend build failed.' }
 & node.exe '..\node_modules\@capacitor\cli\bin\capacitor' sync android
 if ($LASTEXITCODE -ne 0) { throw 'Android sync failed.' }
 & '.\android\gradlew.bat' --project-dir android --no-daemon --max-workers=2 --console=plain assembleDebug
 if ($LASTEXITCODE -ne 0) { throw 'APK build failed.' }
 $artifactFolder = Join-Path $projectRoot 'artifacts'
 New-Item -ItemType Directory -Force -Path $artifactFolder | Out-Null
 Copy-Item -LiteralPath '.\android\app\build\outputs\apk\debug\app-debug.apk' -Destination (Join-Path $artifactFolder 'Trimurya-Participant.apk')
 Write-Output (Join-Path $artifactFolder 'Trimurya-Participant.apk')
} finally { Pop-Location }
