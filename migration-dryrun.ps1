$ErrorActionPreference='Stop'
$docs = 'C:\Users\dl\Desktop\Databird\docs'
$topics = Join-Path $docs 'topics'
function Slugify([string]$s){
    $map = @{
        'а'='a';'б'='b';'в'='v';'г'='g';'д'='d';'е'='e';'ё'='e';'ж'='zh';'з'='z';'и'='i';'й'='y';'к'='k';'л'='l';'м'='m';'н'='n';'о'='o';'п'='p';'р'='r';'с'='s';'т'='t';'у'='u';'ф'='f';'х'='h';'ц'='c';'ч'='ch';'ш'='sh';'щ'='shch';'ъ'='';'ы'='y';'ь'='';'э'='e';'ю'='yu';'я'='ya'
    }
    $s = $s.ToLower()
    $out = ''
    foreach($c in $s.ToCharArray()){
        if($map.ContainsKey($c)) { $out += $map[$c] }
        elseif($c -match '[a-z0-9]') { $out += $c }
        elseif($c -match '\s') { $out += '-' }
        else { $out += '-' }
    }
    $out = $out -replace '-+','-'
    $out = $out.Trim('-')
    return $out
}
$folders = Get-ChildItem -Path $topics -Directory | Where-Object { $_.Name -ne '.' }
$mds = Get-ChildItem -Path $topics -File -Filter '*.md'
$result = @()
foreach($f in $folders){
    $name = $f.Name
    $slug = Slugify($name)
    $match = $mds | Where-Object { $_.BaseName -like ("$name*") } | Select-Object -First 1
    $mdname = if($match){ $match.Name } else { '' }
    $resources = Get-ChildItem -Path $f.FullName -File -Recurse | Where-Object { $_.Extension -ne '.md' } | ForEach-Object { $_.FullName.Substring($docs.Length+1).Replace('\\','/') }
    $obj = [PSCustomObject]@{
        folder = $name; slug = $slug; md = $mdname; folderPath = $f.FullName; resources = $resources
    }
    $result += $obj
}
$orphanMds = @()
foreach($m in $mds){ if(-not ($result | Where-Object { $_.md -eq $m.Name })){ $orphanMds += $m.Name } }
$outJson = Join-Path $docs 'migration-mapping.json'
$result | ConvertTo-Json -Depth 5 | Set-Content -Path $outJson -Encoding UTF8
$outTxt = Join-Path $docs 'migration-mapping.txt'
"Planned moves (dry-run):" | Out-File $outTxt -Encoding UTF8
foreach($r in $result){
    $line = "Folder: $($r.folder) -> slug: $($r.slug); md: $($r.md)"
    Add-Content -Path $outTxt -Value $line
}
Add-Content -Path $outTxt -Value ''
Add-Content -Path $outTxt -Value 'Orphan md files at topics root:'
foreach($o in $orphanMds){ Add-Content -Path $outTxt -Value $o }
Write-Output "Wrote mapping to $outJson and $outTxt"
