Get-ChildItem -Path "src" -Recurse -Include "*.tsx","*.ts" | ForEach-Object {
    $path = $_.FullName
    $bytes = [System.IO.File]::ReadAllBytes($path)
    $content = [System.Text.Encoding]::GetEncoding("Windows-1252").GetString($bytes)
    [System.IO.File]::WriteAllText($path, $content, [System.Text.UTF8Encoding]::new($false))
    Write-Host "OK: $path"
}
