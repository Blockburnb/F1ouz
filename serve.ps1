Param(
  [int]$Port = 8000,
  [string]$Root = (Split-Path -Parent $MyInvocation.MyCommand.Definition)
)

Write-Host "Starting lightweight PowerShell static server..."
Write-Host "Root: $Root"
$prefix = "http://localhost:$Port/"

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
try{
  $listener.Start()
} catch {
  Write-Error "Failed to start HttpListener on $prefix - try a different port or run with elevated rights. $_"
  exit 1
}

Write-Host "Serving -> $prefix (Press Ctrl+C to stop)"

# open dashboard in default browser automatically
try{
  $url = "http://localhost:$Port/tp9_dashboard/dashboard.html"
  Start-Process $url | Out-Null
} catch {
  # ignore failures to auto-open
}

# Ctrl+C will interrupt blocking GetContext() and exit the loop; explicit handler removed for compatibility

# common mime map
$mimes = @{
  '.html'='text/html; charset=utf-8'; '.htm'='text/html; charset=utf-8'; '.js'='application/javascript; charset=utf-8';
  '.css'='text/css; charset=utf-8'; '.json'='application/json; charset=utf-8'; '.png'='image/png'; '.jpg'='image/jpeg';
  '.jpeg'='image/jpeg'; '.svg'='image/svg+xml'; '.gif'='image/gif'; '.csv'='text/csv; charset=utf-8'; '.webp'='image/webp';
  '.woff'='font/woff'; '.woff2'='font/woff2'; '.ttf'='font/ttf'; '.map'='application/octet-stream'; '.ico'='image/x-icon'
}

while ($listener.IsListening) {
  try{
    $context = $listener.GetContext()
  } catch {
    break
  }
  try{
    $req = $context.Request
    $res = $context.Response

    $rawPath = $req.Url.AbsolutePath
    $decoded = [System.Uri]::UnescapeDataString($rawPath).TrimStart('/')
    # prevent directory traversal
    if ($decoded -like '*..*') { $res.StatusCode = 400; $res.Close(); continue }

    if ([string]::IsNullOrEmpty($decoded)) { $decoded = 'tp9_dashboard/dashboard.html' }
    $localPath = Join-Path $Root ($decoded -replace '/','\\')

    if (Test-Path $localPath -PathType Container) {
      # try index.html or dashboard.html
      if (Test-Path (Join-Path $localPath 'index.html')) { $localPath = Join-Path $localPath 'index.html' }
      elseif (Test-Path (Join-Path $localPath 'dashboard.html')) { $localPath = Join-Path $localPath 'dashboard.html' }
      else { $res.StatusCode = 404; $res.Close(); continue }
    }

    if (-not (Test-Path $localPath -PathType Leaf)){
      $res.StatusCode = 404
      $body = [Text.Encoding]::UTF8.GetBytes('404 Not Found')
      $res.ContentType = 'text/plain; charset=utf-8'
      $res.ContentLength64 = $body.Length
      $res.OutputStream.Write($body,0,$body.Length)
      $res.Close()
      continue
    }

    $ext = [IO.Path]::GetExtension($localPath).ToLowerInvariant()
    if ($mimes.ContainsKey($ext)) { $contentType = $mimes[$ext] } else { $contentType = 'application/octet-stream' }

    # caching headers
    $res.Headers.Add('Cache-Control','public, max-age=3600')
    $res.Headers.Add('Vary','Accept-Encoding')

    $acceptEnc = $req.Headers['Accept-Encoding']
    $useGzip = $false
    if ($acceptEnc -and $acceptEnc -match 'gzip') { $useGzip = $true }

    $fs = [IO.File]::OpenRead($localPath)
    try{
      if ($useGzip) {
        $res.Headers.Add('Content-Encoding','gzip')
        $res.ContentType = $contentType
        # stream compressed response
        $gzip = New-Object System.IO.Compression.GZipStream($res.OutputStream, [IO.Compression.CompressionMode]::Compress, $true)
        $buffer = New-Object byte[] 81920
        while (($read = $fs.Read($buffer,0,$buffer.Length)) -gt 0) {
          $gzip.Write($buffer,0,$read)
        }
        $gzip.Flush()
        $gzip.Dispose()
        $res.OutputStream.Close()
      } else {
        $res.ContentType = $contentType
        $res.ContentLength64 = $fs.Length
        $buffer = New-Object byte[] 81920
        while (($read = $fs.Read($buffer,0,$buffer.Length)) -gt 0) {
          $res.OutputStream.Write($buffer,0,$read)
        }
        $res.OutputStream.Flush()
        $res.OutputStream.Close()
      }
    } finally {
      $fs.Close()
    }
  } catch {
    try{ $context.Response.StatusCode = 500; $context.Response.Close() } catch {}
  }
}

Write-Host "Server stopped." 

# end
