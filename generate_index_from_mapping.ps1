$mappingPath = "migration-mapping-root.json"
if (-not (Test-Path $mappingPath)) { Write-Error "Mapping file not found: $mappingPath"; exit 1 }
$json = Get-Content -Raw -Encoding UTF8 $mappingPath | ConvertFrom-Json
$out = "# Documentation Databird`r`n`r`n"
foreach ($item in $json) {
  $title = $item.folder
  $slug = $item.slug
  if (-not $slug) { continue }
  $out += " - [$title]($($slug)/)`r`n"
}
Set-Content -LiteralPath index.md -Value $out -Encoding UTF8
Get-Content index.md -TotalCount 200
