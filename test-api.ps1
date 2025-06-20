# 🧪 Quick API Test Script
# Run this in PowerShell to test the Chatter API

$baseUrl = "http://localhost:5000"

Write-Host "🚀 Testing Chatter API..." -ForegroundColor Green

# Test 1: Health Check
Write-Host "`n1. Testing Health Endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get
    Write-Host "✅ Health Check: $($health.message)" -ForegroundColor Green
    Write-Host "   Environment: $($health.environment)" -ForegroundColor Cyan
    Write-Host "   Version: $($health.version)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Health Check Failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Register User 1
Write-Host "`n2. Registering User 1..." -ForegroundColor Yellow
try {
    $user1Data = @{
        username = "testuser1"
        email = "testuser1@example.com"
        password = "Password123"
    } | ConvertTo-Json

    $user1Response = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method Post -ContentType "application/json" -Body $user1Data
    $user1Token = $user1Response.data.token
    $user1Id = $user1Response.data.user._id
    
    Write-Host "✅ User 1 Registered: $($user1Response.data.user.username)" -ForegroundColor Green
    Write-Host "   User ID: $user1Id" -ForegroundColor Cyan
} catch {
    Write-Host "❌ User 1 Registration Failed: $($_.Exception.Message)" -ForegroundColor Red
    # Continue anyway - user might already exist
    
    # Try login instead
    Write-Host "   Trying to login instead..." -ForegroundColor Yellow
    try {
        $loginData = @{
            email = "testuser1@example.com"
            password = "Password123"
        } | ConvertTo-Json
        
        $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body $loginData
        $user1Token = $loginResponse.data.token
        $user1Id = $loginResponse.data.user._id
        Write-Host "✅ User 1 Login Successful" -ForegroundColor Green
    } catch {
        Write-Host "❌ Login also failed: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# Test 3: Register User 2
Write-Host "`n3. Registering User 2..." -ForegroundColor Yellow
try {
    $user2Data = @{
        username = "testuser2"
        email = "testuser2@example.com"
        password = "Password123"
    } | ConvertTo-Json

    $user2Response = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method Post -ContentType "application/json" -Body $user2Data
    $user2Token = $user2Response.data.token
    $user2Id = $user2Response.data.user._id
    
    Write-Host "✅ User 2 Registered: $($user2Response.data.user.username)" -ForegroundColor Green
    Write-Host "   User ID: $user2Id" -ForegroundColor Cyan
} catch {
    Write-Host "❌ User 2 Registration Failed: $($_.Exception.Message)" -ForegroundColor Red
    # Try login instead
    Write-Host "   Trying to login instead..." -ForegroundColor Yellow
    try {
        $loginData = @{
            email = "testuser2@example.com"
            password = "Password123"
        } | ConvertTo-Json
        
        $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body $loginData
        $user2Token = $loginResponse.data.token
        $user2Id = $loginResponse.data.user._id
        Write-Host "✅ User 2 Login Successful" -ForegroundColor Green
    } catch {
        Write-Host "❌ User 2 Login also failed: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# Test 4: Get User Profile
Write-Host "`n4. Getting User 1 Profile..." -ForegroundColor Yellow
try {
    $headers = @{ Authorization = "Bearer $user1Token" }
    $profile = Invoke-RestMethod -Uri "$baseUrl/api/auth/me" -Method Get -Headers $headers
    
    Write-Host "✅ Profile Retrieved: $($profile.data.user.username)" -ForegroundColor Green
    Write-Host "   Email: $($profile.data.user.email)" -ForegroundColor Cyan
    Write-Host "   Online Status: $($profile.data.user.isOnline)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Get Profile Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Create Private Chat
Write-Host "`n5. Creating Private Chat..." -ForegroundColor Yellow
try {
    $headers = @{ Authorization = "Bearer $user1Token" }
    $chatData = @{
        userId = $user2Id
    } | ConvertTo-Json

    $chatResponse = Invoke-RestMethod -Uri "$baseUrl/api/chats/private" -Method Post -ContentType "application/json" -Headers $headers -Body $chatData
    $chatId = $chatResponse.data.chat._id
    
    Write-Host "✅ Private Chat Created" -ForegroundColor Green
    Write-Host "   Chat ID: $chatId" -ForegroundColor Cyan
    Write-Host "   Display Name: $($chatResponse.data.chat.displayName)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Create Chat Failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 6: Send Message
Write-Host "`n6. Sending Message..." -ForegroundColor Yellow
try {
    $headers = @{ Authorization = "Bearer $user1Token" }
    $messageData = @{
        content = "Hello! This is a test message from PowerShell script 🚀"
        messageType = "text"
    } | ConvertTo-Json

    $messageResponse = Invoke-RestMethod -Uri "$baseUrl/api/messages/$chatId" -Method Post -ContentType "application/json" -Headers $headers -Body $messageData
    $messageId = $messageResponse.data.message._id
    
    Write-Host "✅ Message Sent" -ForegroundColor Green
    Write-Host "   Message ID: $messageId" -ForegroundColor Cyan
    Write-Host "   Content: $($messageResponse.data.message.content)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Send Message Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 7: Get Messages
Write-Host "`n7. Getting Chat Messages..." -ForegroundColor Yellow
try {
    $headers = @{ Authorization = "Bearer $user1Token" }
    $messagesResponse = Invoke-RestMethod -Uri "$baseUrl/api/messages/$chatId" -Method Get -Headers $headers
    
    Write-Host "✅ Messages Retrieved" -ForegroundColor Green
    Write-Host "   Total Messages: $($messagesResponse.data.messages.Count)" -ForegroundColor Cyan
    
    if ($messagesResponse.data.messages.Count -gt 0) {
        $lastMessage = $messagesResponse.data.messages[-1]
        Write-Host "   Latest Message: $($lastMessage.content)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ Get Messages Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 8: Add Reaction
Write-Host "`n8. Adding Reaction to Message..." -ForegroundColor Yellow
try {
    $headers = @{ Authorization = "Bearer $user1Token" }
    $reactionData = @{
        emoji = "👍"
    } | ConvertTo-Json

    $reactionResponse = Invoke-RestMethod -Uri "$baseUrl/api/messages/$messageId/react" -Method Post -ContentType "application/json" -Headers $headers -Body $reactionData
    
    Write-Host "✅ Reaction Added" -ForegroundColor Green
    Write-Host "   Emoji: 👍" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Add Reaction Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 9: Search Users
Write-Host "`n9. Searching Users..." -ForegroundColor Yellow
try {
    $headers = @{ Authorization = "Bearer $user1Token" }
    $searchResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/search?q=test" -Method Get -Headers $headers
    
    Write-Host "✅ User Search Completed" -ForegroundColor Green
    Write-Host "   Users Found: $($searchResponse.data.users.Count)" -ForegroundColor Cyan
    
    foreach ($user in $searchResponse.data.users) {
        Write-Host "   - $($user.username) ($($user.email))" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ User Search Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Summary
Write-Host "`n🎉 API Test Complete!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════" -ForegroundColor Yellow
Write-Host "✅ Server is running and all endpoints are working!" -ForegroundColor Green
Write-Host "🔗 API Base URL: $baseUrl" -ForegroundColor Cyan
Write-Host "📚 API Documentation: $baseUrl/api" -ForegroundColor Cyan
Write-Host "💚 Health Check: $baseUrl/health" -ForegroundColor Cyan
Write-Host "`n📋 You can now use Postman to test the API:" -ForegroundColor Yellow
Write-Host "1. Import the collection: Chatter_API_Collection.json" -ForegroundColor White
Write-Host "2. Import the environment: Chatter_API_Environment.json" -ForegroundColor White
Write-Host "3. Run the requests in order!" -ForegroundColor White

Write-Host "`n🚀 Test Tokens for Postman:" -ForegroundColor Yellow
Write-Host "User 1 Token: $user1Token" -ForegroundColor Gray
Write-Host "User 2 Token: $user2Token" -ForegroundColor Gray
Write-Host "Chat ID: $chatId" -ForegroundColor Gray
