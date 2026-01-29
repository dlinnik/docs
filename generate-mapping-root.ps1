$ErrorActionPreference='Stop'
$docs = 'C:\Users\dl\Desktop\Databird\docs'
function Slugify([string]$s){
    $map = @{}
    $map[[char]0x0430] = 'a'; $map[[char]0x0431] = 'b'; $map[[char]0x0432] = 'v'; $map[[char]0x0433] = 'g'; $map[[char]0x0434] = 'd';
    $map[[char]0x0435] = 'e'; $map[[char]0x0451] = 'e'; $map[[char]0x0436] = 'zh'; $map[[char]0x0437] = 'z'; $map[[char]0x0438] = 'i';
    $map[[char]0x0439] = 'y'; $map[[char]0x043A] = 'k'; $map[[char]0x043B] = 'l'; $map[[char]0x043C] = 'm'; $map[[char]0x043D] = 'n';
    $map[[char]0x043E] = 'o'; $map[[char]0x043F] = 'p'; $map[[char]0x0440] = 'r'; $map[[char]0x0441] = 's'; $map[[char]0x0442] = 't';
    $map[[char]0x0443] = 'u'; $map[[char]0x0444] = 'f'; $map[[char]0x0445] = 'h'; $map[[char]0x0446] = 'c'; $map[[char]0x0447] = 'ch';
    $map[[char]0x0448] = 'sh'; $map[[char]0x0449] = 'shch'; $map[[char]0x044A] = ''; $map[[char]0x044B] = 'y'; $map[[char]0x044C] = '';
    $map[[char]0x044D] = 'e'; $map[[char]0x044E] = 'yu'; $map[[char]0x044F] = 'ya'
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

$dirs = Get-ChildItem -Path $docs -Directory | Where-Object { $_.Name -ne '.git' -and $_.Name -ne 'notion' }
$mds = Get-ChildItem -Path $docs -File -Filter '*.md'
$result = @()
foreach($d in $dirs){
    $name = $d.Name
    $slug = Slugify($name)
    $match = $mds | Where-Object { $_.BaseName -like ("$name*") } | Select-Object -First 1
    $mdname = if($match){ $match.Name } else { '' }
    $resources = Get-ChildItem -Path $d.FullName -File -Recurse -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName.Substring($docs.Length+1).Replace('\\','/') }
    $result += [PSCustomObject]@{ folder = $name; slug = $slug; md = $mdname; folderPath = $d.FullName; resources = $resources }
}
$outJson = Join-Path $docs 'migration-mapping-root.json'
$result | ConvertTo-Json -Depth 5 | Set-Content -Path $outJson -Encoding UTF8
$outTxt = Join-Path $docs 'migration-mapping-root.txt'
"Planned moves (dry-run):" | Out-File $outTxt -Encoding UTF8
foreach($r in $result){
    $line = "Folder: $($r.folder) -> slug: $($r.slug); md: $($r.md)"
    Add-Content -Path $outTxt -Value $line
}
Write-Output "Wrote mapping to $outJson and $outTxt"
