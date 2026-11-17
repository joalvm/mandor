curl -X GET "$BASE_URL/v2/me" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json" \
  -u "admin:$ADMIN_PASSWORD" \
  -m 10 -k
