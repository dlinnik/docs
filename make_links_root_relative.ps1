$mappingPath = "migration-mapping-root.json"
if (-not (Test-Path $mappingPath)) { Write-Error "Mapping file not found: $mappingPath"; exit 1 }
$json = Get-Content -Raw -Encoding UTF8 $mappingPath | ConvertFrom-Json
$slugs = $json | ForEach-Object { $_.slug } | Where-Object { $_ }
$root = Get-Location
$indexFiles = Get-ChildItem -Path $root -Recurse -Filter index.md | Where-Object { $_.FullName -notmatch "\\.git\\" -and $_.FullName -notmatch "migration-backup" }
$modified = @()
foreach ($f in $indexFiles) {
  $text = Get-Content -Raw -Encoding UTF8 $f.FullName
  $new = $text
  foreach ($slug in $slugs) {
    $pattern = '(?<=\]\()/*' + [regex]::Escape($slug) + '/'
    $replacement = '/' + $slug + '/'
    $new = [regex]::Replace($new, $pattern, $replacement)
  }
  if ($new -ne $text) {
    Set-Content -LiteralPath $f.FullName -Value $new -Encoding UTF8
    $modified += $f.FullName
  }
}
if ($modified.Count -eq 0) { Write-Output "No files modified." } else { Write-Output "Modified files:"; $modified | ForEach-Object { Write-Output " - $_" } }
