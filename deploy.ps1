# Otomatik Deploy Script'i
# Bu script Git push sonrası çalıştırılabilir

Write-Host "🚀 Deploy başlatılıyor..." -ForegroundColor Green

# Eski container'ları temizle
Write-Host "🧹 Eski container'ları temizliyorum..." -ForegroundColor Yellow
docker-compose down --volumes --remove-orphans

# Yeni build ile ayağa kaldır
Write-Host "📦 Yeni versiyonu build ediyorum..." -ForegroundColor Yellow
docker-compose up --build -d

# Sağlık kontrolü
Write-Host "🔍 Uygulamanın başlamasını bekliyorum..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Test et
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8081" -Method Get -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Deploy başarılı! Uygulama http://localhost:8081 adresinde çalışıyor." -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Uygulama henüz hazır değil veya hata var." -ForegroundColor Red
}

Write-Host "🎉 Deploy tamamlandı!" -ForegroundColor Green