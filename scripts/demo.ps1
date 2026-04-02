$ErrorActionPreference = "Stop"

$baseUrl = "http://localhost:4000"
$email = "admin@zorvyn.com"
$password = "StrongPass123!"

Write-Host "Logging in..."
$loginBody = @{ email = $email; password = $password } | ConvertTo-Json
$token = (Invoke-RestMethod -Method Post -Uri "$baseUrl/auth/login" -ContentType "application/json" -Body $loginBody).token
$headers = @{ Authorization = "Bearer $token" }

Write-Host "Creating sample records..."
$record1 = @{ amount = 2500; type = "income"; category = "salary"; date = "2026-04-02"; description = "Monthly salary" } | ConvertTo-Json
$record2 = @{ amount = 800; type = "expense"; category = "rent"; date = "2026-04-02"; description = "House rent" } | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "$baseUrl/records" -Headers $headers -ContentType "application/json" -Body $record1 | Out-Null
Invoke-RestMethod -Method Post -Uri "$baseUrl/records" -Headers $headers -ContentType "application/json" -Body $record2 | Out-Null

Write-Host "Fetching summaries..."
Invoke-RestMethod -Method Get -Uri "$baseUrl/summary/total" -Headers $headers
Invoke-RestMethod -Method Get -Uri "$baseUrl/summary/category" -Headers $headers
Invoke-RestMethod -Method Get -Uri "$baseUrl/summary/recent?limit=5" -Headers $headers
Invoke-RestMethod -Method Get -Uri "$baseUrl/summary/trends?interval=monthly" -Headers $headers

Write-Host "Done. Open docs at $baseUrl/docs"
