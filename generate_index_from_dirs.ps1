$exclude = @('.git','migration-backup-20260129_231737','migration-report-20260129_231737.txt','migration-mapping-root.json','migration-mapping-root.txt')
$dirs = Get-ChildItem -Directory | Where-Object { $exclude -notcontains $_.Name } | Sort-Object Name
$out = "# Documentation Databird`r`n`r`n"
foreach ($d in $dirs) {
  $out += " - [$($d.Name)]($($d.Name)/)`r`n"
}
Set-Content -LiteralPath index.md -Value $out -Encoding UTF8
Get-Content index.md -TotalCount 200
