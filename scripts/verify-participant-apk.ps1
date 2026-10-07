$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$apkPath = Join-Path $projectRoot 'artifacts/Trimurya-Participant.apk'
if (-not (Test-Path -LiteralPath $apkPath)) { throw 'Participant APK not found.' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead($apkPath)
try {
 $javascript = ''
 if (-not $archive.GetEntry('assets/public/images/trimurya-logo.svg')) { throw 'Corporation logo is missing from APK.' }
 foreach ($entry in $archive.Entries) {
  if ($entry.FullName.StartsWith('assets/public/assets/') -and $entry.FullName.EndsWith('.js')) {
   $reader = New-Object System.IO.StreamReader($entry.Open())
   try { $javascript += $reader.ReadToEnd() } finally { $reader.Dispose() }
  }
  if ($entry.FullName.EndsWith('/.env')) { throw 'Environment file found in APK.' }
 }
 foreach ($adminText in @('Candidate management','Operations overview','/admin/candidates','/admin/api-settings')) {
  if ($javascript.Contains($adminText)) { throw ('Admin content found in APK: ' + $adminText) }
 }
 if ($javascript.Contains('Download recording')) { throw 'Participant recording download is still present.' }
 if (-not $javascript.Contains('Submit recording')) { throw 'Recording submission is missing.' }
 if (-not $javascript.Contains('Connect your workspace')) { throw 'Participant connection setup is missing.' }
 Write-Output 'APK contents verified: participant entry only, no admin routes or environment files.'
} finally { $archive.Dispose() }
Get-FileHash -LiteralPath $apkPath -Algorithm SHA256 | Select-Object Hash,Path
