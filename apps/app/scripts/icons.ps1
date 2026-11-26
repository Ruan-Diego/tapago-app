# Gera os icones do app a partir da marca (design/canvas/Marca.dc.html): "ta." em Space Grotesk,
# branco sobre tinta, com o ponto em destaque. So roda no Windows (usa o GDI+ do sistema).
#
#   powershell -ExecutionPolicy Bypass -File apps/app/scripts/icons.ps1

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$app = Split-Path -Parent $PSScriptRoot
$root = Resolve-Path (Join-Path $app '..\..')
$font = Join-Path $root 'node_modules\@expo-google-fonts\space-grotesk\700Bold\SpaceGrotesk_700Bold.ttf'
$assets = Join-Path $app 'assets'
New-Item -ItemType Directory -Force $assets | Out-Null

$fonts = New-Object System.Drawing.Text.PrivateFontCollection
$fonts.AddFontFile($font)
$family = $fonts.Families[0]
$style = [System.Drawing.FontStyle]::Bold
if (-not $family.IsStyleAvailable($style)) { $style = [System.Drawing.FontStyle]::Regular }

$ink = [System.Drawing.ColorTranslator]::FromHtml('#111111')
$white = [System.Drawing.Color]::White
$accent = [System.Drawing.ColorTranslator]::FromHtml('#D4FF3A')
# O script fica em ASCII: o PowerShell 5 le arquivos sem BOM como ANSI.
$word = 't' + [char]0x00E1

# Contornos das letras, com o espacamento apertado da marca (-0,06 em).
function New-Glyphs([string]$text, [double]$em) {
  $format = [System.Drawing.StringFormat]::GenericTypographic
  $letters = New-Object System.Drawing.Drawing2D.GraphicsPath
  $dot = New-Object System.Drawing.Drawing2D.GraphicsPath
  $bitmap = New-Object System.Drawing.Bitmap 1, 1
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $measure = New-Object System.Drawing.Font($family, [single]$em, $style, [System.Drawing.GraphicsUnit]::Pixel)
  $x = 0.0
  foreach ($char in ($text + '.').ToCharArray()) {
    $target = if ($char -eq '.') { $dot } else { $letters }
    $origin = New-Object System.Drawing.PointF([single]$x, 0)
    $target.AddString([string]$char, $family, [int]$style, [single]$em, $origin, $format)
    $width = $graphics.MeasureString([string]$char, $measure, $origin, $format).Width
    $x += $width - 0.06 * $em
  }
  $measure.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
  return @{ Letters = $letters; Dot = $dot }
}

# Desenha a marca centralizada. `circle` e o diametro do disco de tinta, quando houver.
function Save-Icon {
  param(
    [string]$name, [int]$size, [double]$em, [string]$text = $word,
    $background = $null, [double]$circle = 0, $letterColor = $white, $dotColor = $accent
  )
  $bitmap = New-Object System.Drawing.Bitmap $size, $size
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  if ($null -ne $background) { $graphics.Clear($background) }
  if ($circle -gt 0) {
    $diameter = $circle * $size
    $offset = ($size - $diameter) / 2
    $brush = New-Object System.Drawing.SolidBrush $ink
    $graphics.FillEllipse($brush, [single]$offset, [single]$offset, [single]$diameter, [single]$diameter)
    $brush.Dispose()
  }

  $glyphs = New-Glyphs $text ($em * $size)
  $all = New-Object System.Drawing.Drawing2D.GraphicsPath
  $all.AddPath($glyphs.Letters, $false)
  $all.AddPath($glyphs.Dot, $false)
  $bounds = $all.GetBounds()
  $graphics.TranslateTransform(
    [single](($size - $bounds.Width) / 2 - $bounds.X),
    [single](($size - $bounds.Height) / 2 - $bounds.Y))
  $letterBrush = New-Object System.Drawing.SolidBrush $letterColor
  $dotBrush = New-Object System.Drawing.SolidBrush $dotColor
  $graphics.FillPath($letterBrush, $glyphs.Letters)
  $graphics.FillPath($dotBrush, $glyphs.Dot)

  $file = Join-Path $assets $name
  $bitmap.Save($file, [System.Drawing.Imaging.ImageFormat]::Png)
  $letterBrush.Dispose(); $dotBrush.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
  Write-Output $file
}

# Icone quadrado: o sistema arredonda os cantos.
Save-Icon -name 'icon.png' -size 1024 -em 0.46 -background $ink
# Icone adaptativo: so o miolo (66%) aparece em qualquer mascara.
Save-Icon -name 'adaptive-icon.png' -size 1024 -em 0.34
Save-Icon -name 'monochrome-icon.png' -size 1024 -em 0.34 -dotColor $white
# Abertura: o disco de tinta cabe na mascara circular do Android 12+.
Save-Icon -name 'splash-icon.png' -size 1024 -em 0.3 -circle 0.62
# Aviso: o Android usa so a silhueta branca.
Save-Icon -name 'notification-icon.png' -size 96 -em 0.62 -dotColor $white
Save-Icon -name 'favicon.png' -size 96 -em 0.55 -background $ink
