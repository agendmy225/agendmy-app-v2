Get-ChildItem -Path "src" -Recurse -Include "*.tsx","*.ts" | ForEach-Object {
    $path = $_.FullName
    $content = Get-Content $path -Raw -Encoding Default
    [System.IO.File]::WriteAllText($path, $content, [System.Text.UTF8Encoding]::new($false))
    Write-Host "Fixed: $($_.Name)"
}
