$branch='migration/docs-move-20260129'
Write-Output "Creating branch $branch"
git checkout -b $branch
$status = git status --porcelain
if ($status) {
  git add -A
  git commit -m "chore: backup before docs migration ($branch)"
} else {
  Write-Output "No changes to commit"
}
