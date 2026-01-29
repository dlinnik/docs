$p = Get-Content -Raw migration-mapping-root.json | ConvertFrom-Json
$out = "# Документация Databird`r`n`r`n"
foreach ($s in $p) {
    $out += " - [$($s.folder)]($($s.slug)/)`r`n"
}
Set-Content -LiteralPath index.md -Value $out -Encoding UTF8
Write-Host "Wrote index.md (entries: $($p.Count))"