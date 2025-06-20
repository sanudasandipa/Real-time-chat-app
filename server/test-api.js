#!/bin/bash

BASE_URL="http://localhost:5000"

echo "🧪 Chatter API Testing Suite"
echo "================================"

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    local auth_token=$5
    
    echo ""
    echo "📋 Testing: $description"
    echo "🔗 $method $endpoint"
    
    if [ -n "$auth_token" ]; then
        AUTH_HEADER="-H \"Authorization: Bearer $auth_token\""
    else
        AUTH_HEADER=""
    fi
    
    if [ -n "$data" ]; then
        curl -s -w "\n📊 Status: %{http_code} | Time: %{time_total}s\n" \
             -X $method \
             -H "Content-Type: application/json" \
             $AUTH_HEADER \
             -d "$data" \
             "$BASE_URL$endpoint" | head -10
    else
        curl -s -w "\n📊 Status: %{http_code} | Time: %{time_total}s\n" \
             -X $method \
             $AUTH_HEADER \
             "$BASE_URL$endpoint" | head -10
    fi
}

# Test 1: Health Check
test_endpoint "GET" "/health" "" "Health Check"

# Test 2: API Documentation
test_endpoint "GET" "/api" "" "API Documentation"

# Test 3: User Registration
echo ""
echo "🔐 Testing Authentication Endpoints"
test_endpoint "POST" "/api/auth/register" '{
    "username": "testuser1",
    "email": "testuser1@example.com",
    "password": "Password123"
}' "User Registration"

echo ""
echo "================================"
echo "✅ Basic API testing completed"
