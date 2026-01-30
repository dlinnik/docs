$mappingPath = "migration-mapping-root.json"
if (-not (Test-Path $mappingPath)) { Write-Error "Mapping file not found: $mappingPath"; exit 1 }
$json = Get-Content -Raw -Encoding UTF8 $mappingPath | ConvertFrom-Json
# Build lookup by md filename and by folder (exact)
$mdToSlug = @{}
$folderToSlug = @{}
foreach ($item in $json) {
  if ($item.md) { $mdToSlug[$item.md] = $item.slug }
  if ($item.folder) { $folderToSlug[$item.folder] = $item.slug }
}
# Find all index.md files under immediate child directories
$root = Get-Location
$indexFiles = Get-ChildItem -Path $root -Recurse -Filter index.md | Where-Object { $_.FullName -notmatch "\\.git\\" -and $_.FullName -notmatch "migration-backup" }
$modified = @()
$regex = '\[([^\]]+)\]\(([^)]+\.md)\)'
foreach ($f in $indexFiles) {
  $text = Get-Content -Raw -Encoding UTF8 $f.FullName
  $new = [regex]::Replace($text, $regex, {
    param($m)
    $linkText = $m.Groups[1].Value
    $url = $m.Groups[2].Value
    $decoded = $url
    try { $decoded = [System.Uri]::UnescapeDataString($url) } catch { }
    $matched = $null
    # Try match by md filename present in decoded
    foreach ($md in $mdToSlug.Keys) {
      if ($decoded -like "*$md*") { $matched = $mdToSlug[$md]; break }
    }
    if (-not $matched) {
      # Try match by folder name
      foreach ($fold in $folderToSlug.Keys) {
        if ($decoded -like "*$fold*") { $matched = $folderToSlug[$fold]; break }
      }
    }
    if ($matched) { return "[$linkText]($($matched)/)" }
    return $m.Value
  })
  if ($new -ne $text) {
    Set-Content -LiteralPath $f.FullName -Value $new -Encoding UTF8
    $modified += $f.FullName
  }
}
if ($modified.Count -eq 0) { Write-Output "No files modified." } else { Write-Output "Modified files:"; $modified | ForEach-Object { Write-Output " - $_" } }
